package api

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/martbul/p-ink/internal/db"
	"github.com/martbul/p-ink/internal/errs"
	"github.com/martbul/p-ink/internal/models"
)

type PollResponse struct {
	ImageURL       string                   `json:"image_url"`
	ImageHash      string                   `json:"image_hash"`
	PollIntervalMs uint32                   `json:"poll_interval_ms"`
	OTAUrl         string                   `json:"ota_url"`
	OTAVersion     string                   `json:"ota_version"`
	Paired         bool                     `json:"paired"`
	Tamagotchi     *models.FrameTamagotchi  `json:"tamagotchi,omitempty"`
	PartnerAvatar  *models.FramePixelAvatar `json:"partner_avatar,omitempty"`
	Slideshow      *models.FrameSlideshow   `json:"slideshow,omitempty"`
}

func FramePoll(pool *pgxpool.Pool) http.HandlerFunc {
	const op = errs.Op("api.FramePoll")
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			MAC       string `json:"mac"`
			Firmware  string `json:"firmware"`
			BootCount uint32 `json:"boot_count"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			BadRequest(w, "invalid JSON")
			return
		}

		mac := strings.ToUpper(strings.TrimSpace(req.MAC))
		if mac == "" {
			mac = strings.ToUpper(strings.TrimSpace(r.Header.Get("X-Device-Mac")))
		}
		if mac == "" {
			BadRequest(w, "mac is required")
			return
		}

		device, err := db.GetDeviceByMAC(r.Context(), pool, mac)
		if err != nil {
			Error(w, errs.E(op, errs.KindInternal, err, "failed to look up device"))
			return
		}
		if device == nil {
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
			Error(w, errs.E(op, errs.KindInternal, err, "failed to fetch frame state"))
			return
		}

		resp := PollResponse{PollIntervalMs: 60_000, Paired: true}
		if fs != nil {
			resp.ImageURL = fs.ImageURL
			resp.ImageHash = fs.ImageHash
		}

		if ft, err := db.GetFrameTamagotchi(r.Context(), pool, device.OwnerID); err == nil && ft != nil {
			resp.Tamagotchi = ft
		}

		if pa, err := db.GetPartnerPixelAvatarByOwner(r.Context(), pool, device.OwnerID); err == nil && pa != nil {
			resp.PartnerAvatar = &models.FramePixelAvatar{
				Pixels:  pa.Pixels,
				Palette: pa.Palette,
				Width:   pa.Width,
				Height:  pa.Height,
			}
		}

		if fs, err := db.GetFrameSlideshow(r.Context(), pool, device.OwnerID); err == nil && fs != nil {
			resp.Slideshow = fs
		}

		OK(w, resp)
	}
}
