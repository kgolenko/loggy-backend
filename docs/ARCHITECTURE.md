# Архитектура Loggy - Система управления логами

## 📋 Техническое задание

### Описание проекта
Loggy - это система для централизованного сбора, хранения и просмотра логов в реальном времени. Аналог Logtail с фокусом на реалтайм логи и историю.

### Основные требования

#### 1. Функционал
- ✅ **Реалтайм логи** - просмотр логов в реальном времени
- ✅ **История логов** - хранение и просмотр истории
- ✅ **Фильтрация логов** - по различным критериям
- ✅ **Проекты** - разделение логов по проектам
- ✅ **Авторизация через TOKEN** - уникальный токен для каждого проекта
- ✅ **Middleware для Winston** - пересылка логов из приложений

#### 2. Масштабирование
- Подключение 5-6 приложений
- Каждое приложение может отправлять логи в один или несколько проектов

#### 3. Архитектура сбора логов
- Приложения используют Winston транспорты
- Middleware перехватывает логи и отправляет их на бэкенд
- Авторизация через проект TOKEN

---

## ✅ Ответы на вопросы

### Хранение данных
1. **Объемы логов:** ~100–500 логов в секунду (LPS)
   - **Выбор:** PostgreSQL (достаточно для таких объемов)
   - За день: ~8.6M - 43M логов
   - За 30 дней: ~260M - 1.3B логов

2. **Retention Policy**
   - Хранение: **30 дней**
   - Автоматическая очистка: **Да** (после 30 дней)
   - Единая политика для всех проектов

### Фильтрация и поиск
3. **Фильтры:**
   - ✅ По уровню логов
   - ✅ По дате/времени
   - ✅ По тегам
   - ✅ По метаданным
   - ⏸️ Full-text search по сообщению (не в MVP)

4. **Уровни логирования**
   - **Уровни:** error, warn, info, debug, verbose
   - Кастомная градация: не нужна

### Реалтайм
5. **Технология:** WebSocket (Socket.IO)

6. **Область реалтайм подписки** (требует уточнения)
   
   **Что это значит:**
   - Когда клиент подключается к WebSocket, нужно выбрать:
     - Подписываться на ВСЕ логи проекта (проще, больше трафика)
     - Подписываться с фильтрами (например, только error/warn, или только определенные теги)
   
   **Примеры:**
   ```javascript
   // Вариант 1: Подписка на все логи проекта
   socket.emit('subscribe', { projectId: 'abc-123' });
   
   // Вариант 2: Подписка с фильтрами
   socket.emit('subscribe', { 
     projectId: 'abc-123',
     filters: {
       level: ['error', 'warn'],
       tags: ['payment', 'critical']
     }
   });
   ```
   
   **Вопрос:** Нужны ли фильтры в реалтайм подписке, или просто показывать все логи проекта?

### Формат логов
7. **Структура логов** (требует уточнения)
   
   **Предлагаемая структура:**
   ```json
   {
     "level": "error",
     "message": "User not found",
     "timestamp": "2024-01-01T12:00:00Z",
     "service": "user-service",
     "tags": ["payment", "critical"],
     "metadata": {
       "hostname": "server-01",
       "environment": "production",
       "version": "1.2.3",
       "userId": "123",
       "requestId": "abc-123",
       "ip": "192.168.1.1",
       "userAgent": "Mozilla/5.0..."
     }
   }
   ```
   
   **Вопросы:**
   - Обязательные поля: `level`, `message`, `timestamp`, `projectToken` - достаточно?
   - Откуда будут приходить `tags`? (из Winston metadata или отдельное поле?)
   - Какие конкретно метаданные собирать? (hostname, environment, version, requestId, userId, ip, userAgent, etc.)
   - Нужна ли поддержка вложенных объектов в metadata?

### Проекты и авторизация
8. **Структура проекта**
   - ✅ **Кто может создавать:** Любой зарегистрированный пользователь
   - ✅ **Доступ:** Пользователь видит только свои проекты
   - ✅ **Количество:** Неограниченно (N проектов на пользователя)
   - ⏸️ Управление участниками проекта: не в MVP

9. **TOKEN авторизация**
   - **Формат:** UUID
   - **Права:** Только запись логов (write-only для приложений)
   - Ротация токенов: не в MVP
   - Ограничения по IP/домену: не в MVP

### Middleware и интеграция
10. **Winston Transport**
    - ✅ **Отдельный npm пакет** (в будущем)
    - Пока: встроенный endpoint для приема логов
    - Буферизация при недоступности: не в MVP (можно добавить позже)

11. **Метаданные**
    - ✅ Собирать **как можно больше** метаданных
    - Конкретный список требует уточнения (см. раздел "Формат логов")

### Дополнительные функции
12. **Алерты и уведомления:** ❌ Не нужны

