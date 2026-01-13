-- CMart073 Database Schema
-- Migration: 0001_init

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    short_id TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    status TEXT NOT NULL DEFAULT 'pending',
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    shipping_address TEXT NOT NULL,
    preferred_contact_method TEXT NOT NULL DEFAULT 'email',
    service_type TEXT NOT NULL,
    club_count INTEGER,
    current_paint_condition TEXT,
    paint_style TEXT,
    primary_color TEXT,
    secondary_color TEXT,
    notes TEXT,
    grip_service TEXT NOT NULL DEFAULT 'none',
    grip_count INTEGER,
    grip_model TEXT,
    grip_size TEXT,
    extra_wraps INTEGER DEFAULT 0,
    est_price_min INTEGER NOT NULL,
    est_price_max INTEGER NOT NULL,
    quoted_price INTEGER,
    admin_notes TEXT
);

-- Order uploads table
CREATE TABLE IF NOT EXISTS order_uploads (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    r2_key TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_orders_short_id ON orders(short_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_uploads_order_id ON order_uploads(order_id);
