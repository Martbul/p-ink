package main

// ─── firmware/simulate/main.go (updated) ─────────────────────────────────────
// Changes vs original:
//   • PollResponse now includes PartnerLocation
//   • renderLocation() prints a location pill in the terminal frame
//   • Simulator tracks lastLocationHash to detect changes (mirrors firmware)
//   • --unpair  flag: sends DELETE /api/devices/me then exits
//   • --dissolve flag: sends DELETE /api/couples/me then exits
//   • --share-location flag: sends one POST /api/location/share then exits
//   • --stop-location flag: sends DELETE /api/location/share then exits
//   • All management calls require --token <jwt> flag

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
	"sync"
	"time"
)

var outputMu sync.Mutex

// ─── Wire types (must mirror Go models exactly) ───────────────────────────────

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

// FrameLocation mirrors models.FrameLocation
type FrameLocation struct {
	Lat       float64  `json:"lat"`
	Lng       float64  `json:"lng"`
	AccuracyM *float64 `json:"accuracy_m,omitempty"`
	Mode      string   `json:"mode"`
	UpdatedAt string   `json:"updated_at"`
}

type PollResponse struct {
	ImageURL        string           `json:"image_url"`
	ImageHash       string           `json:"image_hash"`
	PollIntervalMs  uint32           `json:"poll_interval_ms"`
	OTAUrl          string           `json:"ota_url"`
	OTAVersion      string           `json:"ota_version"`
	Paired          bool             `json:"paired"`
	Tamagotchi      *FrameTamagotchi `json:"tamagotchi,omitempty"`
	PartnerLocation *FrameLocation   `json:"partner_location,omitempty"`
}

// ─── Simulator ────────────────────────────────────────────────────────────────

type Simulator struct {
	MAC        string
	BackendURL string
	Firmware   string
	BootCount  uint32

	currentHash    string
	lastLocHash    string
	pollInterval   time.Duration
	client         *http.Client
	consecutive404 int
	rng            *rand.Rand
}

func NewSimulator(mac, backend, firmware string, seed int64) *Simulator {
	return &Simulator{
		MAC:          strings.ToUpper(mac),
		BackendURL:   strings.TrimRight(backend, "/"),
		Firmware:     firmware,
		BootCount:    0,
		pollInterval: 20 * time.Second,
		client:       &http.Client{Timeout: 15 * time.Second},
		rng:          rand.New(rand.NewSource(seed)),
	}
}

func (s *Simulator) Run() {
	s.BootCount++
	s.printLine(fmt.Sprintf("Started device (Firmware: %s)", s.Firmware))

	for {
		resp, err := s.poll()
		if err != nil {
			s.printError(fmt.Sprintf("poll failed: %v", err))
		} else {
			s.handleResponse(resp)
		}

		if s.rng.Intn(70) == 0 {
			s.printWarn("WiFi drop simulated — sleeping 5s before reconnect")
			time.Sleep(5 * time.Second)
		}

		jitter := time.Duration(s.rng.Intn(2000)) * time.Millisecond
		time.Sleep(s.pollInterval + jitter)
	}
}