13. **Статистика и аналитика:** ❌ Не нужны

14. **API**
    - ✅ REST API для получения логов (с фильтрацией)
    - GraphQL: не в MVP
    - Экспорт логов: не в MVP

---

## 🏗️ Предварительная архитектура

### Компоненты системы

```
┌─────────────────┐
│   Приложение 1  │──┐
│   (Winston)     │  │
└─────────────────┘  │
                     │
┌─────────────────┐  │    ┌──────────────────┐
│   Приложение 2  │──┼───▶│   API Gateway    │
│   (Winston)     │  │    │  (Auth Middleware)│
└─────────────────┘  │    └────────┬─────────┘
                     │             │
┌─────────────────┐  │             │
│   Приложение N  │──┘             │
│   (Winston)     │                │
└─────────────────┘                │
                                   ▼
                        ┌─────────────────────┐
                        │   Loggy Backend     │
                        │                     │
                        │  ┌──────────────┐  │
                        │  │  Projects    │  │
                        │  │  Management  │  │
                        │  └──────────────┘  │
                        │                     │
                        │  ┌──────────────┐  │
                        │  │  Logs        │  │
                        │  │  Storage     │  │
                        │  └──────────────┘  │
                        │                     │
                        │  ┌──────────────┐  │
                        │  │  Realtime    │  │
                        │  │  WebSocket   │  │
                        │  └──────────────┘  │
                        └──────────┬──────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
            ┌───────────┐  ┌───────────┐  ┌───────────┐
            │PostgreSQL │  │  Storage  │  │  Frontend  │
            │(Projects, │  │  (Logs)   │  │  (React?)  │
            │ Tokens)   │  │           │  │            │
            └───────────┘  └───────────┘  └───────────┘
```

### Модули NestJS

1. **Projects Module**
   - Создание/удаление проектов
   - Генерация токенов
   - Управление участниками (если нужно)

2. **Logs Module**
   - Прием логов через API
   - Сохранение в хранилище
   - Запросы с фильтрацией

3. **Realtime Module**
   - WebSocket соединения
   - Подписки на логи проекта
   - Фильтрация в реальном времени

4. **Auth Module** (уже есть)
   - Аутентификация пользователей
   - + Token авторизация для проектов

5. **Middleware Module**
   - Winston transport для интеграции

### Структура данных

#### Project (PostgreSQL)
```prisma
model Project {
  id          String   @id @default(uuid())
  name        String
  description String?
  token       String   @unique
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  userId      String   // создатель проекта
  logs        Log[]
}
```

#### Log (Хранилище логов - зависит от выбора)
```typescript
interface Log {
  id: string;
  projectId: string;
  level: 'error' | 'warn' | 'info' | 'debug' | 'verbose';
  message: string;
  timestamp: Date;
  service?: string;
  metadata?: Record<string, any>;
  tags?: string[];
  hostname?: string;
  environment?: string;
}
```

---

## ✅ Финальные решения

### 1. Реалтайм подписка с фильтрами

**Решение:** ✅ Фильтры нужны в MVP

**Реализация:**
- Клиент может подписаться с фильтрами или без (все логи)
- Фильтры: по level, tags, metadata
- Сервер фильтрует логи перед отправкой клиенту
- Можно несколько подписок с разными фильтрами

**Пример подписки:**
```javascript
// Все логи проекта
socket.emit('subscribe', { projectId: 'abc-123' });

// Только error и warn
socket.emit('subscribe', { 
  projectId: 'abc-123',
  filters: { level: ['error', 'warn'] }
});

// По тегам и уровню
socket.emit('subscribe', { 
  projectId: 'abc-123',
  filters: { 
    level: ['error'],
    tags: ['payment', 'critical']
  }
});

// По metadata
socket.emit('subscribe', { 
  projectId: 'abc-123',
  filters: { 
    metadata: { service: 'payment-service' }
  }
});
```

### 2. Структура логов

**Обязательные поля:**
- `level` - уровень лога (error, warn, info, debug, verbose)
- `message` - текст сообщения
- `timestamp` - время создания (ISO 8601)
- `projectToken` - токен проекта (для авторизации)

**Откуда приходят данные:**
- `tags` - из Winston metadata (массив строк)
- `service` - в metadata.service (опционально, для микросервисов)
- Все остальное - из Winston metadata как вложенные объекты

**Формат metadata:** Вложенные объекты (поддержка любой структуры)

### 3. Разделение по сервисам/приложениям

**Уточнение:** 
- **1 проект в Loggy = 1 приложение** ✅
- Если внутри приложения есть **микросервисы** (user-service, payment-service и т.д.), то `service` хранится в `metadata.service`

**Реализация:**
- `service` не обязательное поле
- Хранится в `metadata.service` (не отдельной колонкой)
- Можно фильтровать по `metadata.service` при запросах

