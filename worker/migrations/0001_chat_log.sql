-- One row per chat question: the question, the final answer and what happened.
CREATE TABLE IF NOT EXISTS chat_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  ts           TEXT    NOT NULL,            -- ISO 8601 UTC
  ip_hash      TEXT    NOT NULL,            -- sha256(ip + daily salt): same visitor on the same day only
  outcome      TEXT    NOT NULL,            -- ok | canned | rate_limited_minute | rate_limited_day | rate_limited_global | unavailable
  question     TEXT    NOT NULL,
  answer       TEXT,                        -- null when no answer was produced
  tools        TEXT,                        -- JSON array of tool names the model called
  asked_nathan INTEGER NOT NULL DEFAULT 0,  -- 1 when the "ask Nathan" offer was shown
  turns        INTEGER NOT NULL,            -- messages in the conversation sent with this question
  latency_ms   INTEGER,                     -- request start to the end of the streamed answer
  model        TEXT,
  error        TEXT
);
CREATE INDEX IF NOT EXISTS chat_log_ts ON chat_log (ts);
