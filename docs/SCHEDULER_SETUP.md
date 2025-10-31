# NestJS Scheduler для Loggy

## Установка зависимостей

```bash
npm install @nestjs/schedule
```

## Настройка Scheduler Module

### 1. Глобальная настройка

```typescript
// app.module.ts

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(), // Глобальная регистрация
    // ... другие модули
  ],
})
export class AppModule {}
```

### 2. Создание Scheduler Module (опционально, если нужна изоляция)

```typescript
// shared/scheduler/scheduler.module.ts

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [ScheduleModule.forRoot()],
})
export class SchedulerModule {}
```

## Реализация задачи очистки логов

### 1. Создание задачи

```typescript
// shared/scheduler/tasks/cleanup-logs.task.ts

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { LogRepository } from '@domain/logs/repositories/log.repository';

@Injectable()
export class CleanupLogsTask {
  private readonly logger = new Logger(CleanupLogsTask.name);

  constructor(
    private readonly logRepository: LogRepository,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Запускается каждый день в 2:00 ночи
   * Удаляет логи старше 30 дней
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleCron() {
    this.logger.log('Starting cleanup of old logs...');

    const retentionDays = this.configService.get<number>(
      'LOG_RETENTION_DAYS',
      30,
    );
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    try {
      const deletedCount = await this.logRepository.deleteOldLogs(cutoffDate);
      this.logger.log(`Deleted ${deletedCount} old logs (older than ${retentionDays} days)`);
    } catch (error) {
      this.logger.error(`Failed to cleanup logs: ${error.message}`, error.stack);
    }
  }

  /**
   * Опционально: запуск вручную через API
   */
  async cleanupManually(days?: number): Promise<number> {
    const retentionDays = days || this.configService.get<number>(
      'LOG_RETENTION_DAYS',
      30,
    );
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    this.logger.log(`Manual cleanup: deleting logs older than ${retentionDays} days`);
    return await this.logRepository.deleteOldLogs(cutoffDate);
  }
}
```

### 2. Метод в LogRepository для batch удаления

```typescript
// domain/logs/repositories/log.repository.ts

import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@shared/abstract/base.service';
import { PostgresqlService } from '@common/database/postgresql/postgresql.service';
import { Prisma, Log } from '@prisma/client';

@Injectable()
export class LogRepository extends BaseRepository<
  Prisma.LogDelegate,
  Log
> {
  constructor(prisma: PostgresqlService) {
    super(prisma, prisma.log);
  }

  /**
   * Удаляет старые логи батчами для предотвращения блокировки БД
   */
  async deleteOldLogs(cutoffDate: Date): Promise<number> {
    const BATCH_SIZE = 1000;
    let totalDeleted = 0;
    let deletedInBatch = 0;

    do {
      // Удаляем батч в транзакции
      deletedInBatch = await this.prisma.$transaction(async (tx) => {
        const logsToDelete = await tx.log.findMany({
          where: {
            timestamp: {
              lt: cutoffDate,
            },
          },
          select: { id: true },
          take: BATCH_SIZE,
        });

        if (logsToDelete.length === 0) {
          return 0;
        }

        const deleted = await tx.log.deleteMany({
          where: {
            id: {
              in: logsToDelete.map((log) => log.id),
            },
          },
        });

        return deleted.count;
      });

      totalDeleted += deletedInBatch;

      // Пауза между батчами для предотвращения блокировки
      if (deletedInBatch > 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } while (deletedInBatch === BATCH_SIZE);

    return totalDeleted;
  }

  /**
   * Альтернативный метод: удаление через один запрос (проще, но может блокировать)
   */
  async deleteOldLogsSimple(cutoffDate: Date): Promise<number> {
    const result = await this.delegate.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }
}
```

### 3. Регистрация задачи в модуле

```typescript
// shared/scheduler/scheduler.module.ts

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CleanupLogsTask } from './tasks/cleanup-logs.task';
import { LogsModule } from '@domain/logs/logs.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    LogsModule, // Для доступа к LogRepository
  ],
  providers: [CleanupLogsTask],
})
export class SchedulerModule {}
```

## Альтернативные варианты расписания

### 1. Кастомное время через cron выражение

```typescript
// Каждый день в 3:30 утра
@Cron('30 3 * * *')
async handleCron() { }

// Каждые 6 часов
@Cron('0 */6 * * *')
async handleCron() { }

// Каждую неделю в понедельник в 2:00
@Cron('0 2 * * 1')
async handleCron() { }
```

### 2. Использование CronExpression (встроенные шаблоны)

```typescript
import { CronExpression } from '@nestjs/schedule';

// Каждые 30 секунд
@Cron(CronExpression.EVERY_30_SECONDS)

// Каждый час
@Cron(CronExpression.EVERY_HOUR)

// Каждый день в полночь
@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)

// Каждый день в 2:00
@Cron(CronExpression.EVERY_DAY_AT_2AM)
```

