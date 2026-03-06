package api

import (
	"encoding/json"
	"net/http"

	"github.com/martbul/p-ink/internal/errs"
)

func JSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if data != nil {
		_ = json.NewEncoder(w).Encode(data)
	}
}

// Error logs the full error chain and writes a safe JSON error response.
// Always pass the real error here — never a string summary.
//
// Usage:
//
//	tama, err := db.GetTamagotchiByOwner(...)
//	if err != nil {
//	    Error(w, errs.E(errs.Op("api.UpdateAppearance"), errs.KindInternal, err))
//	    return
//	}
func Error(w http.ResponseWriter, err error) {
	errs.HTTPResponse(w, err)
}

// Shorthand for simple validation errors that have no underlying error to wrap.
func BadRequest(w http.ResponseWriter, msg string) {
	Error(w, errs.E(errs.KindInvalid, msg))
}

// Shorthand for not-found errors.
func NotFound(w http.ResponseWriter, msg string) {
	Error(w, errs.E(errs.KindNotFound, msg))
}

func OK(w http.ResponseWriter, data any) {
	JSON(w, http.StatusOK, data)
}

func Created(w http.ResponseWriter, data any) {
	JSON(w, http.StatusCreated, data)
}

func NoContent(w http.ResponseWriter) {
	w.WriteHeader(http.StatusNoContent)
}