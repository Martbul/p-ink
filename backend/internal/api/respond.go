package api

import (
	"encoding/json"
	"net/http"
)

// JSON is a base helper that writes a JSON response with the given status code.
func JSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if data != nil {
		// We ignore the error here because if encoding fails, 
		// the header has already been written anyway. 
		// In a production app, you might want to log this error.
		_ = json.NewEncoder(w).Encode(data)
	}
}

// Error writes a JSON response containing an error message.
// Used like: Error(w, http.StatusBadRequest, "invalid JSON")
func Error(w http.ResponseWriter, status int, message string) {
	JSON(w, status, map[string]string{"error": message})
}

// OK writes a 200 OK JSON response.
// Used like: OK(w, map[string]any{"user": user})
func OK(w http.ResponseWriter, data any) {
	JSON(w, http.StatusOK, data)
}

// Created writes a 201 Created JSON response.
// Used like: Created(w, device)
func Created(w http.ResponseWriter, data any) {
	JSON(w, http.StatusCreated, data)
}

// NoContent writes a 204 No Content response.
// Used when a request is successful but there is no body to return.
func NoContent(w http.ResponseWriter) {
	w.WriteHeader(http.StatusNoContent)
}