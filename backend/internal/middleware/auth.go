package middleware

import (
	"context"
	"encoding/base64"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/jwks"
	"github.com/clerk/clerk-sdk-go/v2/jwt"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/martbul/p-ink/internal/db"
	"github.com/martbul/p-ink/internal/models"
)

// ─── Context keys ─────────────────────────────────────────────────────────────

type contextKey string

const (
	ClerkIDKey contextKey = "clerkID"
	UserKey    contextKey = "user"
)

// ─── NewJWKSClient ────────────────────────────────────────────────────────────
// Call once in main.go and pass the result to ClerkAuthMiddleware.
// This is the pattern from the official Clerk v2 docs.
func NewJWKSClient(secretKey string) *jwks.Client {
	config := &clerk.ClientConfig{}
	config.Key = clerk.String(secretKey)
	return jwks.NewClient(config)
}

// ─── ClerkAuthMiddleware ──────────────────────────────────────────────────────
func ClerkAuthMiddleware(pool *pgxpool.Pool, jwksClient *jwks.Client) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

			// Dev bypass
			if os.Getenv("APP_ENV") != "production" &&
				r.Header.Get("Authorization") == "Bearer TEST_TOKEN" {
				log.Println("[auth] dev bypass — injecting test user")
				next.ServeHTTP(w, r.WithContext(withDevUser(r.Context())))
				return
			}

			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				respondUnauthorized(w, "authorization header required")
				return
			}
			token := strings.TrimPrefix(authHeader, "Bearer ")
			if token == authHeader {
				respondUnauthorized(w, "use 'Bearer <token>'")
				return
			}

			claims, err := jwt.Verify(r.Context(), &jwt.VerifyParams{
				Token:      token,
				JWKSClient: jwksClient,
			})
			if err != nil {
				// Decode the token header (no signature needed) to log kid + issuer
				// so we can diagnose key mismatches
				if parts := strings.Split(token, "."); len(parts) == 3 {
					padded := parts[0]
					switch len(padded) % 4 {
					case 2:
						padded += "=="
					case 3:
						padded += "="
					}
					if hdrBytes, e := base64.RawURLEncoding.DecodeString(padded); e == nil {
						log.Printf("[auth] token header: %s", string(hdrBytes))
					}
					// Also log first 20 chars of payload (iss/azp)
					if payBytes, e := base64.RawURLEncoding.DecodeString(parts[1]); e == nil {
						payload := string(payBytes)
						if len(payload) > 200 {
							payload = payload[:200]
						}
						log.Printf("[auth] token payload (truncated): %s", payload)
					}
				}
				log.Printf("[auth] jwt.Verify failed: %v", err)
				respondUnauthorized(w, "invalid token")
				return
			}

			clerkID := claims.Subject

			user, err := db.GetUserByClerkID(r.Context(), pool, clerkID)
			if err != nil {
				log.Printf("[auth] db lookup failed for clerk_id=%s: %v", clerkID, err)
				respondError(w, http.StatusInternalServerError, "db error")
				return
			}
			if user == nil {
				respondUnauthorized(w, "user not provisioned yet — try again in a moment")
				return
			}

			ctx := context.WithValue(r.Context(), ClerkIDKey, clerkID)
			ctx = context.WithValue(ctx, UserKey, user)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// ─── OptionalAuthMiddleware ───────────────────────────────────────────────────
func OptionalAuthMiddleware(pool *pgxpool.Pool, jwksClient *jwks.Client) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if os.Getenv("APP_ENV") != "production" &&
				r.Header.Get("Authorization") == "Bearer TEST_TOKEN" {
				next.ServeHTTP(w, r.WithContext(withDevUser(r.Context())))
				return
			}

			authHeader := r.Header.Get("Authorization")
			if authHeader != "" {
				token := strings.TrimPrefix(authHeader, "Bearer ")
				if token != authHeader {
					if claims, err := jwt.Verify(r.Context(), &jwt.VerifyParams{
						Token:      token,
						JWKSClient: jwksClient,
					}); err == nil {
						if user, err := db.GetUserByClerkID(r.Context(), pool, claims.Subject); err == nil && user != nil {
							ctx := context.WithValue(r.Context(), ClerkIDKey, claims.Subject)
							ctx = context.WithValue(ctx, UserKey, user)
							r = r.WithContext(ctx)
						}
					}
				}
			}
			next.ServeHTTP(w, r)
		})
	}
}

// ─── Context helpers ──────────────────────────────────────────────────────────

func UserFromContext(ctx context.Context) *models.User {
	u, _ := ctx.Value(UserKey).(*models.User)
	return u
}

func ClerkIDFromContext(ctx context.Context) string {
	id, _ := ctx.Value(ClerkIDKey).(string)
	return id
}

// ─── Logger ───────────────────────────────────────────────────────────────────

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (sr *statusRecorder) WriteHeader(code int) {
	sr.status = code
	sr.ResponseWriter.WriteHeader(code)
}

func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)
		log.Printf("%s %s %d", r.Method, r.URL.Path, rec.status)
	})
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

func respondUnauthorized(w http.ResponseWriter, msg string) {
	respondError(w, http.StatusUnauthorized, msg)
}

func respondError(w http.ResponseWriter, code int, msg string) {
	if os.Getenv("APP_ENV") == "production" && code == http.StatusInternalServerError {
		msg = "internal error"
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	fmt.Fprintf(w, `{"error":%q}`, msg)
}

func withDevUser(ctx context.Context) context.Context {
	fakeUser := &models.User{
		ClerkID: "user_test_123",
		Email:   "dev@localhost",
		Name:    "Dev User",
	}
	ctx = context.WithValue(ctx, ClerkIDKey, "user_test_123")
	ctx = context.WithValue(ctx, UserKey, fakeUser)
	return ctx
}
