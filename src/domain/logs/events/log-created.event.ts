import { Log } from '@prisma/client';

export class LogCreatedEvent {
  constructor(
    public readonly log: Log,
    public readonly projectId: string,
  ) {}
}
