import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { LogRepository } from '@common/database/postgresql/repositories/log';
import { CONFIG__LOG_RETENTION_DAYS } from '@shared/constants';

@Injectable()
export class CleanupLogsTask {
  private readonly logger = new Logger(CleanupLogsTask.name);
  private isRunning = false;

  constructor(
    private readonly logRepository: LogRepository,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Запускается каждый день в 2:00 ночи
   * Удаляет логи старше указанного количества дней
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleCron() {
    if (this.isRunning) {
      this.logger.warn('Cleanup task is already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      this.logger.log('Starting cleanup of old logs...');

      const retentionDays = this.configService.get<number>(
        CONFIG__LOG_RETENTION_DAYS,
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
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Опционально: запуск вручную через API (если понадобится)
   */
  async cleanupManually(days?: number): Promise<number> {
    const retentionDays =
      days || this.configService.get<number>(CONFIG__LOG_RETENTION_DAYS, 30);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    this.logger.log(
      `Manual cleanup: deleting logs older than ${retentionDays} days`,
    );
    return await this.logRepository.deleteOldLogs(cutoffDate);
  }
}
