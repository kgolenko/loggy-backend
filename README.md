# Loggy Backend

Loggy - это система для централизованного сбора, хранения и realtime просмотра логов приложений. Аналог Logtail с акцентом на realtime функционал и простоту интеграции.

## 🚀 Основные возможности

- ✅ **Аутентификация** - Email/password с JWT и refresh tokens
- ✅ **Управление проектами** - Создание проектов с уникальными токенами для авторизации
- ✅ **Прием и хранение логов** - REST API для отправки логов из приложений
- ✅ **Realtime просмотр логов** - WebSocket (Socket.IO) для realtime потока логов с фильтрацией
- ✅ **Исторический просмотр** - REST API для получения истории логов с фильтрацией
- ✅ **Автоматическая очистка** - CRON задача для удаления старых логов (30 дней)
- ✅ **Фильтрация** - По уровню, датам, тегам и метаданным

## 📋 Технологический стек

- **Framework:** NestJS
- **Database:** PostgreSQL + Prisma ORM
- **Realtime:** Socket.IO
- **Authentication:** JWT (access + refresh tokens)
- **Scheduling:** @nestjs/schedule для CRON задач

## 🏗️ Архитектура

Проект использует модульную архитектуру NestJS:

```
src/
├── common/          # Общие модули (Auth, Database)
├── domain/          # Бизнес-логика
│   ├── projects/    # Управление проектами
│   ├── logs/        # Логи: прием, хранение, CRON очистка
│   └── realtime/    # WebSocket для realtime логов
├── shared/          # Утилиты, константы, interceptors
└── providers/       # Провайдеры модулей
```

**Подробная архитектура:** [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)

## 🚦 Быстрый старт

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка окружения

Создайте файл `.env` в корне проекта:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/loggy?schema=public"

# JWT
JWT_ACCESS_TOKEN_SECRET="your-secret-key"
JWT_ACCESS_TOKEN_EXPIRES_IN="15m"
JWT_REFRESH_TOKEN_SECRET="your-refresh-secret-key"
JWT_REFRESH_TOKEN_EXPIRES_IN="7d"

# Logs
LOG_RETENTION_DAYS=30
```

### 3. База данных

```bash
# Применить миграции Prisma
npx prisma migrate dev

# Применить дополнительные индексы и расширения PostgreSQL
psql $DATABASE_URL -f prisma/post-migration.sql

# Сгенерировать Prisma Client
npx prisma generate
```

**Подробнее:** [prisma/README.md](./prisma/README.md)

### 4. Запуск приложения

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

Приложение будет доступно по адресу `http://localhost:3000`

## 📚 API Документация

### Аутентификация

#### Регистрация
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure-password"
}
```

#### Вход
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure-password"
}
```

**Ответ:**
```json
{
  "accessToken": "jwt-access-token",
  "refreshToken": "jwt-refresh-token",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com"
  }
}
```

#### Обновление токена
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "jwt-refresh-token"
}
```

#### Выход
```http
POST /api/v1/auth/logout
Authorization: Bearer <access-token>
```

### Проекты

Все endpoints требуют JWT авторизации (header: `Authorization: Bearer <token>`)

#### Создать проект
```http
POST /api/v1/projects
Authorization: Bearer <token>

{
  "name": "My Project",
  "description": "Project description"
}
```

**Ответ:**
```json
{
  "id": "project-uuid",
  "name": "My Project",
  "description": "Project description",
  "token": "project-token-uuid",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

#### Получить все проекты
```http
GET /api/v1/projects
Authorization: Bearer <token>
```

#### Получить проект по ID
```http
GET /api/v1/projects/:projectId
Authorization: Bearer <token>
```

#### Обновить проект
```http
PATCH /api/v1/projects/:projectId
Authorization: Bearer <token>

{
  "name": "Updated Name",
  "description": "Updated description"
}
```

#### Удалить проект
```http
DELETE /api/v1/projects/:projectId
Authorization: Bearer <token>
```

#### Регенерировать токен проекта
```http
POST /api/v1/projects/:projectId/regenerate-token
Authorization: Bearer <token>
```

### Логи

#### Отправить лог (публичный endpoint)
```http
POST /api/v1/logs
X-Project-Token: <project-token>
Content-Type: application/json

{
  "level": "error",
  "message": "Payment failed",
  "timestamp": "2024-01-01T12:00:00Z",
  "tags": ["payment", "critical"],
  "metadata": {
    "service": "payment-service",
    "hostname": "server-01",
    "request": {
      "id": "req-123",
      "method": "POST",
      "path": "/api/payment"
    }
  }
}
```

**Уровни логов:** `error`, `warn`, `info`, `debug`, `verbose`

#### Получить логи проекта (требует авторизации)
```http
GET /api/v1/projects/:projectId/logs?level=error&level=warn&tags=payment&from=2024-01-01&to=2024-01-31&limit=100&offset=0
Authorization: Bearer <token>
```

**Query параметры:**
- `level` - фильтр по уровням (можно несколько)
- `tags` - фильтр по тегам (можно несколько)
- `from` - начальная дата (ISO 8601)
- `to` - конечная дата (ISO 8601)
- `limit` - количество записей (по умолчанию 100)
- `offset` - смещение для пагинации

#### Получить количество логов
```http
GET /api/v1/projects/:projectId/logs/count?level=error&tags=payment&from=2024-01-01&to=2024-01-31
Authorization: Bearer <token>
```

#### Получить конкретный лог
```http
GET /api/v1/projects/:projectId/logs/:logId
Authorization: Bearer <token>
```

### Realtime (WebSocket)

Подключение к WebSocket требует JWT токен:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/realtime', {
  query: {
    token: 'your-jwt-access-token'
  },
  // или через header:
  // extraHeaders: {
  //   Authorization: 'Bearer your-jwt-access-token'
  // }
});

