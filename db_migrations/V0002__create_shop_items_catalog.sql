
CREATE TABLE shop_items (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  category VARCHAR(50) NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  icon VARCHAR(50) DEFAULT '',
  preview_url TEXT DEFAULT '',
  features JSONB DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shop_items_category ON shop_items(category);

INSERT INTO shop_items (slug, name, description, category, price, icon, features, sort_order) VALUES
('pack-transitions-pro', 'Переходы Pro', '50+ профессиональных переходов: глитч, киноплёнка, чернила, оригами и другие', 'transitions', 299, 'Sparkles', '["50+ переходов","Глитч-эффекты","Киноплёнка","Настраиваемые параметры"]', 1),
('pack-titles-cinematic', 'Кинематографические титры', 'Анимированные заголовки в стиле голливудских фильмов', 'titles', 199, 'Type', '["20 шаблонов","Анимация входа/выхода","Настройка шрифтов","4K совместимость"]', 2),
('pack-color-luts', 'Набор LUT-фильтров', '100 цветовых профилей для кинематографичной картинки', 'effects', 349, 'Palette', '["100 LUT-фильтров","Кино стили","Ретро и винтаж","Предпросмотр в реальном времени"]', 3),
('pack-music-library', 'Музыкальная библиотека', '200 royalty-free треков для любых проектов', 'audio', 499, 'Music', '["200 треков","Без авторских отчислений","Разные жанры","Лупы и сэмплы"]', 4),
('pack-lower-thirds', 'Нижние третья', '30 анимированных плашек для интервью и новостей', 'titles', 149, 'PanelBottom', '["30 шаблонов","Анимированные","Настройка цветов","Социальные сети"]', 5),
('pack-sound-fx', 'Звуковые эффекты', '500+ звуковых эффектов: свуши, удары, фоны', 'audio', 249, 'Volume2', '["500+ звуков","Свуши и удары","Фоновые текстуры","Кнопки и UI звуки"]', 6),
('pack-overlays', 'Оверлеи и текстуры', 'Частицы, свет, боке, дым, огонь', 'effects', 279, 'Layers', '["Частицы","Световые утечки","Боке","Дым и огонь"]', 7),
('pack-social-media', 'Шаблоны для соцсетей', 'Готовые шаблоны для Reels, TikTok, YouTube Shorts', 'templates', 179, 'Share2', '["Вертикальный формат","Stories шаблоны","Анимированные","Адаптивные"]', 8),
('feature-4k-export', 'Экспорт 4K', 'Возможность экспорта видео в 4K разрешении', 'features', 599, 'Monitor', '["4K (3840x2160)","H.265 кодек","HDR поддержка","Быстрый рендер"]', 9),
('feature-ai-subtitles', 'AI Субтитры', 'Автоматическая генерация субтитров с помощью ИИ', 'features', 399, 'MessageSquare', '["Авто-распознавание","15 языков","Стилизация","Экспорт SRT"]', 10),
('feature-green-screen', 'Хромакей Pro', 'Продвинутое удаление фона с тонкой настройкой', 'features', 349, 'Eraser', '["Зелёный/синий экран","Тонкая настройка","Перо краёв","Реалтайм"]', 11),
('feature-speed-ramp', 'Скоростные рампы', 'Плавное изменение скорости с помощью кривых', 'features', 199, 'Gauge', '["Кривые скорости","Плавные переходы","Покадровый контроль","Пресеты"]', 12);
