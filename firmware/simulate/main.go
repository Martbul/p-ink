// p-ink firmware simulator
//
// Mimics the ESP32-S3 firmware behaviour entirely in Go so you can develop
// and test the backend without physical hardware.
//
// What it does:
//   - Pretends to be a real frame with a configurable MAC address
//   - Polls POST /api/frame/poll every <poll_interval_ms> milliseconds
//   - Detects image changes (hash comparison) and "downloads" the new image
//   - Prints a coloured ASCII render of the Tamagotchi state to the terminal
//   - Simulates low-battery and WiFi-reconnect scenarios on a timer
//   - Reports firmware version and boot count on every poll
//
// Usage:
//
//	go run firmware/simulate/main.go \
//	  -mac AA:BB:CC:DD:EE:FF \
//	  -backend http://localhost:7111 \
//	  -firmware 1.0.0
//
// Environment overrides (alternative to flags):
//
//	SIM_MAC=AA:BB:CC:DD:EE:FF
//	SIM_BACKEND=http://localhost:7111
//	SIM_FIRMWARE=1.0.0

package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strings"
	"time"
)

// ─── Poll request / response — must match backend exactly ─────────────────────

type PollRequest struct {
	MAC       string `json:"mac"`
	Firmware  string `json:"firmware"`
	BootCount uint32 `json:"boot_count"`
}

type FrameTamagotchi struct {
	Species    string `json:"species"`
	Mood       string `json:"mood"`
	Health     int    `json:"health"`
	Level      int    `json:"level"`
	Outfit     string `json:"outfit,omitempty"`
	Accessory  string `json:"accessory,omitempty"`
	Background string `json:"background,omitempty"`
	Position   string `json:"position,omitempty"`
}

type PollResponse struct {
	ImageURL       string           `json:"image_url"`
	ImageHash      string           `json:"image_hash"`
	PollIntervalMs uint32           `json:"poll_interval_ms"`
	OTAUrl         string           `json:"ota_url"`
	OTAVersion     string           `json:"ota_version"`
	Paired         bool             `json:"paired"`
	Tamagotchi     *FrameTamagotchi `json:"tamagotchi,omitempty"`
}

// ─── Simulator state ──────────────────────────────────────────────────────────

type Simulator struct {
	MAC         string
	BackendURL  string
	Firmware    string
	BootCount   uint32

	currentHash    string
	pollInterval   time.Duration
	client         *http.Client
	consecutive404 int
}

func NewSimulator(mac, backend, firmware string) *Simulator {
	return &Simulator{
		MAC:          strings.ToUpper(mac),
		BackendURL:   strings.TrimRight(backend, "/"),
		Firmware:     firmware,
		BootCount:    0,
		pollInterval: 20 * time.Second, // start fast for dev; backend will update this
		client:       &http.Client{Timeout: 15 * time.Second},
	}
}

// ─── Main loop ────────────────────────────────────────────────────────────────

func (s *Simulator) Run() {
	s.BootCount++
	printBanner(s.MAC, s.BackendURL, s.Firmware)

	for {
		resp, err := s.poll()
		if err != nil {
			printError(fmt.Sprintf("poll failed: %v", err))
			time.Sleep(s.pollInterval)
			continue
		}

		s.handleResponse(resp)

		// Randomly simulate WiFi drop every ~50 polls (stress test)
		if rand.Intn(50) == 0 {
			printWarn("WiFi drop simulated — sleeping 5s before reconnect")
			time.Sleep(5 * time.Second)
		}

		time.Sleep(s.pollInterval)
	}
}

// ─── Poll ─────────────────────────────────────────────────────────────────────

func (s *Simulator) poll() (*PollResponse, error) {
	req := PollRequest{
		MAC:       s.MAC,
		Firmware:  s.Firmware,
		BootCount: s.BootCount,
	}
	body, _ := json.Marshal(req)

	httpResp, err := s.client.Post(
		s.BackendURL+"/api/frame/poll",
		"application/json",
		bytes.NewReader(body),
	)
	if err != nil {
		return nil, err
	}
	defer httpResp.Body.Close()

	// 404 = device not registered yet
	if httpResp.StatusCode == http.StatusNotFound {
		s.consecutive404++
		printWarn(fmt.Sprintf(
			"[%s] Device not registered (404) — showing pairing screen (attempt %d)",
			timestamp(), s.consecutive404,
		))
		renderPairingScreen(s.MAC)
		return nil, nil
	}
	s.consecutive404 = 0

	if httpResp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status %d", httpResp.StatusCode)
	}

	var resp PollResponse
	if err := json.NewDecoder(httpResp.Body).Decode(&resp); err != nil {
		return nil, fmt.Errorf("decode: %w", err)
	}
	return &resp, nil
}

