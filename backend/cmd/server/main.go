package main

import (
	"context"
	"fmt"
	gorilllaHandlers "github.com/gorilla/handlers"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	"github.com/martbul/p-ink/internal/api"
	"github.com/martbul/p-ink/internal/db"
	"github.com/martbul/p-ink/internal/middleware"
	"github.com/martbul/p-ink/internal/storage"
)

func main() {
	_ = godotenv.Load()

	clerkKey := os.Getenv("CLERK_SECRET_KEY")
	if clerkKey == "" {
		log.Fatal("CLERK_SECRET_KEY is required")
	}
	clerk.SetKey(clerkKey)
	jwksClient := middleware.NewJWKSClient(clerkKey)

	ctx := context.Background()
	pool, err := db.Connect(ctx)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer pool.Close()
	log.Println("database connected")

	var store storage.Store
	cldStore, err := storage.NewCloudinaryStore()
	if err != nil {
		log.Printf("cloudinary not configured (%v) — using NoopStore", err)
		store = &storage.NoopStore{}
	} else {
		store = cldStore
		log.Println("cloudinary connected")
	}

	r := mux.NewRouter()
	r.Use(middleware.Logger)

	r.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		api.OK(w, map[string]string{"status": "ok"})
	}).Methods(http.MethodGet)

	r.HandleFunc("/api/webhooks/clerk", api.WebhookHandler(pool)).
		Methods(http.MethodPost)

	r.HandleFunc("/api/frame/poll", api.FramePoll(pool)).
		Methods(http.MethodPost)

	r.HandleFunc("/api/couples/invite/{token}", api.GetInviteInfo(pool)).
		Methods(http.MethodGet)

	protected := r.PathPrefix("").Subrouter()
	protected.Use(middleware.ClerkAuthMiddleware(pool, jwksClient))

	protected.HandleFunc("/api/users/me", api.GetMe(pool)).
		Methods(http.MethodGet)

	protected.HandleFunc("/api/couples", api.CreateCouple(pool)).
		Methods(http.MethodPost)
	protected.HandleFunc("/api/couples/me", api.GetCouple(pool)).
		Methods(http.MethodGet)
	protected.HandleFunc("/api/couples/me", api.UpdateCouple(pool)).
		Methods(http.MethodPatch)
	protected.HandleFunc("/api/couples/invite", api.CreateInvite(pool)).
		Methods(http.MethodPost)
	protected.HandleFunc("/api/couples/join", api.JoinCouple(pool)).
		Methods(http.MethodPost)

	protected.HandleFunc("/api/devices/pair", api.PairDevice(pool)).
		Methods(http.MethodPost)
	protected.HandleFunc("/api/devices/me", api.GetMyDevice(pool)).
		Methods(http.MethodGet)

	protected.HandleFunc("/api/content", api.ListContent(pool)).
		Methods(http.MethodGet)
	protected.HandleFunc("/api/content", api.UploadContent(pool, store)).
		Methods(http.MethodPost)
	protected.HandleFunc("/api/content/message", api.SendMessage(pool)).
		Methods(http.MethodPost)
	protected.HandleFunc("/api/content/{id}", api.DeleteContent(pool, store)).
		Methods(http.MethodDelete)

	protected.HandleFunc("/api/notifications/subscribe", api.SubscribePush(pool)).
		Methods(http.MethodPost)
	protected.HandleFunc("/api/notifications/subscriptions", api.GetPushSubscriptions(pool)).
		Methods(http.MethodGet)

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:7777"
	}


	//TODO: regex the device origins
	iotDeviceURL := "http://custom-iot-device.local"

	allowedOrigins := []string{
		frontendURL,
		"http://localhost:7777",
		iotDeviceURL,
	}

	corsHandler := gorilllaHandlers.CORS(
		gorilllaHandlers.AllowedOrigins(allowedOrigins),
		gorilllaHandlers.AllowedMethods([]string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}),
		gorilllaHandlers.AllowedHeaders([]string{"Content-Type", "Authorization", "X-Pprof-Secret"}),
		gorilllaHandlers.ExposedHeaders([]string{"Content-Length"}),
		gorilllaHandlers.AllowCredentials(),
	)

	port := os.Getenv("PORT")
	if port == "" {
		port = "7111"
	}

	server := &http.Server{
		Addr:         fmt.Sprintf(":%s", port),
		Handler:      corsHandler(r),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	go func() {
		log.Printf("server listening on :%s  (APP_ENV=%s)", port, os.Getenv("APP_ENV"))
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("shutting down...")

	shutCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutCtx); err != nil {
		log.Printf("shutdown: %v", err)
	}
	log.Println("shut down...")
}
