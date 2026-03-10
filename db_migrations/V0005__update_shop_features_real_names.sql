UPDATE shop_items SET features = '["Тёплый", "Холодный", "Сепия", "Ч/Б", "Негатив", "Ретро", "Кинематограф", "Блёклый", "Высокий контраст", "Мягкий свет"]'::jsonb WHERE slug = 'pack-color-luts';

UPDATE shop_items SET features = '["Зернистость", "Хроматическая аберрация", "Виньетка Pro", "Двойная экспозиция", "Глитч-наложение"]'::jsonb WHERE slug = 'pack-overlays';

UPDATE shop_items SET features = '["Глитч", "Вспышка", "Поворот", "Размытие перехода", "Пиксели", "Волна", "Наплыв", "Сжатие"]'::jsonb WHERE slug = 'pack-transitions-pro';

UPDATE shop_items SET features = '["Кинотитры", "Эпичный заголовок", "Финальные титры", "Выноска", "Цитата"]'::jsonb WHERE slug = 'pack-titles-cinematic';

UPDATE shop_items SET features = '["Строка имени", "Подпись докладчика", "Новостная плашка", "Локация"]'::jsonb WHERE slug = 'pack-lower-thirds';

UPDATE shop_items SET features = '["Свуш вверх", "Свуш вниз", "Удар", "Переход звука", "Клик кнопки", "Нотификация"]'::jsonb WHERE slug = 'pack-sound-fx';

UPDATE shop_items SET features = '["Корпоративный фон", "Эпик оркестр", "Лёгкий поп", "Акустическая гитара", "Электронный бит", "Пианино соло"]'::jsonb WHERE slug = 'pack-music-library';