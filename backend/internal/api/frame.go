package api

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/martbul/p-ink/internal/db"
	"github.com/martbul/p-ink/internal/models"
)

// PollResponse is the JSON the ESP32 receives on every poll.
type PollResponse struct {
	ImageURL       string                 `json:"image_url"`
	ImageHash      string                 `json:"image_hash"`
	PollIntervalMs uint32                 `json:"poll_interval_ms"`
	OTAUrl         string                 `json:"ota_url"`
	OTAVersion     string                 `json:"ota_version"`
	Paired         bool                   `json:"paired"`
	Tamagotchi     *models.FrameTamagotchi `json:"tamagotchi,omitempty"`
}

// FramePoll  POST /api/frame/poll  — no user auth, MAC-based
func FramePoll(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			MAC       string `json:"mac"`
			Firmware  string `json:"firmware"`
			BootCount uint32 `json:"boot_count"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			Error(w, http.StatusBadRequest, "invalid JSON")
			return
		}

		// Accept MAC from either body or header
		mac := strings.ToUpper(strings.TrimSpace(req.MAC))
		if mac == "" {
			mac = strings.ToUpper(strings.TrimSpace(r.Header.Get("X-Device-Mac")))
		}
		if mac == "" {
			Error(w, http.StatusBadRequest, "mac is required")
			return
		}

		device, err := db.GetDeviceByMAC(r.Context(), pool, mac)
		if err != nil {
			Error(w, http.StatusInternalServerError, "db error")
			return
		}
		if device == nil {
			// Unknown device — firmware shows the pairing screen
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusNotFound)
			_ = json.NewEncoder(w).Encode(PollResponse{PollIntervalMs: 60_000, Paired: false})
			return
		}

		_ = db.TouchDevice(r.Context(), pool, device.ID, req.Firmware)

		if device.CoupleID == nil {
			OK(w, PollResponse{PollIntervalMs: 30_000, Paired: false})
			return
		}

		couple, err := db.GetCoupleByID(r.Context(), pool, *device.CoupleID)
		if err != nil || couple == nil || couple.Status != models.CoupleStatusActive {
			OK(w, PollResponse{PollIntervalMs: 30_000, Paired: false})
			return
		}

		fs, err := db.GetFrameState(r.Context(), pool, device.ID)
		if err != nil {
			Error(w, http.StatusInternalServerError, "db error")
			return
		}

		resp := PollResponse{PollIntervalMs: 60_000, Paired: true}
		if fs != nil {
			resp.ImageURL  = fs.ImageURL
			resp.ImageHash = fs.ImageHash
		}

		// Attach the owner's Tamagotchi state for frame rendering
		if ft, err := db.GetFrameTamagotchi(r.Context(), pool, device.OwnerID); err == nil && ft != nil {
			resp.Tamagotchi = ft
		}

		// TODO: compare req.Firmware and set resp.OTAUrl / resp.OTAVersion when needed

		OK(w, resp)
	}
}