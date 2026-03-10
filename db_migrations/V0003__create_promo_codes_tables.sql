
CREATE TABLE promo_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  discount_type VARCHAR(20) NOT NULL DEFAULT 'fixed',
  discount_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  min_purchase NUMERIC(12,2) NOT NULL DEFAULT 0,
  max_uses INTEGER DEFAULT NULL,
  used_count INTEGER NOT NULL DEFAULT 0,
  applies_to VARCHAR(50) NOT NULL DEFAULT 'all',
  item_ids TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE promo_usages (
  id SERIAL PRIMARY KEY,
  promo_id INTEGER NOT NULL REFERENCES promo_codes(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  used_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(promo_id, user_id)
);

CREATE INDEX idx_promo_codes_code ON promo_codes(code);
CREATE INDEX idx_promo_usages_user ON promo_usages(user_id);

INSERT INTO promo_codes (code, discount_type, discount_value, max_uses, applies_to) VALUES
('WELCOME50', 'percent', 50.00, NULL, 'all'),
('FREE100', 'fixed', 100.00, 100, 'all'),
('EFFECTS30', 'percent', 30.00, NULL, 'effects'),
('VIP2025', 'fixed', 500.00, 50, 'all');
