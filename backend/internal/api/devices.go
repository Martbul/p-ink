package api

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/martbul/p-ink/internal/db"
	"github.com/martbul/p-ink/internal/middleware"
)

// PairDevice handles POST /api/devices/pair
// Called from the web UI onboarding: "Enter your frame's MAC address".
// Links the MAC address to the current user. If the user is already in
// an active couple, the device is linked to the couple immediately.
func PairDevice(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		var body struct {
			MacAddress string  `json:"mac_address"`
			Label      *string `json:"label,omitempty"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			Error(w, http.StatusBadRequest, "invalid JSON")
			return
		}

		mac := strings.ToUpper(strings.TrimSpace(body.MacAddress))
		if mac == "" {
			Error(w, http.StatusBadRequest, "mac_address is required")
			return
		}

		// Check if the user already has a device
		existing, err := db.GetDeviceByOwner(r.Context(), pool, user.ID)
		if err != nil {
			Error(w, http.StatusInternalServerError, "db error")
			return
		}
		if existing != nil {
			Error(w, http.StatusConflict, "you already have a device paired")
			return
		}

		// Check if the MAC is already claimed by someone else
		macDevice, err := db.GetDeviceByMAC(r.Context(), pool, mac)
		if err != nil {
			Error(w, http.StatusInternalServerError, "db error")
			return
		}
		if macDevice != nil {
			Error(w, http.StatusConflict, "this MAC address is already registered")
			return
		}

		// Resolve couple if the user is already in one
		var coupleID *uuid.UUID
		couple, _ := db.GetCoupleByUserID(r.Context(), pool, user.ID)
		if couple != nil {
			coupleID = &couple.ID
		}

		device, err := db.CreateDevice(r.Context(), pool, user.ID, mac, coupleID)
		if err != nil {
			Error(w, http.StatusInternalServerError, "could not pair device")
			return
		}

		Created(w, device)
	}
}

// GetMyDevice handles GET /api/devices/me
// Returns the current user's device and its current frame state.
func GetMyDevice(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		device, err := db.GetDeviceByOwner(r.Context(), pool, user.ID)
		if err != nil {
			Error(w, http.StatusInternalServerError, "db error")
			return
		}
		if device == nil {
			Error(w, http.StatusNotFound, "no device paired")
			return
		}

		frameState, _ := db.GetFrameState(r.Context(), pool, device.ID)

		OK(w, map[string]any{
			"device":      device,
			"frame_state": frameState, // nil if no image composed yet
		})
	}
}