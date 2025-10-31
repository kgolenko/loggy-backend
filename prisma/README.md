# Prisma Migrations

Этот каталог содержит миграции базы данных для проекта Loggy.

## Структура

- `schema.prisma` - схема базы данных Prisma
- `migrations/` - история миграций
- `post-migration.sql` - SQL скрипт для дополнительных индексов и расширений

## Применение миграций

### 1. Применить Prisma миграции

```bash
# Применить все миграции
npx prisma migrate dev

# Или для продакшена
npx prisma migrate deploy
```

### 2. Применить дополнительные SQL скрипты

После применения Prisma миграций, выполните SQL скрипт с расширениями и дополнительными индексами:

```bash
# Через psql
psql $DATABASE_URL -f prisma/post-migration.sql

# Или через любой другой клиент PostgreSQL
```

**Важно:** Скрипт `post-migration.sql` должен выполняться после применения Prisma миграций, так как он создает дополнительные индексы для оптимизации производительности.

## Что делает post-migration.sql

1. **Расширения PostgreSQL:**
   - `pg_trgm` - для полнотекстового поиска (на будущее)
   - `btree_gin` - для GIN индексов на обычных типах

2. **Дополнительные индексы:**
   - GIN индекс для `tags` (массив тегов)
   - GIN индекс для `metadata` (JSONB)
   - Partial индекс для критичных логов (error, warn)

## Откат миграций

```bash
# Откатить последнюю миграцию
npx prisma migrate resolve --rolled-back 20251031214838_init

# Или создать новую миграцию для отката изменений
```

## Генерация Prisma Client

После изменений схемы:

```bash
npx prisma generate
```

## Полезные команды

```bash
# Посмотреть статус миграций
npx prisma migrate status

# Создать новую миграцию (не применять)
npx prisma migrate dev --create-only

# Применить миграции в продакшене
npx prisma migrate deploy

# Открыть Prisma Studio
npx prisma studio
```

