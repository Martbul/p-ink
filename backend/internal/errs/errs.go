package errs

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"
)

// Kind classifies the error so HTTPResponse can pick the right HTTP status.
// Only kinds that actually occur in this API are defined here.
type Kind uint8

const (
	KindInternal     Kind = iota // DB errors, unexpected failures → 500
	KindInvalid                  // Bad request body / missing fields → 400
	KindUnauthorized             // Missing or invalid auth token → 401
	KindForbidden                // Authenticated but not allowed → 403
	KindNotFound                 // Row not found, couple not active → 404
	KindConflict                 // Already exists (couple, device, invite) → 409
)

// Op identifies where in the call stack the error originated.
// Convention: "package.FunctionName", e.g. "api.UpdateAppearance" or "db.GetTamagotchiByOwner"
type Op string

// Error is a structured error that carries an Op, a Kind, an optional
// underlying cause, and a safe user-facing message.
type Error struct {
	Op      Op
	Kind    Kind
	Err     error  // wrapped cause — printed in server logs, never sent to client
	Message string // safe to send to the frontend
}

// E builds an *Error from any combination of Op, Kind, error, string, *Error.
//
//	errs.E(op, errs.KindNotFound, err, "tamagotchi not found")
//	errs.E(op, errs.KindInvalid, "name is required")          // no underlying error
//	errs.E(op, errs.KindInternal, err)                        // generic 500, real cause logged
func E(args ...any) error {
	e := &Error{}
	for _, arg := range args {
		switch v := arg.(type) {
		case Op:
			e.Op = v
		case Kind:
			e.Kind = v
		case error:
			e.Err = v
		case string:
			e.Message = v
		case *Error:
			cp := *v
			e.Err = &cp
		}
	}
	return e
}

// Error returns the full chain for logging:
//
//	api.UpdateAppearance: failed to update appearance: ERROR: column "background" does not exist (SQLSTATE 42703)
func (e *Error) Error() string {
	var b strings.Builder
	if e.Op != "" {
		b.WriteString(string(e.Op))
	}
	if e.Message != "" {
		if b.Len() > 0 {
			b.WriteString(": ")
		}
		b.WriteString(e.Message)
	}
	if e.Err != nil {
		if b.Len() > 0 {
			b.WriteString(": ")
		}
		b.WriteString(e.Err.Error())
	}
	return b.String()
}

func (e *Error) Unwrap() error { return e.Err }

// HTTPResponse logs the full error chain and writes a safe JSON response.
func HTTPResponse(w http.ResponseWriter, err error) {
	slog.Error(err.Error())

	code := http.StatusInternalServerError
	msg := "internal server error"

	var e *Error
	if errors.As(err, &e) {
		code = kindToStatus(e.Kind)
		if e.Message != "" {
			msg = e.Message
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func kindToStatus(k Kind) int {
	switch k {
	case KindInvalid:
		return http.StatusBadRequest
	case KindUnauthorized:
		return http.StatusUnauthorized
	case KindForbidden:
		return http.StatusForbidden
	case KindNotFound:
		return http.StatusNotFound
	case KindConflict:
		return http.StatusConflict
	default: // KindInternal and anything unexpected
		return http.StatusInternalServerError
	}
}