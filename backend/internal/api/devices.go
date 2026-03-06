package api

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/martbul/p-ink/internal/db"
	"github.com/martbul/p-ink/internal/errs"
	"github.com/martbul/p-ink/internal/middleware"
	"github.com/martbul/p-ink/internal/models"
)

// PairDevice  POST /api/devices/pair
func PairDevice(pool *pgxpool.Pool) http.HandlerFunc {
	const op = errs.Op("api.PairDevice")
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		var body struct {
			MacAddress string  `json:"mac_address"`
			Label      *string `json:"label,omitempty"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			BadRequest(w, "invalid JSON")
			return
		}

		mac := strings.ToUpper(strings.TrimSpace(body.MacAddress))
		if mac == "" {
			BadRequest(w, "mac_address is required")
			return
		}

		existing, err := db.GetDeviceByOwner(r.Context(), pool, user.ID)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to look up device"))
			return
		}
		if existing != nil {
			Error(w, errs.E(op, errs.KindConflict, "you already have a device paired"))
			return
		}

		macDevice, err := db.GetDeviceByMAC(r.Context(), pool, mac)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to look up MAC address"))
			return
		}
		if macDevice != nil {
			Error(w, errs.E(op, errs.KindConflict, "this MAC address is already registered"))
			return
		}

		var coupleID *uuid.UUID
		couple, _ := db.GetCoupleByUserID(r.Context(), pool, user.ID)
		if couple != nil {
			coupleID = &couple.ID
		}

		device, err := db.CreateDevice(r.Context(), pool, user.ID, mac, coupleID)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to pair device"))
			return
		}
		Created(w, device)
	}
}

// GetMyDevice  GET /api/devices/me
func GetMyDevice(pool *pgxpool.Pool) http.HandlerFunc {
	const op = errs.Op("api.GetMyDevice")
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		device, err := db.GetDeviceByOwner(r.Context(), pool, user.ID)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to look up device"))
			return
		}
		if device == nil {
			NotFound(w, "no device paired")
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
func GetCoupleDevices(pool *pgxpool.Pool) http.HandlerFunc {
	const op = errs.Op("api.GetCoupleDevices")
	return func(w http.ResponseWriter, r *http.Request) {
		user := middleware.UserFromContext(r.Context())

		couple, err := db.GetCoupleByUserID(r.Context(), pool, user.ID)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to look up couple"))
			return
		}
		if couple == nil {
			NotFound(w, "not in a couple")
			return
		}

		devices, err := db.GetDevicesByCouple(r.Context(), pool, couple.ID)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to list couple devices"))
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