**Пример:**
```json
{
  "level": "error",
  "message": "Payment failed",
  "timestamp": "2024-01-01T12:00:00Z",
  "projectToken": "uuid-token",
  "metadata": {
    "service": "payment-service",  // для микросервисов
    "hostname": "server-01",
    "environment": "production",
    "version": "1.2.3",
    "request": {
      "id": "req-123",
      "method": "POST",
      "path": "/api/payment"
    },
    "user": {
      "id": "user-123",
      "email": "user@example.com"
    }
  },
  "tags": ["payment", "critical", "retry"]
}
```

---

## 📊 Финальная структура данных

### Prisma Schema

```prisma
model User {
  id        String    @id @default(uuid())
  email     String    @unique
  password  String
  isActive  Boolean   @default(true)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  projects  Project[]
  refreshTokens RefreshToken[]
  
  @@map("users")
}

model Project {
  id          String   @id @default(uuid())
  name        String
  description String?
  token       String   @unique @default(uuid()) // UUID токен для авторизации
  userId      String   // владелец проекта
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  logs        Log[]
  
  @@map("projects")
  @@index([userId])
  @@index([token])
}

model Log {
  id          String   @id @default(uuid())
  projectId   String
  level       LogLevel
  message     String   @db.Text
  timestamp   DateTime @default(now())
  metadata    Json?    // вложенные объекты
  tags        String[] // массив тегов
  
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  @@map("logs")
  @@index([projectId, timestamp])
  @@index([projectId, level])
  @@index([timestamp]) // для автоматической очистки
}

enum LogLevel {
  error
  warn
  info
  debug
  verbose
}
```

### TypeScript Interfaces

```typescript
// DTO для приема логов
export interface CreateLogDto {
  level: 'error' | 'warn' | 'info' | 'debug' | 'verbose';
  message: string;
  timestamp?: string; // ISO 8601, опционально (используется текущее время)
  metadata?: Record<string, any>; // вложенные объекты
  tags?: string[]; // из Winston metadata
}

// Модель лога в БД
export interface Log {
  id: string;
  projectId: string;
  level: LogLevel;
  message: string;
  timestamp: Date;
  metadata: Record<string, any> | null;
  tags: string[];
}

// Фильтры для запросов (REST API)
export interface LogFilters {
  level?: LogLevel[];
  tags?: string[];
  metadata?: Record<string, any>; // фильтр по полям metadata
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

// Фильтры для WebSocket подписки
export interface RealtimeFilters {
  level?: LogLevel[];
  tags?: string[];
  metadata?: Record<string, any>;
}
```

---

## 🔌 API Endpoints

### Projects API

```
POST   /api/v1/projects           - Создать проект (требует JWT auth)
GET    /api/v1/projects           - Список проектов пользователя
GET    /api/v1/projects/:id       - Детали проекта
PUT    /api/v1/projects/:id       - Обновить проект
DELETE /api/v1/projects/:id       - Удалить проект
POST   /api/v1/projects/:id/token - Регенерировать токен
```

### Logs API

```
POST   /api/v1/logs                           - Принять лог (авторизация по projectToken)
GET    /api/v1/projects/:projectId/logs       - Получить логи с фильтрами (JWT auth)
GET    /api/v1/projects/:projectId/logs/:id   - Получить конкретный лог (JWT auth)
```

**Авторизация:**
- `POST /api/v1/logs` - через header `X-Project-Token: <uuid>`
- `GET /api/v1/projects/:projectId/logs` - через JWT (проверка владения проектом)

### WebSocket

```
Подключение: ws://host/api/v1/realtime?token=<jwt>

События (клиент -> сервер):
- subscribe - подписка на логи проекта с фильтрами
  {
    projectId: string,
    filters?: {
      level?: LogLevel[],
      tags?: string[],
      metadata?: Record<string, any>
    }
  }
- unsubscribe - отписка от проекта
  { projectId: string }
- ping - проверка соединения

События (сервер -> клиент):
- log:new - новое сообщение о логе (только если проходит фильтры)
- pong - ответ на ping
- error - ошибка (неверный проект, нет доступа и т.д.)
```

---

## 🏗️ Модули NestJS

### 1. Projects Module
```
domain/projects/
  ├── projects.module.ts
  ├── projects.controller.ts
  ├── projects.service.ts
  ├── dto/
  │   ├── create-project.dto.ts
  │   └── update-project.dto.ts
  └── repositories/
      └── project.repository.ts
```

### 2. Logs Module
```
domain/logs/
  ├── logs.module.ts
  ├── logs.controller.ts
  ├── logs.service.ts
  ├── dto/
  │   ├── create-log.dto.ts
  │   └── log-filters.dto.ts
  ├── guards/
  │   └── project-token.guard.ts
  └── repositories/
      └── log.repository.ts
```