// ─── Response handler ─────────────────────────────────────────────────────────

func (s *Simulator) handleResponse(resp *PollResponse) {
	if resp == nil {
		return
	}

	// Update poll interval from server
	if resp.PollIntervalMs > 0 {
		s.pollInterval = time.Duration(resp.PollIntervalMs) * time.Millisecond
	}

	fmt.Printf("\n%s[POLL %s]%s paired=%v interval=%v\n",
		colorCyan, timestamp(), colorReset,
		resp.Paired, s.pollInterval,
	)

	if !resp.Paired {
		renderPairingScreen(s.MAC)
		return
	}

	// OTA update available
	if resp.OTAUrl != "" && resp.OTAVersion != "" && resp.OTAVersion != s.Firmware {
		printWarn(fmt.Sprintf("OTA update available: %s → %s", s.Firmware, resp.OTAVersion))
		printWarn(fmt.Sprintf("  URL: %s", resp.OTAUrl))
		printWarn("  Simulating OTA download... (3s)")
		time.Sleep(3 * time.Second)
		s.Firmware = resp.OTAVersion
		s.BootCount++
		printOK(fmt.Sprintf("OTA complete — now running firmware %s (boot #%d)", s.Firmware, s.BootCount))
	}

	// Image changed — "download" it
	if resp.ImageHash != "" && resp.ImageHash != s.currentHash {
		printOK(fmt.Sprintf("New image detected (hash: %s...)", truncate(resp.ImageHash, 12)))
		printOK(fmt.Sprintf("  Downloading: %s", resp.ImageURL))
		// Simulate e-ink refresh time
		simulateEinkRefresh()
		s.currentHash = resp.ImageHash
		printOK("Display updated ✓")
	} else if resp.ImageHash == s.currentHash && resp.ImageHash != "" {
		fmt.Printf("  %sImage unchanged — no refresh needed%s\n", colorGray, colorReset)
	} else {
		fmt.Printf("  %sNo image yet%s\n", colorGray, colorReset)
	}

	// Render Tamagotchi
	if resp.Tamagotchi != nil {
		renderTamagotchi(resp.Tamagotchi)
	}
}

// ─── Terminal rendering ───────────────────────────────────────────────────────

func renderPairingScreen(mac string) {
	fmt.Printf(`
%s┌─────────────────────────────────────────┐
│         p-ink frame setup               │
│                                         │
│  Your MAC address:                      │
│  %s%-39s%s│
│                                         │
│  Open p-ink app → Settings → Pair frame │
└─────────────────────────────────────────┘%s
`, colorYellow, colorWhite, mac, colorYellow, colorReset)
}

func renderTamagotchi(t *FrameTamagotchi) {
	moodColor := moodToColor(t.Mood)
	moodEmoji := moodToEmoji(t.Mood)
	healthBar := renderBar(t.Health, 100, 20)
	speciesArt := speciesASCII(t.Species, t.Mood)

	fmt.Printf(`
%s╔═══════════════════════════════════════════╗
║  🐾 Tamagotchi  (on %s's frame)          
║  Species:  %-10s  Level: %d           
║  Mood:     %s%-10s%s                   
║  Health:   [%s] %d/100          
║                                           
%s
║  Outfit:      %-30s
║  Accessory:   %-30s
║  Background:  %-30s
║  Position:    %-30s
╚═══════════════════════════════════════════╝%s
`,
		moodColor,
		"owner",
		t.Species, t.Level,
		moodColor, fmt.Sprintf("%s %s", moodEmoji, t.Mood), colorReset,
		healthBar, t.Health,
		speciesArt,
		emptyIfBlank(t.Outfit), emptyIfBlank(t.Accessory),
		emptyIfBlank(t.Background), emptyIfBlank(t.Position),
		colorReset,
	)
}

func renderBar(val, max, width int) string {
	filled := val * width / max
	if filled > width {
		filled = width
	}
	bar := strings.Repeat("█", filled) + strings.Repeat("░", width-filled)
	color := colorGreen
	if val < 50 {
		color = colorYellow
	}
	if val < 20 {
		color = colorRed
	}
	return color + bar + colorReset
}