// Подписаться на логи проекта с фильтрами
socket.emit('subscribe', {
  projectId: 'project-uuid',
  filters: {
    level: ['error', 'warn'],
    tags: ['payment'],
    metadata: {
      service: 'payment-service'
    }
  }
});

// Отписаться от проекта
socket.emit('unsubscribe', {
  projectId: 'project-uuid'
});

// Получать новые логи
socket.on('log:new', (log) => {
  console.log('New log:', log);
});

// Подтверждение подписки
socket.on('subscribed', (data) => {
  console.log('Subscribed to:', data);
});

// Ошибки
socket.on('error', (error) => {
  console.error('Error:', error);
});
```

**Подробнее:** [docs/SOCKETIO_SETUP.md](./docs/SOCKETIO_SETUP.md)

## 🔧 Конфигурация

Основные переменные окружения:

| Переменная | Описание | По умолчанию |
|-----------|----------|--------------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `JWT_ACCESS_TOKEN_SECRET` | Секрет для access токенов | - |
| `JWT_ACCESS_TOKEN_EXPIRES_IN` | Время жизни access токена | `15m` |
| `JWT_REFRESH_TOKEN_SECRET` | Секрет для refresh токенов | - |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | Время жизни refresh токена | `7d` |
| `LOG_RETENTION_DAYS` | Дни хранения логов | `30` |

## 📖 Дополнительная документация

- [Архитектура системы](./docs/ARCHITECTURE.md) - Подробное описание архитектуры и API
- [Настройка PostgreSQL](./docs/POSTGRESQL_SETUP.md) - Расширения, индексы, оптимизация
- [Настройка Socket.IO](./docs/SOCKETIO_SETUP.md) - WebSocket интеграция
- [Настройка Scheduler](./docs/SCHEDULER_SETUP.md) - CRON задачи для очистки логов
- [Race Conditions](./docs/RACE_CONDITIONS.md) - Анализ race conditions и их решения
- [Prisma Migrations](./prisma/README.md) - Работа с миграциями базы данных

## 🔄 Интеграция с приложениями

Для отправки логов из ваших приложений можно использовать Winston transport (планируется как отдельный npm пакет) или напрямую отправлять HTTP запросы:

```typescript
// Пример отправки лога
const log = {
  level: 'error',
  message: 'Payment failed',
  tags: ['payment', 'critical'],
  metadata: {
    service: 'payment-service',
    request: {
      id: 'req-123',
      method: 'POST',
      path: '/api/payment'
    }
  }
};

await fetch('http://loggy-backend:3000/api/v1/logs', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Project-Token': process.env.LOGGY_PROJECT_TOKEN
  },
  body: JSON.stringify(log)
});
```

## 🧪 Разработка

```bash
# Запуск в режиме разработки
npm run start:dev

# Сборка проекта
npm run build

# Запуск линтера
npm run lint

# Исправление ошибок линтера
npm run lint:fix

# Запуск тестов
npm run test

# Запуск e2e тестов
npm run test:e2e

# Покрытие тестами
npm run test:cov
```

## 📝 TODO

- [ ] Winston transport npm пакет для легкой интеграции
- [ ] Rate limiting для защиты от злоупотреблений
- [ ] Метрики и мониторинг
- [ ] Партиционирование таблицы logs для масштабирования

## 📄 Лицензия

MIT
