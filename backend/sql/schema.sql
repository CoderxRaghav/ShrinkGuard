CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE urls (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    original_url TEXT NOT NULL,
    short_code VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE click_events (
    id BIGSERIAL PRIMARY KEY,
    url_id INTEGER REFERENCES urls(id) ON DELETE CASCADE,
    clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_urls_short_code
ON urls(short_code);

CREATE INDEX idx_click_events_url_id
ON click_events(url_id);

CREATE INDEX idx_click_events_clicked_at
ON click_events(clicked_at);


-- What these tables represent
-- Table	               Purpose
-- users	               Stores users who create short URLs
-- urls	                   Stores original URL → short code mapping
-- click_events	           Stores every redirect/click for analytics