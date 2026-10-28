// Command api is the small backend for nathancj.com. It serves live data for the
// site's terminal and can grow into more features later. Standard library only.
package main

import (
	"context"
	"encoding/json"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"runtime"
	"strings"
	"sync"
	"sync/atomic"
	"syscall"
	"time"
)

// version is set at build time: -ldflags "-X main.version=<git sha>".
var version = "dev"

type config struct {
	port           string
	allowedOrigins map[string]bool
	clientIPHeader string // e.g. "CF-Connecting-IP" when behind Cloudflare Tunnel; empty uses the socket address
	ratePerMinute  int
}

func loadConfig() config {
	origins := getenv("ALLOWED_ORIGINS", "https://nathancj.com,http://localhost:4321")
	allowed := map[string]bool{}
	for _, o := range strings.Split(origins, ",") {
		if o = strings.TrimSpace(o); o != "" {
			allowed[o] = true
		}
	}
	return config{
		port:           getenv("PORT", "8080"),
		allowedOrigins: allowed,
		clientIPHeader: os.Getenv("CLIENT_IP_HEADER"),
		ratePerMinute:  60,
	}
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

type server struct {
	cfg      config
	started  time.Time
	requests atomic.Int64
	limiter  *limiter
}

type statusResponse struct {
	Status        string `json:"status"`
	Version       string `json:"version"`
	StartedAt     string `json:"startedAt"`
	UptimeSeconds int64  `json:"uptimeSeconds"`
	GoVersion     string `json:"goVersion"`
	Requests      int64  `json:"requests"`
}

func (s *server) routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
	})
	mux.HandleFunc("GET /api/status", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, statusResponse{
			Status:        "ok",
			Version:       version,
			StartedAt:     s.started.UTC().Format(time.RFC3339),
			UptimeSeconds: int64(time.Since(s.started).Seconds()),
			GoVersion:     runtime.Version(),
			Requests:      s.requests.Load(),
		})
	})
	return s.middleware(mux)
}

// middleware adds security headers, CORS for allowed origins, request counting and rate limiting.
// It never logs client addresses.
func (s *server) middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("Cache-Control", "no-store")

		if origin := r.Header.Get("Origin"); origin != "" {
			if !s.cfg.allowedOrigins[origin] {
				http.Error(w, "origin not allowed", http.StatusForbidden)
				return
			}
			h.Set("Access-Control-Allow-Origin", origin)
			h.Set("Vary", "Origin")
			h.Set("Access-Control-Allow-Methods", "GET, OPTIONS")
			h.Set("Access-Control-Max-Age", "600")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		if !s.limiter.allow(s.clientIP(r)) {
			h.Set("Retry-After", "60")
			http.Error(w, "rate limit exceeded", http.StatusTooManyRequests)
			return
		}
		s.requests.Add(1)
		next.ServeHTTP(w, r)
	})
}

func (s *server) clientIP(r *http.Request) string {
	if s.cfg.clientIPHeader != "" {
		if v := strings.TrimSpace(strings.Split(r.Header.Get(s.cfg.clientIPHeader), ",")[0]); v != "" {
			return v
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

// limiter is a fixed-window per-key counter held in memory.
type limiter struct {
	mu     sync.Mutex
	limit  int
	window time.Duration
	hits   map[string]*bucket
}

type bucket struct {
	count int
	reset time.Time
}

func newLimiter(limit int, window time.Duration) *limiter {
	return &limiter{limit: limit, window: window, hits: map[string]*bucket{}}
}

func (l *limiter) allow(key string) bool {
	now := time.Now()
	l.mu.Lock()
	defer l.mu.Unlock()
	b, ok := l.hits[key]
	if !ok || now.After(b.reset) {
		l.hits[key] = &bucket{count: 1, reset: now.Add(l.window)}
		return true
	}
	b.count++
	return b.count <= l.limit
}

func (l *limiter) sweep() {
	now := time.Now()
	l.mu.Lock()
	defer l.mu.Unlock()
	for k, b := range l.hits {
		if now.After(b.reset) {
			delete(l.hits, k)
		}
	}
}

func main() {
	cfg := loadConfig()
	s := &server{cfg: cfg, started: time.Now(), limiter: newLimiter(cfg.ratePerMinute, time.Minute)}

	go func() {
		for range time.Tick(5 * time.Minute) {
			s.limiter.sweep()
		}
	}()

	srv := &http.Server{
		Addr:              ":" + cfg.port,
		Handler:           s.routes(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	go func() {
		log.Printf("api %s listening on :%s", version, cfg.port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()

	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = srv.Shutdown(shutdownCtx)
}
