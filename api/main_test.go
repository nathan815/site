package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func newTestServer(limit int) *server {
	return &server{
		cfg: config{
			allowedOrigins: map[string]bool{"https://nathancj.com": true},
		},
		started: time.Now().Add(-90 * time.Second),
		limiter: newLimiter(limit, time.Minute),
	}
}

func do(h http.Handler, method, path, origin string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, nil)
	req.RemoteAddr = "203.0.113.7:4242"
	if origin != "" {
		req.Header.Set("Origin", origin)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func TestHealth(t *testing.T) {
	rec := do(newTestServer(10).routes(), "GET", "/health", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("got %d", rec.Code)
	}
}

func TestStatus(t *testing.T) {
	rec := do(newTestServer(10).routes(), "GET", "/api/status", "https://nathancj.com")
	if rec.Code != http.StatusOK {
		t.Fatalf("got %d", rec.Code)
	}
	var got statusResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatal(err)
	}
	if got.Status != "ok" || got.UptimeSeconds < 90 {
		t.Fatalf("unexpected body: %+v", got)
	}
	if rec.Header().Get("Access-Control-Allow-Origin") != "https://nathancj.com" {
		t.Fatal("missing CORS header for allowed origin")
	}
}

func TestDisallowedOriginRejected(t *testing.T) {
	rec := do(newTestServer(10).routes(), "GET", "/api/status", "https://evil.example")
	if rec.Code != http.StatusForbidden {
		t.Fatalf("got %d", rec.Code)
	}
	if rec.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Fatal("CORS header leaked to a disallowed origin")
	}
}

func TestPreflight(t *testing.T) {
	rec := do(newTestServer(10).routes(), "OPTIONS", "/api/status", "https://nathancj.com")
	if rec.Code != http.StatusNoContent {
		t.Fatalf("got %d", rec.Code)
	}
}

func TestRateLimit(t *testing.T) {
	h := newTestServer(3).routes()
	for i := 0; i < 3; i++ {
		if rec := do(h, "GET", "/health", ""); rec.Code != http.StatusOK {
			t.Fatalf("request %d got %d", i, rec.Code)
		}
	}
	if rec := do(h, "GET", "/health", ""); rec.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429, got %d", rec.Code)
	}
}

func TestUnknownRouteAndMethod(t *testing.T) {
	h := newTestServer(10).routes()
	if rec := do(h, "GET", "/nope", ""); rec.Code != http.StatusNotFound {
		t.Fatalf("got %d", rec.Code)
	}
	if rec := do(h, "POST", "/api/status", ""); rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("got %d", rec.Code)
	}
}