func speciesASCII(species, mood string) string {
	arts := map[string]map[string]string{
		"bear": {
			"happy":    "║  (•ᴗ•)ʕ•ᴥ•ʔ  happy bear!",
			"neutral":  "║  (•_•) ʕ-ᴥ-ʔ  hmm...",
			"sad":      "║  (╥_╥)ʕ;ᴥ;ʔ  sad bear...",
			"sleeping": "║  ( -.- )zzz   zzZ",
			"excited":  "║  \\(^ᴗ^)/ʕ≧ᴥ≦ʔ  YAAAAY!",
		},
		"cat": {
			"happy":    "║  (=^ω^=)  purrr",
			"neutral":  "║  (=_=)    meh",
			"sad":      "║  (=;ω;=)  mrow...",
			"sleeping": "║  (=-.-)zzz",
			"excited":  "║  (=^▽^=)  meow!!",
		},
		"bunny": {
			"happy":    "║  (✿◠‿◠)ﾉ  hop hop!",
			"neutral":  "║  (・ω・)   ...",
			"sad":      "║  (╥ω╥)    *sniff*",
			"sleeping": "║  (-.-)zzz  nap time",
			"excited":  "║  (✿^▽^)ﾉ  BOING!",
		},
		"ghost": {
			"happy":    "║  ( ͡° ͜ʖ ͡°)  BOO! hehe",
			"neutral":  "║  (  ._.)   ...",
			"sad":      "║  ( T_T )   woooo...",
			"sleeping": "║  ( -.- )   floating zzz",
			"excited":  "║  (ﾉ◕ヮ◕)ﾉ  SPOOKY!",
		},
		"plant": {
			"happy":    "║  (^‿^)🌿  growing!",
			"neutral":  "║  (-_-)🌿  photosynthesis",
			"sad":      "║  (;_;)🥀  wilting...",
			"sleeping": "║  (-.-) 💤 dormant",
			"excited":  "║  (ﾉ^▽^)🌸  blooming!!",
		},
	}

	if speciesMoods, ok := arts[species]; ok {
		if art, ok := speciesMoods[mood]; ok {
			return art
		}
		if art, ok := speciesMoods["neutral"]; ok {
			return art
		}
	}
	return "║  (•ᴗ•)  " + species
}

func simulateEinkRefresh() {
	fmt.Printf("  %s[e-ink refresh]%s ", colorGray, colorReset)
	for i := 0; i < 5; i++ {
		time.Sleep(200 * time.Millisecond)
		fmt.Print(".")
	}
	fmt.Println(" done")
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func moodToColor(mood string) string {
	switch mood {
	case "happy", "excited":
		return colorGreen
	case "neutral":
		return colorCyan
	case "sad":
		return colorYellow
	case "sleeping":
		return colorGray
	default:
		return colorReset
	}
}

func moodToEmoji(mood string) string {
	switch mood {
	case "happy":
		return "😊"
	case "excited":
		return "🎉"
	case "neutral":
		return "😐"
	case "sad":
		return "😢"
	case "sleeping":
		return "😴"
	default:
		return "❓"
	}
}

func emptyIfBlank(s string) string {
	if s == "" {
		return "(none)"
	}
	return s
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}

func timestamp() string {
	return time.Now().Format("15:04:05")
}

func printBanner(mac, backend, firmware string) {
	fmt.Printf(`
%s╔══════════════════════════════════════════════╗
║          p-ink firmware simulator            ║
║                                              ║
║  MAC:      %-34s║
║  Backend:  %-34s║
║  Firmware: %-34s║
╚══════════════════════════════════════════════╝%s

`, colorCyan, mac, backend, firmware, colorReset)
}

func printOK(msg string)   { fmt.Printf("  %s✓ %s%s\n", colorGreen, msg, colorReset) }
func printWarn(msg string) { fmt.Printf("  %s⚠ %s%s\n", colorYellow, msg, colorReset) }
func printError(msg string) { fmt.Printf("  %s✗ %s%s\n", colorRed, msg, colorReset) }

// ─── ANSI colours ─────────────────────────────────────────────────────────────

const (
	colorReset  = "\033[0m"
	colorRed    = "\033[31m"
	colorGreen  = "\033[32m"
	colorYellow = "\033[33m"
	colorCyan   = "\033[36m"
	colorGray   = "\033[90m"
	colorWhite  = "\033[97m"
)

// ─── Entry point ──────────────────────────────────────────────────────────────

func main() {
	mac      := flag.String("mac",      envOr("SIM_MAC",      "AA:BB:CC:DD:DD:DD"), "Frame MAC address")
	backend  := flag.String("backend",  envOr("SIM_BACKEND",  "https://api.p-ink.strct.org"), "Backe/nd base URL")
	// backend  := flag.String("backend",  envOr("SIM_BACKEND",  "http://localhost:7111"), "Backend base URL")
	firmware := flag.String("firmware", envOr("SIM_FIRMWARE", "1.0.0"), "Firmware version string")
	flag.Parse()

	if *mac == "" {
		log.Fatal("-mac is required")
	}

	rand.Seed(time.Now().UnixNano())
	sim := NewSimulator(*mac, *backend, *firmware)
	sim.Run()
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}