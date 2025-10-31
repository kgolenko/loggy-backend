# PostgreSQL Настройка для Loggy

## Обязательные расширения

### 1. pg_trgm (для полнотекстового поиска)
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```
**Назначение:** Триграммы для полнотекстового поиска по сообщениям логов (если понадобится в будущем)

### 2. btree_gin (для индексов GIN)
```sql
CREATE EXTENSION IF NOT EXISTS btree_gin;
```
**Назначение:** Позволяет создавать GIN индексы на обычных типах данных (ускоряет запросы с фильтрами)

## Рекомендуемые настройки PostgreSQL

### postgresql.conf или через ALTER SYSTEM

```sql
-- Память для операций сортировки и хэш-таблиц (для сложных запросов с JSONB)
SET work_mem = '256MB';

-- Память для операций обслуживания (VACUUM, CREATE INDEX)
SET maintenance_work_mem = '1GB';

-- Размер общей памяти для буферного кеша (25% от RAM)
SET shared_buffers = '4GB';  -- адаптировать под размер сервера

-- Размер памяти, доступной для кеширования (75% от RAM)
SET effective_cache_size = '12GB';  -- адаптировать под размер сервера

-- Максимальное количество одновременных соединений
SET max_connections = 200;

-- Включить логирование медленных запросов (> 1 секунды)
SET log_min_duration_statement = 1000;

-- Включить логирование планировщика для оптимизации
SET log_query_plan = on;
```

### Настройки для работы с большими объемами данных

```sql
-- Увеличить checkpoint_segments для уменьшения нагрузки при записи
SET checkpoint_completion_target = 0.9;

-- Автоматический VACUUM для поддержания производительности
SET autovacuum = on;
SET autovacuum_max_workers = 3;
SET autovacuum_naptime = '10s';
```

## Индексы для таблицы logs

После создания таблицы через Prisma миграции, выполните следующие SQL команды:

**Важно:** Рекомендуется использовать готовый скрипт `prisma/post-migration.sql` вместо ручного выполнения команд.

```sql
-- Composite индекс по projectId и timestamp (для большинства запросов)
CREATE INDEX idx_logs_project_timestamp ON logs(project_id, timestamp DESC);

-- Partial индекс по уровню (только для error и warn - чаще запрашиваемых)
CREATE INDEX idx_logs_level_critical ON logs(level) 
WHERE level IN ('error', 'warn');

-- GIN индекс для tags (быстрый поиск по массиву тегов)
CREATE INDEX idx_logs_tags_gin ON logs USING GIN(tags);

-- GIN индекс для metadata JSONB (поиск по полям metadata с jsonb_path_ops)
-- jsonb_path_ops - оптимизирован для операторов @> и @?
CREATE INDEX idx_logs_metadata_gin ON logs USING GIN(metadata jsonb_path_ops);

-- Индекс для автоматической очистки старых логов
CREATE INDEX idx_logs_timestamp_cleanup ON logs(timestamp) 
WHERE timestamp < NOW() - INTERVAL '30 days';

-- Индекс для фильтрации по timestamp (для range запросов)
CREATE INDEX idx_logs_timestamp ON logs(timestamp DESC);
```

## Оптимизация JSONB запросов

### Примеры запросов с использованием индексов

```sql
-- Поиск по уровню и проекту (использует composite индекс)
SELECT * FROM logs 
WHERE project_id = 'xxx' 
  AND level = 'error'
ORDER BY timestamp DESC 
LIMIT 100;

-- Поиск по тегам (использует GIN индекс)
SELECT * FROM logs 
WHERE project_id = 'xxx' 
  AND tags @> ARRAY['payment', 'critical'];

-- Поиск по metadata (использует GIN индекс с jsonb_path_ops)
SELECT * FROM logs 
WHERE project_id = 'xxx' 
  AND metadata @> '{"service": "payment-service"}'::jsonb;

-- Поиск по вложенным полям metadata
SELECT * FROM logs 
WHERE project_id = 'xxx' 
  AND metadata->>'service' = 'payment-service';

-- Комбинированный поиск
SELECT * FROM logs 
WHERE project_id = 'xxx' 
  AND level IN ('error', 'warn')
  AND tags @> ARRAY['payment']
  AND metadata @> '{"environment": "production"}'::jsonb
ORDER BY timestamp DESC;
```

## Партиционирование (для масштабирования)

Если объемы логов вырастут до миллионов записей в день, рекомендуется партиционирование:

```sql
-- Пример партиционирования по месяцам (выполнять после MVP)
-- Удалить старую таблицу и создать партиционированную

-- 1. Создать партиционированную таблицу
CREATE TABLE logs_partitioned (
  LIKE logs INCLUDING ALL
) PARTITION BY RANGE (timestamp);

-- 2. Создать партиции по месяцам
CREATE TABLE logs_2024_01 PARTITION OF logs_partitioned
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE logs_2024_02 PARTITION OF logs_partitioned
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- 3. Автоматическое создание партиций (через NestJS Scheduler)
```

## Мониторинг производительности

```sql
-- Проверить размер таблицы
SELECT 
  pg_size_pretty(pg_total_relation_size('logs')) as total_size,
  pg_size_pretty(pg_relation_size('logs')) as table_size,
  pg_size_pretty(pg_indexes_size('logs')) as indexes_size;

-- Проверить использование индексов
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename = 'logs'
ORDER BY idx_scan DESC;

-- Найти медленные запросы
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE query LIKE '%logs%'
ORDER BY total_time DESC
LIMIT 10;
```

## Автоматическая очистка старых логов

**Реализация:** Через NestJS Scheduler (@nestjs/schedule)

Все CRON задачи реализованы через код в NestJS, не через SQL функции или pg_cron extension.

**Подробная документация:** См. [SCHEDULER_SETUP.md](./SCHEDULER_SETUP.md)

**Краткое описание:**
- Используется `@nestjs/schedule` для планирования задач
- Задача `CleanupLogsTask` с декоратором `@Cron(CronExpression.EVERY_DAY_AT_2AM)`
- Batch удаление логов через `LogRepository.deleteOldLogs()`
- Вся логика в TypeScript коде, легко тестировать и поддерживать

## Резюме

**Минимально необходимые действия:**
1. ✅ Создать расширения: `pg_trgm`, `btree_gin`
2. ✅ Создать индексы после миграций Prisma
3. ✅ Настроить автоматическую очистку через NestJS Scheduler

**Для продакшена:**
- Настроить параметры `work_mem`, `shared_buffers`, `effective_cache_size`
- Включить мониторинг медленных запросов
- Рассмотреть партиционирование при росте данных
