-- Таблица рекордов: участники и успешные заказы
CREATE TABLE t_p95298898_file_manager_encrypt.records (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    successful_orders INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Таблица территорий
CREATE TABLE t_p95298898_file_manager_encrypt.territories (
    id SERIAL PRIMARY KEY,
    territory_number INTEGER NOT NULL UNIQUE,
    territory_name TEXT NOT NULL,
    owner TEXT NOT NULL DEFAULT 'Пусто' CHECK (owner IN ('Каморра', 'Русска Рома', 'Триады', 'Бездомные', 'Пусто')),
    control_level INTEGER NOT NULL DEFAULT 0 CHECK (control_level >= 0 AND control_level <= 5),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Архив заказов
CREATE TABLE t_p95298898_file_manager_encrypt.order_archive (
    id SERIAL PRIMARY KEY,
    order_number TEXT NOT NULL,
    executor_id INTEGER REFERENCES t_p95298898_file_manager_encrypt.records(id),
    closed_at DATE NOT NULL,
    reward INTEGER NOT NULL DEFAULT 0,
    confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    location_territory INTEGER REFERENCES t_p95298898_file_manager_encrypt.territories(territory_number),
    cleanup_code_used TEXT,
    code_valid BOOLEAN,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Одноразовые коды уборки (скрытая база, заполняется только администратором)
CREATE TABLE t_p95298898_file_manager_encrypt.cleanup_codes (
    id SERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);