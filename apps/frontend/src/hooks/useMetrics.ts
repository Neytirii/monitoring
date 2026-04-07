import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

interface Metric {
  time: string;
  host_id: string;
  name: string;
  value: number;
  tags: Record<string, string>;
}

interface MetricsParams {
  hostId?: string;
  metric?: string;
  from?: string;
  to?: string;
  limit?: number;
  refetchInterval?: number;
}

export function useMetrics(params: MetricsParams = {}) {
  const { refetchInterval = 10_000, ...queryParams } = params;

  return useQuery({
    queryKey: ['metrics', queryParams],
    queryFn: async (): Promise<Metric[]> => {
      const { data } = await api.get('/metrics', { params: queryParams });
      return data.metrics;
    },
    refetchInterval,
  });
}

export function useHostMetrics(hostId: string, params: Omit<MetricsParams, 'hostId'> = {}) {
  const { refetchInterval = 10_000, ...queryParams } = params;

  return useQuery({
    queryKey: ['metrics', 'host', hostId, queryParams],
    queryFn: async (): Promise<Metric[]> => {
      const { data } = await api.get(`/metrics/hosts/${hostId}`, { params: queryParams });
      return data.metrics;
    },
    refetchInterval,
    enabled: !!hostId,
  });
}
