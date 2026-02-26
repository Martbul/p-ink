package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	gorilllaHandlers "github.com/gorilla/handlers"
	"github.com/martbul/p-ink/internal/db"

	clerk "github.com/clerk/clerk-sdk-go/v2"
	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	// "github.com/yourusername/p-ink/internal/api"
	// "github.com/yourusername/p-ink/internal/db"
	// "github.com/yourusername/p-ink/internal/middleware"
	// "github.com/yourusername/p-ink/internal/storage"
)

func main() {
	_ = godotenv.Load()

	clerkKey := os.Getenv("CLERK_SECRET_KEY")
	if clerkKey == "" {
		log.Fatal("CLERK_SECRET_KEY is required")
	}
	clerk.SetKey(clerkKey)

	ctx := context.Background()
	pool, err := db.Connect(ctx)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer pool.Close()
	log.Println("database connected")

	var store storage.Store
	s3Store, err := storage.NewS3Store()
	if err != nil {
		log.Printf("storage: %v — using NoopStore (uploads disabled)", err)
		store = &storage.NoopStore{}
	} else {
		store = s3Store
		log.Println("storage connected")
	}

	r := mux.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.ContentTypeJSON)

	// Health check — used by load balancer / Railway / Render
	r.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		api.OK(w, map[string]string{"status": "ok"})
	}).Methods(http.MethodGet)

	// Clerk webhook — must be raw, no JSON middleware messing with the body
	r.HandleFunc("/api/webhooks/clerk", api.WebhookHandler(pool)).
		Methods(http.MethodPost)

	// Frame poll — called by the ESP32, no user auth, MAC-based auth
	r.HandleFunc("/api/frame/poll", api.FramePoll(pool)).
		Methods(http.MethodPost)

	// Invite info — public so the frontend can show "Alex invited you" before login
	r.HandleFunc("/api/couples/invite/{token}", api.GetInviteInfo(pool)).
		Methods(http.MethodGet)

	// ── Authenticated routes ──────────────────────────────────────────────────
	auth := middleware.RequireAuth(pool)

	// Users
	r.Handle("/api/users/me", auth(http.HandlerFunc(api.GetMe(pool)))).
		Methods(http.MethodGet)

	// Couples
	r.Handle("/api/couples", auth(http.HandlerFunc(api.CreateCouple(pool)))).
		Methods(http.MethodPost)
	r.Handle("/api/couples/me", auth(http.HandlerFunc(api.GetCouple(pool)))).
		Methods(http.MethodGet)
	r.Handle("/api/couples/me", auth(http.HandlerFunc(api.UpdateCouple(pool)))).
		Methods(http.MethodPatch)
	r.Handle("/api/couples/invite", auth(http.HandlerFunc(api.CreateInvite(pool)))).
		Methods(http.MethodPost)
	r.Handle("/api/couples/join", auth(http.HandlerFunc(api.JoinCouple(pool)))).
		Methods(http.MethodPost)

	// Devices / Frames
	r.Handle("/api/devices/pair", auth(http.HandlerFunc(api.PairDevice(pool)))).
		Methods(http.MethodPost)
	r.Handle("/api/devices/me", auth(http.HandlerFunc(api.GetMyDevice(pool)))).
		Methods(http.MethodGet)

	// Content
	r.Handle("/api/content", auth(http.HandlerFunc(api.ListContent(pool)))).
		Methods(http.MethodGet)
	r.Handle("/api/content", auth(http.HandlerFunc(api.UploadContent(pool, store)))).
		Methods(http.MethodPost)
	r.Handle("/api/content/message", auth(http.HandlerFunc(api.SendMessage(pool)))).
		Methods(http.MethodPost)
	r.Handle("/api/content/{id}", auth(http.HandlerFunc(api.DeleteContent(pool, store)))).
		Methods(http.MethodDelete)

	// Push notifications
	r.Handle("/api/notifications/subscribe", auth(http.HandlerFunc(api.SubscribePush(pool)))).
		Methods(http.MethodPost)
	r.Handle("/api/notifications/subscriptions", auth(http.HandlerFunc(api.GetPushSubscriptions(pool)))).
		Methods(http.MethodGet)

	// ── CORS ─────────────────────────────────────────────────────────────────
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:3000"
	}

	corsHandler := gorilllaHandlers.CORS(
		gorilllaHandlers.AllowedOrigins([]string{"*"}),
		gorilllaHandlers.AllowedMethods([]string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}),
		gorilllaHandlers.AllowedHeaders([]string{"Content-Type", "Authorization", "X-Pprof-Secret"}),
		gorilllaHandlers.ExposedHeaders([]string{"Content-Length"}),
		gorilllaHandlers.AllowCredentials(),
	)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	server := &http.Server{
		Addr:         fmt.Sprintf(":%s", port),
		Handler:      corsHandler(r),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	go func() {
		log.Printf("server listening on :%s", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("shutting down...")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("shutdown error: %v", err)
	}
	log.Println("Server shutdown complete")
}