### 3. Интервалы через @Interval

```typescript
import { Interval } from '@nestjs/schedule';

// Каждые 5 минут (в миллисекундах)
@Interval(5 * 60 * 1000)
async handleInterval() {
  // Периодическая задача
}
```

### 4. Таймауты через @Timeout

```typescript
import { Timeout } from '@nestjs/schedule';

// Запуск через 10 секунд после старта приложения
@Timeout(10000)
async handleTimeout() {
  // Одноразовая задача
}
```

## Конфигурация через environment variables

### 1. Добавить в config.constants.ts

```typescript
// shared/constants/config.constants.ts

export const CONFIG__LOG_RETENTION_DAYS = 'LOG_RETENTION_DAYS';
export const CONFIG__LOG_CLEANUP_CRON = 'LOG_CLEANUP_CRON';
```

### 2. Использовать в задаче

```typescript
@Injectable()
export class CleanupLogsTask {
  constructor(
    private readonly logRepository: LogRepository,
    private readonly configService: ConfigService,
  ) {}

  // Использовать кастомное расписание из конфига или дефолтное
  @Cron(
    this.configService.get('LOG_CLEANUP_CRON') || 
    CronExpression.EVERY_DAY_AT_2AM
  )
  async handleCron() {
    const retentionDays = this.configService.get<number>(
      CONFIG__LOG_RETENTION_DAYS,
      30,
    );
    // ...
  }
}
```

## Обработка ошибок и логирование

### Улучшенная версия с обработкой ошибок

```typescript
@Injectable()
export class CleanupLogsTask {
  private readonly logger = new Logger(CleanupLogsTask.name);
  private isRunning = false; // Флаг для предотвращения параллельного выполнения

  constructor(
    private readonly logRepository: LogRepository,
    private readonly configService: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleCron() {
    // Предотвратить параллельное выполнение
    if (this.isRunning) {
      this.logger.warn('Cleanup task is already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      this.logger.log('Starting cleanup of old logs...');

      const retentionDays = this.configService.get<number>(
        'LOG_RETENTION_DAYS',
        30,
      );
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const deletedCount = await this.logRepository.deleteOldLogs(cutoffDate);
      
      const duration = Date.now() - startTime;
      this.logger.log(
        `Cleanup completed: deleted ${deletedCount} logs in ${duration}ms`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to cleanup logs: ${error.message}`,
        error.stack,
      );
      // Можно добавить отправку уведомлений или метрик
    } finally {
      this.isRunning = false;
    }
  }
}
```

## Тестирование задач

### Unit тест для задачи

```typescript
// shared/scheduler/tasks/cleanup-logs.task.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { CleanupLogsTask } from './cleanup-logs.task';
import { LogRepository } from '@domain/logs/repositories/log.repository';
import { ConfigService } from '@nestjs/config';

describe('CleanupLogsTask', () => {
  let task: CleanupLogsTask;
  let logRepository: jest.Mocked<LogRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CleanupLogsTask,
        {
          provide: LogRepository,
          useValue: {
            deleteOldLogs: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(30),
          },
        },
      ],
    }).compile();

    task = module.get<CleanupLogsTask>(CleanupLogsTask);
    logRepository = module.get(LogRepository);
  });

  it('should delete old logs', async () => {
    logRepository.deleteOldLogs.mockResolvedValue(100);

    await task.handleCron();

    expect(logRepository.deleteOldLogs).toHaveBeenCalled();
  });
});
```

## Опциональные улучшения

### 1. Метрики и мониторинг

```typescript
import { Injectable } from '@nestjs/common';
import { Counter, Histogram } from 'prom-client';

// Добавить метрики для мониторинга
private cleanupCounter = new Counter({
  name: 'loggy_cleanup_runs_total',
  help: 'Total number of cleanup runs',
});

private cleanupDuration = new Histogram({
  name: 'loggy_cleanup_duration_seconds',
  help: 'Duration of cleanup in seconds',
});
```

### 2. Отключение задач в тестах

```typescript
// В тестовом окружении можно отключить scheduler
@Module({
  imports: [
    // Только если не в тестовом окружении
    ...(process.env.NODE_ENV !== 'test' 
      ? [ScheduleModule.forRoot()] 
      : []),
  ],
})
export class AppModule {}
```

## Резюме

**Преимущества NestJS Scheduler:**
- ✅ Все CRON задачи в коде (TypeScript)
- ✅ Легко тестировать
- ✅ Конфигурация через environment variables
- ✅ Обработка ошибок и логирование
- ✅ Интеграция с NestJS dependency injection

**Что реализовать:**
1. Установить `@nestjs/schedule`
2. Создать `CleanupLogsTask` с декоратором `@Cron`
3. Реализовать batch удаление в `LogRepository`
4. Зарегистрировать в модуле