func (s *Simulator) poll() (*PollResponse, error) {
	req := PollRequest{MAC: s.MAC, Firmware: s.Firmware, BootCount: s.BootCount}
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

	if httpResp.StatusCode == http.StatusNotFound {
		s.consecutive404++
		s.printWarn(fmt.Sprintf("Device not registered (404) — pairing screen (attempt %d)", s.consecutive404))
		s.renderPairingScreen()
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

	if resp.PollIntervalMs > 0 {
		s.pollInterval = time.Duration(resp.PollIntervalMs) * time.Millisecond
	}

	outputMu.Lock()
	fmt.Printf("\n%s[%s] [POLL %s]%s paired=%v interval=%v\n",
		colorCyan, s.MAC, timestamp(), colorReset, resp.Paired, s.pollInterval)
	outputMu.Unlock()

	if !resp.Paired {
		s.renderPairingScreen()
		return
	}

	// OTA
	if resp.OTAUrl != "" && resp.OTAVersion != "" && resp.OTAVersion != s.Firmware {
		s.printWarn(fmt.Sprintf("OTA available: %s → %s", s.Firmware, resp.OTAVersion))
		s.printWarn("  Simulating OTA download... (3s)")
		time.Sleep(3 * time.Second)
		s.Firmware = resp.OTAVersion
		s.BootCount++
		s.printOK(fmt.Sprintf("OTA complete — firmware %s (boot #%d)", s.Firmware, s.BootCount))
	}

	// Image
	if resp.ImageHash != "" && resp.ImageHash != s.currentHash {
		s.printOK(fmt.Sprintf("New image (hash: %s...)", truncate(resp.ImageHash, 12)))
		s.printOK(fmt.Sprintf("  Downloading: %s", resp.ImageURL))
		s.simulateEinkRefresh()
		s.currentHash = resp.ImageHash
		s.printOK("Display updated ✓")
	} else if resp.ImageHash == s.currentHash && resp.ImageHash != "" {
		s.printLine(colorGray + "  Image unchanged — no refresh needed" + colorReset)
	} else {
		s.printLine(colorGray + "  No image yet" + colorReset)
	}

	// Tamagotchi
	if resp.Tamagotchi != nil {
		s.renderTamagotchi(resp.Tamagotchi)
	}

	// Location overlay — only re-render when it changes (mirrors firmware)
	newLocHash := locationHash(resp.PartnerLocation)
	if newLocHash != s.lastLocHash {
		if resp.PartnerLocation != nil {
			s.renderLocation(resp.PartnerLocation)
		} else {
			s.printLine(colorGray + "  Location overlay cleared" + colorReset)
		}
		s.lastLocHash = newLocHash
	}
}

// ─── Terminal rendering ───────────────────────────────────────────────────────

func (s *Simulator) renderPairingScreen() {
	outputMu.Lock()
	defer outputMu.Unlock()
	fmt.Printf(`
%s┌─────────────────────────────────────────┐
│         p-ink frame setup               │
│                                         │
│  Your MAC address:                      │
│  %s%-39s%s│
│                                         │
│  Open p-ink app → Settings → Pair frame │
└─────────────────────────────────────────┘%s
`, colorYellow, colorWhite, s.MAC, colorYellow, colorReset)
}

func (s *Simulator) renderTamagotchi(t *FrameTamagotchi) {
	outputMu.Lock()
	defer outputMu.Unlock()

	moodColor := moodToColor(t.Mood)
	moodEmoji := moodToEmoji(t.Mood)
	healthBar := renderBar(t.Health, 100, 20)
	speciesArt := speciesASCII(t.Species, t.Mood)

	fmt.Printf(`
%s╔═══════════════════════════════════════════╗
║  🐾 Tamagotchi  [%s%-17s%s]
║  Species:  %-10s  Level: %-12d
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
		colorWhite, s.MAC, moodColor,
		t.Species, t.Level,
		moodColor, fmt.Sprintf("%s %s", moodEmoji, t.Mood), moodColor,
		healthBar, t.Health,
		speciesArt,
		emptyIfBlank(t.Outfit), emptyIfBlank(t.Accessory),
		emptyIfBlank(t.Background), emptyIfBlank(t.Position),
		colorReset,
	)
}

// renderLocation prints the bottom-left pill the real firmware would draw.
func (s *Simulator) renderLocation(loc *FrameLocation) {
	outputMu.Lock()
	defer outputMu.Unlock()

	timeStr := extractTimeFromRFC3339(loc.UpdatedAt)
	var line1, line2 string

	if loc.Mode == "map_link" {
		line1 = fmt.Sprintf("maps.gl/%.4f,%.4f", loc.Lat, loc.Lng)
		line2 = timeStr
	} else {
		latDir := "N"
		if loc.Lat < 0 {
			latDir = "S"
		}
		lngDir := "E"
		if loc.Lng < 0 {
			lngDir = "W"
		}
		line1 = fmt.Sprintf("%.4f°%s  %.4f°%s",
			abs(loc.Lat), latDir, abs(loc.Lng), lngDir)
		if loc.AccuracyM != nil && *loc.AccuracyM > 0 && *loc.AccuracyM < 10000 {
			line2 = fmt.Sprintf("+/-%.0fm  %s", *loc.AccuracyM, timeStr)
		} else {
			line2 = timeStr
		}
	}

	fmt.Printf(`
%s┌─────────────────────────────┐
│ 📍 %-25s │
│    %-25s │
└─────────────────────────────┘%s  %s[bottom-left overlay]%s
`,
		colorCyan, line1, line2, colorReset,
		colorGray, colorReset)
}

func (s *Simulator) simulateEinkRefresh() {
	s.printLine(colorGray + "[e-ink refresh] flashing display..." + colorReset)
	time.Sleep(1 * time.Second)
}

// ─── Management commands (one-shot, require --token) ──────────────────────────

func runManagementCommand(cmd, backendURL, token string, body map[string]any) {
	var method string
	var path string

	switch cmd {
	case "unpair":
		method = http.MethodDelete
		path = "/api/devices/me"
	case "dissolve":
		method = http.MethodDelete
		path = "/api/couples/me"
	case "share-location":
		method = http.MethodPost
		path = "/api/location/share"
	case "stop-location":
		method = http.MethodDelete
		path = "/api/location/share"
	default:
		log.Fatalf("Unknown management command: %s", cmd)
	}

	url := strings.TrimRight(backendURL, "/") + path
	fmt.Printf("%s→ %s %s%s\n", colorCyan, method, url, colorReset)

	var reqBody *bytes.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		reqBody = bytes.NewReader(b)
	} else {
		reqBody = bytes.NewReader(nil)
	}

	req, err := http.NewRequest(method, url, reqBody)
	if err != nil {
		log.Fatalf("build request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	switch resp.StatusCode {
	case http.StatusNoContent:
		fmt.Printf("%s✓ Success (204 No Content)%s\n", colorGreen, colorReset)
	case http.StatusOK, http.StatusCreated:
		var result any
		_ = json.NewDecoder(resp.Body).Decode(&result)
		b, _ := json.MarshalIndent(result, "", "  ")
		fmt.Printf("%s✓ Success (%d)%s\n%s\n", colorGreen, resp.StatusCode, colorReset, string(b))
	default:
		var errBody map[string]any
		_ = json.NewDecoder(resp.Body).Decode(&errBody)
		fmt.Printf("%s✗ Failed (%d): %v%s\n", colorRed, resp.StatusCode, errBody, colorReset)
		os.Exit(1)
	}
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// locationHash builds a short fingerprint for change detection.
func locationHash(loc *FrameLocation) string {
	if loc == nil {
		return "none"
	}
	return fmt.Sprintf("%.4f_%.4f_%s", loc.Lat, loc.Lng, loc.UpdatedAt)
}

func extractTimeFromRFC3339(s string) string {
	idx := strings.IndexByte(s, 'T')
	if idx < 0 || len(s) < idx+6 {
		return "--:--"
	}
	return s[idx+1 : idx+6]
}

func abs(v float64) float64 {
	if v < 0 {
		return -v
	}
	return v
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
		"bear":   {"happy": "║  (•ᴗ•)ʕ•ᴥ•ʔ  happy bear!", "neutral": "║  (•_•) ʕ-ᴥ-ʔ  hmm...", "sad": "║  (╥_╥)ʕ;ᴥ;ʔ  sad bear...", "sleeping": "║  ( -.- )zzz   zzZ", "excited": "║  \\(^ᴗ^)/ʕ≧ᴥ≦ʔ  YAAAAY!"},
		"cat":    {"happy": "║  (=^ω^=)  purrr", "neutral": "║  (=_=)    meh", "sad": "║  (=;ω;=)  mrow...", "sleeping": "║  (=-.-)zzz", "excited": "║  (=^▽^=)  meow!!"},
		"bunny":  {"happy": "║  (✿◠‿◠)ﾉ  hop hop!", "neutral": "║  (・ω・)   ...", "sad": "║  (╥ω╥)    *sniff*", "sleeping": "║  (-.-)zzz  nap time", "excited": "║  (✿^▽^)ﾉ  BOING!"},
		"ghost":  {"happy": "║  ( ͡° ͜ʖ ͡°)  BOO! hehe", "neutral": "║  (  ._.)   ...", "sad": "║  ( T_T )   woooo...", "sleeping": "║  ( -.- )   floating zzz", "excited": "║  (ﾉ◕ヮ◕)ﾉ  SPOOKY!"},
		"penguin":{"happy": "║  (>‿<)    waddle!", "neutral": "║  (-_-)    ...", "sad": "║  (;_;)    honk...", "sleeping": "║  (-.-) 💤 zzz", "excited": "║  (ﾉ^▽^)   FLAP!"},
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
	}
	return colorReset
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
	}
	return "❓"
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

// ─── Synchronized output ──────────────────────────────────────────────────────

func (s *Simulator) printLine(msg string) {
	outputMu.Lock(); defer outputMu.Unlock()
	fmt.Printf("%s[%s]%s %s\n", colorCyan, s.MAC, colorReset, msg)
}
func (s *Simulator) printOK(msg string)    { s.printLine(colorGreen + "✓ " + msg + colorReset) }
func (s *Simulator) printWarn(msg string)  { s.printLine(colorYellow + "⚠ " + msg + colorReset) }
func (s *Simulator) printError(msg string) { s.printLine(colorRed + "✗ " + msg + colorReset) }

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
	macsStr  := flag.String("macs",     envOr("SIM_MACS", ""),                    "Comma-separated MAC addresses")
	count    := flag.Int   ("count",    1,                                         "Number of simulated devices")
	backend  := flag.String("backend",  envOr("SIM_BACKEND", "https://api.p-ink.strct.org"), "Backend base URL")
	firmware := flag.String("firmware", envOr("SIM_FIRMWARE", "1.0.0"),            "Firmware version string")

	// ── Management command flags ──────────────────────────────────────────
	token      := flag.String("token",          "",    "JWT bearer token (required for management commands)")
	unpair     := flag.Bool  ("unpair",          false, "DELETE /api/devices/me  — unpair the device then exit")
	dissolve   := flag.Bool  ("dissolve",        false, "DELETE /api/couples/me  — dissolve the couple then exit")
	shareLat   := flag.Float64("share-lat",      0,     "Latitude for --share-location")
	shareLng   := flag.Float64("share-lng",      0,     "Longitude for --share-location")
	shareMode  := flag.String ("share-mode",     "coordinates", "Location mode: coordinates|map_link")
	shareAcc   := flag.Float64("share-accuracy", 0,     "Accuracy in metres (optional, 0=omit)")
	stopLoc    := flag.Bool  ("stop-location",   false, "DELETE /api/location/share — stop sharing then exit")
	flag.Parse()

	// ── One-shot management commands (do not start a simulator loop) ─────
	isManagement := *unpair || *dissolve || (*shareLat != 0 || *shareLng != 0) || *stopLoc
	if isManagement {
		if *token == "" {
			log.Fatal("--token is required for management commands")
		}
		switch {
		case *unpair:
			runManagementCommand("unpair", *backend, *token, nil)
		case *dissolve:
			runManagementCommand("dissolve", *backend, *token, nil)
		case *stopLoc:
			runManagementCommand("stop-location", *backend, *token, nil)
		default:
			// share-location
			body := map[string]any{
				"lat":  *shareLat,
				"lng":  *shareLng,
				"mode": *shareMode,
			}
			if *shareAcc > 0 {
				body["accuracy_m"] = *shareAcc
			}
			runManagementCommand("share-location", *backend, *token, body)
		}
		return
	}

	// ── Normal simulator loop ─────────────────────────────────────────────
	var macs []string
	if *macsStr != "" {
		for _, m := range strings.Split(*macsStr, ",") {
			if m = strings.TrimSpace(m); m != "" {
				macs = append(macs, m)
			}
		}
	} else {
		for i := 1; i <= *count; i++ {
			macs = append(macs, fmt.Sprintf("AA:BB:CC:DD:EE:%02X", i))
		}
	}
	if len(macs) == 0 {
		log.Fatal("No MAC addresses provided or generated.")
	}

	fmt.Printf("\n%s╔══════════════════════════════════════════════╗%s\n", colorCyan, colorReset)
	fmt.Printf("%s║      p-ink multi-firmware simulator          ║%s\n", colorCyan, colorReset)
	fmt.Printf("%s╚══════════════════════════════════════════════╝%s\n\n", colorCyan, colorReset)
	fmt.Printf("Backend:  %s\n", *backend)
	fmt.Printf("Firmware: %s\n", *firmware)
	fmt.Printf("Devices:  %d\n\n", len(macs))

	var wg sync.WaitGroup
	for i, mac := range macs {
		sim := NewSimulator(mac, *backend, *firmware, time.Now().UnixNano()+int64(i))
		wg.Add(1)
		go func(s *Simulator) { defer wg.Done(); s.Run() }(sim)
		time.Sleep(150 * time.Millisecond)
	}
	wg.Wait()
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}