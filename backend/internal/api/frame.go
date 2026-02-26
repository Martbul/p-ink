package api

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/martbul/p-ink/internal/db"
	"github.com/martbul/p-ink/internal/models"
)

// PollResponse is what the ESP32 receives on every poll.
type PollResponse struct {
	ImageURL       string `json:"image_url"`        // empty string = no new image
	ImageHash      string `json:"image_hash"`       // SHA-256 of BMP bytes
	PollIntervalMs uint32 `json:"poll_interval_ms"` // how long the frame should sleep
	OTAUrl         string `json:"ota_url"`          // empty = no update available
	OTAVersion     string `json:"ota_version"`
	Paired         bool   `json:"paired"` // false = show "pair this frame" screen
}

// FramePoll handles POST /api/frame/poll
// This is the only endpoint the ESP32 firmware ever calls.
// No auth header — device authenticates by MAC address.
//
// Request body: { "mac": "AA:BB:CC:DD:EE:FF", "firmware": "1.0.0", "boot_count": 42 }
// Response:     PollResponse JSON
func FramePoll(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			MAC       string `json:"mac"`
			Firmware  string `json:"firmware"`
			BootCount uint32 `json:"boot_count"`
		}

		// Also accept the MAC from the header (firmware sends both)
		headerMAC := r.Header.Get("X-Device-Mac")

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			Error(w, http.StatusBadRequest, "invalid JSON")
			return
		}

		mac := strings.ToUpper(strings.TrimSpace(req.MAC))
		if mac == "" {
			mac = strings.ToUpper(strings.TrimSpace(headerMAC))
		}
		if mac == "" {
			Error(w, http.StatusBadRequest, "mac is required")
			return
		}

		// Look up device
		device, err := db.GetDeviceByMAC(r.Context(), pool, mac)
		if err != nil {
			Error(w, http.StatusInternalServerError, "db error")
			return
		}

		// Unknown device — return 404 so the firmware shows the pairing screen
		if device == nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusNotFound)
			_ = json.NewEncoder(w).Encode(PollResponse{
				PollIntervalMs: 60_000,
				Paired:         false,
			})
			return
		}

		// Update last_seen + firmware version
		_ = db.TouchDevice(r.Context(), pool, device.ID, req.Firmware)

		// Device exists but not yet linked to a couple
		if device.CoupleID == nil {
			OK(w, PollResponse{PollIntervalMs: 30_000, Paired: false})
			return
		}

		// Verify couple is active
		couple, err := db.GetCoupleByID(r.Context(), pool, *device.CoupleID)
		if err != nil || couple == nil || couple.Status != models.CoupleStatusActive {
			OK(w, PollResponse{PollIntervalMs: 30_000, Paired: false})
			return
		}

		// Get current frame state
		fs, err := db.GetFrameState(r.Context(), pool, device.ID)
		if err != nil {
			Error(w, http.StatusInternalServerError, "db error")
			return
		}

		resp := PollResponse{
			PollIntervalMs: 60_000,
			Paired:         true,
		}

		if fs != nil {
			resp.ImageURL  = fs.ImageURL
			resp.ImageHash = fs.ImageHash
		}

		// ── OTA stub ──────────────────────────────────────────────────────────
		// TODO: compare req.Firmware against the current release version
		// and set resp.OTAUrl / resp.OTAVersion when an update is available.
		// ─────────────────────────────────────────────────────────────────────

		OK(w, resp)
	}
}