### 3. Realtime Module
```
domain/realtime/
  ├── realtime.module.ts
  ├── realtime.gateway.ts (Socket.IO Gateway)
  ├── realtime.service.ts
  └── interfaces/
      └── subscription.interface.ts
```

### 4. Scheduled Tasks (для очистки)
```
shared/scheduler/
  ├── scheduler.module.ts
  └── tasks/
      └── cleanup-logs.task.ts
```

**Реализация:** Через @nestjs/schedule (все CRON задачи в коде, не SQL)
См. [docs/SCHEDULER_SETUP.md](./SCHEDULER_SETUP.md)

---

## 🔒 Race Conditions

Подробный анализ потенциальных race conditions и их решений описан в отдельном документе:
**См. [docs/RACE_CONDITIONS.md](./RACE_CONDITIONS.md)**

### Краткое резюме:
- ✅ **Критичные:** Проверка доступа, удаление проекта, фильтры WebSocket
- ⚠️ **Важные:** Регенерация токена, очистка логов
- 💡 **Опциональные:** Idempotency keys, optimistic locking

**Основные решения:**
- Транзакции для атомарных операций
- Graceful shutdown для WebSocket
- Валидация на каждом этапе
- Batch operations для очистки

---

## 📝 Следующие шаги

1. ✅ Получить ответы на уточняющие вопросы
2. ✅ Финальная структура данных
3. ✅ API endpoints спроектированы
4. ✅ Race conditions проанализированы
5. ⏳ Создать Prisma схему
6. ⏳ Реализовать Projects Module
7. ⏳ Реализовать Logs Module
8. ⏳ Реализовать Realtime Module
9. ⏳ Добавить scheduled task для очистки логов

---

## 💡 Рекомендации

### Хранилище логов
**PostgreSQL для MVP (5-6 приложений, 100-500 LPS)**
- Уже используется в проекте
- Достаточно для средних объемов
- Индексы по timestamp, level, projectId
- JSONB для metadata (быстрые запросы, индексы)
- Массивы для tags (индексы GIN)

**Для масштабирования (больше приложений/логов):**
- Partitioning по датам для логов (table partitioning)
- ClickHouse для аналитики (опционально в будущем)

### PostgreSQL Расширения и настройки

**Обязательные расширения:**
1. **pg_trgm** - для полнотекстового поиска (если понадобится)
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_trgm;
   ```

2. **btree_gin** - для индексов GIN на простых типах
   ```sql
   CREATE EXTENSION IF NOT EXISTS btree_gin;
   ```

**Рекомендуемые настройки:**
- `work_mem` - увеличить для сложных запросов с JSONB
- `maintenance_work_mem` - для создания индексов
- `shared_buffers` - оптимально для размера БД
- `effective_cache_size` - для планировщика запросов

**Индексы:**
```sql
-- Индекс по projectId и timestamp (composite для запросов с фильтрами)
CREATE INDEX idx_logs_project_timestamp ON logs(project_id, timestamp DESC);

-- Индекс по уровню (для фильтрации)
CREATE INDEX idx_logs_level ON logs(level) WHERE level IN ('error', 'warn');

-- GIN индекс для tags (быстрый поиск по массиву)
CREATE INDEX idx_logs_tags ON logs USING GIN(tags);

-- GIN индекс для metadata JSONB (поиск по полям metadata)
CREATE INDEX idx_logs_metadata ON logs USING GIN(metadata jsonb_path_ops);

-- Индекс для автоматической очистки старых логов
CREATE INDEX idx_logs_timestamp_cleanup ON logs(timestamp) WHERE timestamp < NOW() - INTERVAL '30 days';
```

**Оптимизация:**
- Использовать JSONB вместо JSON (быстрее, индексы)
- Партиционирование таблицы logs по датам (для больших объемов)
- Partial indexes для часто используемых фильтров

### Реалтайм
**WebSocket (Socket.IO)**
- Низкая латентность
- Двустороннее общение
- Автоматический fallback на polling при проблемах с WebSocket
- Фильтрация на сервере перед отправкой
- Масштабируется через Redis adapter (для горизонтального масштабирования)
- Простота использования и отличная документация

**Реализация с Socket.IO в NestJS:**
- Использовать `@nestjs/platform-socket.io`
- Gateway для обработки WebSocket соединений
- Redis adapter для масштабирования (опционально)

**Реализация фильтров:**
- Фильтрация на уровне сервера при получении нового лога
- Кеширование активных подписок
- Группировка подписок по проекту для эффективности
- Использование Socket.IO rooms для группировки клиентов по проектам

### Фильтрация
- Индексы на часто используемых полях (level, tags, timestamp)
- JSONB индексы для metadata
- Пагинация для больших выборок (cursor-based для реалтайм)
- Оптимизация запросов (EXPLAIN ANALYZE)
- Materialized views для часто запрашиваемых данных (опционально)

