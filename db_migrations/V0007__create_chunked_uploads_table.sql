CREATE TABLE IF NOT EXISTS chunked_uploads (
    upload_id VARCHAR(64) PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    file_name VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    total_chunks INTEGER NOT NULL DEFAULT 1,
    s3_key VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);