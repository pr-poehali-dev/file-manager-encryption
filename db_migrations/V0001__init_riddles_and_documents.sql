
CREATE TABLE IF NOT EXISTS t_p95298898_file_manager_encrypt.riddles (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO t_p95298898_file_manager_encrypt.riddles (question, answer) VALUES
('Чем больше берёшь — тем больше становится. Что это?', 'яма'),
('Всегда идёт, а с места не сдвигается. Что это?', 'время'),
('У меня есть города без домов, горы без деревьев, вода без рыбы. Что я такое?', 'карта'),
('Чем больше сохнет — тем мокрее. Что это?', 'полотенце'),
('Говорит без рта, слышит без ушей. Что это?', 'эхо'),
('Без окон, без дверей — полна горница людей. Что это?', 'огурец'),
('Что можно поймать, но нельзя увидеть?', 'простуда'),
('Днём спит, ночью летает и прохожих пугает. Что это?', 'летучая мышь');

CREATE TABLE IF NOT EXISTS t_p95298898_file_manager_encrypt.documents (
    id SERIAL PRIMARY KEY,
    folder_id VARCHAR(10) NOT NULL,
    name TEXT NOT NULL,
    encrypted_name TEXT NOT NULL,
    file_type VARCHAR(10) NOT NULL DEFAULT 'txt',
    s3_key TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
