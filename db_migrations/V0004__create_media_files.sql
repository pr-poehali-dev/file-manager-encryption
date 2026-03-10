
CREATE TABLE media_files (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    project_id INTEGER REFERENCES projects(id),
    file_name VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    duration REAL NOT NULL DEFAULT 0,
    width INTEGER,
    height INTEGER,
    s3_key VARCHAR(1000) NOT NULL,
    cdn_url VARCHAR(1000) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_media_files_user ON media_files(user_id);
CREATE INDEX idx_media_files_project ON media_files(user_id, project_id);
