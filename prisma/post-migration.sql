-- ============================================================
-- PostgreSQL Setup Script для Loggy
-- Выполнить ПОСЛЕ применения Prisma миграции
-- ============================================================

-- ============================================================
-- 1. Создание обязательных расширений
-- ============================================================

-- pg_trgm: для полнотекстового поиска по сообщениям логов (если понадобится в будущем)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- btree_gin: для создания GIN индексов на обычных типах данных
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- ============================================================
-- 2. Дополнительные индексы для таблицы logs
-- (Базовые индексы уже созданы через Prisma)
-- ============================================================

-- GIN индекс для tags (быстрый поиск по массиву тегов)
-- Используется для фильтрации: WHERE tags @> ARRAY['tag1', 'tag2']
CREATE INDEX IF NOT EXISTS idx_logs_tags_gin 
ON logs USING GIN(tags);

-- GIN индекс для metadata JSONB (поиск по полям metadata)
-- jsonb_path_ops - оптимизирован для операторов @> и @?
-- Используется для фильтрации: WHERE metadata @> '{"service": "payment"}'::jsonb
CREATE INDEX IF NOT EXISTS idx_logs_metadata_gin 
ON logs USING GIN(metadata jsonb_path_ops);

-- Partial индекс для критичных уровней логов (error, warn)
-- Ускоряет запросы по критичным логам, которые чаще всего запрашиваются
CREATE INDEX IF NOT EXISTS idx_logs_level_critical 
ON logs(project_id, level, timestamp DESC) 
WHERE level IN ('error', 'warn');

-- ============================================================
-- 3. Комментарии для документации
-- ============================================================

COMMENT ON TABLE logs IS 'Таблица для хранения логов приложений';
COMMENT ON COLUMN logs.metadata IS 'JSONB поле для метаданных (service, hostname, request, user и т.д.)';
COMMENT ON COLUMN logs.tags IS 'Массив тегов для категоризации логов';
COMMENT ON INDEX idx_logs_tags_gin IS 'GIN индекс для быстрого поиска по тегам';
COMMENT ON INDEX idx_logs_metadata_gin IS 'GIN индекс для быстрого поиска по JSONB метаданным';
COMMENT ON INDEX idx_logs_level_critical IS 'Partial индекс для критичных логов (error, warn)';

-- ============================================================
-- 4. Проверка создания индексов
-- ============================================================

-- Раскомментировать для проверки:
-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   indexdef
-- FROM pg_indexes
-- WHERE tablename = 'logs'
-- ORDER BY indexname;

