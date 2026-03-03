package api

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/martbul/p-ink/internal/db"
	"github.com/martbul/p-ink/internal/middleware"
	"github.com/martbul/p-ink/internal/models"
)

// PairDevice  POST /api/devices/pair
//
// Each user pairs their own physical e-ink frame. A couple therefore ends up
// with two devices — one per partner — each maintaining its own frame_state.
// The device is immediately linked to the couple when the user is already in
// one; otherwise couple_id is set by LinkAllDevicesToCouple when the partner
// accepts the invite.
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

		// Enforce one device per user.
		existing, err := db.GetDeviceByOwner(r.Context(), pool, user.ID)
		if err != nil {
			Error(w, http.StatusInternalServerError, "db error")
			return
		}
		if existing != nil {
			Error(w, http.StatusConflict, "you already have a device paired")
			return
		}

		// MAC addresses must be globally unique.
		macDevice, err := db.GetDeviceByMAC(r.Context(), pool, mac)
		if err != nil {
			Error(w, http.StatusInternalServerError, "db error")
			return
		}
		if macDevice != nil {
			Error(w, http.StatusConflict, "this MAC address is already registered")
			return
		}

		// Link to couple immediately if the user is already in one.
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

// GetMyDevice  GET /api/devices/me
//
// Returns the authenticated user's own device and its current frame state.
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
			"frame_state": frameState,
		})
	}
}

// GetCoupleDevices  GET /api/devices/couple
//
// Returns both devices (0–2) that belong to the current user's couple,
// each enriched with its frame state. Useful for the settings / status page.
func GetCoupleDevices(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		couple, err := db.GetCoupleByUserID(r.Context(), pool, user.ID)
		if err != nil {
			Error(w, http.StatusInternalServerError, "db error")
			return
		}
		if couple == nil {
			Error(w, http.StatusNotFound, "not in a couple")
			return
		}

		devices, err := db.GetDevicesByCouple(r.Context(), pool, couple.ID)
		if err != nil {
			Error(w, http.StatusInternalServerError, "db error")
			return
		}

		type deviceWithState struct {
			Device     *models.Device     `json:"device"`
			FrameState *models.FrameState `json:"frame_state"`
		}
		result := make([]deviceWithState, 0, len(devices))
		for _, d := range devices {
			fs, _ := db.GetFrameState(r.Context(), pool, d.ID)
			result = append(result, deviceWithState{Device: d, FrameState: fs})
		}

		OK(w, map[string]any{"devices": result})
	}
}