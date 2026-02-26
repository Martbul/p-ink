package middleware

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os" 
	"strings"

	"github.com/clerk/clerk-sdk-go/v2/jwt"
)

type contextKey string

const UserIDKey contextKey = "userID"
const ClerkIDKey contextKey = "clerkID"

func ClerkAuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		
		if os.Getenv("APP_ENV") != "production" && authHeader == "Bearer TEST_TOKEN" {
			log.Println("Using Dev Bypass Token: Logged in as user_test_123")
			
			ctx := context.WithValue(r.Context(), ClerkIDKey, "user_test_123")
			
			next.ServeHTTP(w, r.WithContext(ctx))
			return
		}

		if authHeader == "" {
			respondWithError(w, http.StatusUnauthorized, "Authorization header required")
			return
		}

		token := strings.TrimPrefix(authHeader, "Bearer ")
		if token == authHeader {
			respondWithError(w, http.StatusUnauthorized, "Invalid authorization format. Use 'Bearer <token>'")
			return
		}

		claims, err := jwt.Verify(r.Context(), &jwt.VerifyParams{
			Token: token,
		})
		if err != nil {
			log.Printf("Token verification failed: %v", err)
			respondWithError(w, http.StatusUnauthorized, fmt.Sprintf("Invalid token: %v", err))
			return
		}

		ctx := context.WithValue(r.Context(), ClerkIDKey, claims.Subject)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func OptionalAuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		
		if os.Getenv("APP_ENV") != "production" && authHeader == "Bearer TEST_TOKEN" {
			ctx := context.WithValue(r.Context(), ClerkIDKey, "user_test_123")
			next.ServeHTTP(w, r.WithContext(ctx))
			return
		}

		if authHeader != "" {
			token := strings.TrimPrefix(authHeader, "Bearer ")
			claims, err := jwt.Verify(r.Context(), &jwt.VerifyParams{
				Token: token,
			})
			if err == nil {
				ctx := context.WithValue(r.Context(), ClerkIDKey, claims.Subject)
				r = r.WithContext(ctx)
			}
		}
		next.ServeHTTP(w, r)
	})
}

func GetClerkID(ctx context.Context) (string, bool) {
	clerkID, ok := ctx.Value(ClerkIDKey).(string)
	return clerkID, ok
}

func GetUserID(ctx context.Context) (string, bool) {
	userID, ok := ctx.Value(UserIDKey).(string)
	return userID, ok
}

func respondWithError(w http.ResponseWriter, code int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	w.Write([]byte(fmt.Sprintf(`{"error": "%s"}`, message)))
}