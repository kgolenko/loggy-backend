import { RealtimeFilters } from './realtime-filters.interface';

export interface Subscription {
  projectId: string;
  filters?: RealtimeFilters;
}
