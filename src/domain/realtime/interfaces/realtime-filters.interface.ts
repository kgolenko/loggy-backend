import { $Enums } from '@prisma/client';

export interface RealtimeFilters {
  level?: $Enums.LogLevel[];
  tags?: string[];
  metadata?: Record<string, any>;
}
