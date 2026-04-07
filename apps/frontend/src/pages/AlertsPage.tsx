import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCircle } from 'lucide-react';
import { clsx } from 'clsx';
import api from '../lib/api';

interface Alert {
  id: string;
  state: 'OK' | 'FIRING' | 'RESOLVED';
  message: string;
  firedAt: string;
  resolvedAt?: string;
  trigger: {
    name: string;
    severity: 'INFO' | 'WARNING' | 'HIGH' | 'DISASTER';
  };
  host: {
    id: string;
    name: string;
    hostname: string;
  };
}

const severityColors: Record<string, string> = {
  INFO: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  WARNING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  DISASTER: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const stateColors: Record<string, string> = {
  FIRING: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  RESOLVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  OK: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

export default function AlertsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const { data } = await api.get('/alerts');
      return data.alerts as Alert[];
    },
    refetchInterval: 15_000,
  });

  const resolve = useMutation({
    mutationFn: async (alertId: string) => {
      await api.patch(`/alerts/${alertId}/resolve`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const alerts = data ?? [];
  const firingCount = alerts.filter((a) => a.state === 'FIRING').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Alerts</h1>
          {firingCount > 0 && (
            <p className="text-sm text-red-500 mt-1">{firingCount} active alert{firingCount !== 1 ? 's' : ''}</p>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
          <Bell className="w-10 h-10 mb-3 text-gray-300" />
          <p className="font-medium">No alerts</p>
          <p className="text-sm mt-1">All systems are operating normally</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={clsx(
                'bg-white dark:bg-gray-800 rounded-xl shadow-sm border overflow-hidden',
                alert.state === 'FIRING'
                  ? 'border-red-200 dark:border-red-800'
                  : 'border-gray-200 dark:border-gray-700',
              )}
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className={clsx(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          stateColors[alert.state] ?? stateColors['OK'],
                        )}
                      >
                        {alert.state}
                      </span>
                      <span
                        className={clsx(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          severityColors[alert.trigger.severity] ?? severityColors['WARNING'],
                        )}
                      >
                        {alert.trigger.severity}
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {alert.trigger.name}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{alert.message}</p>

                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>Host: {alert.host.name} ({alert.host.hostname})</span>
                      <span>Fired: {new Date(alert.firedAt).toLocaleString()}</span>
                      {alert.resolvedAt && (
                        <span>Resolved: {new Date(alert.resolvedAt).toLocaleString()}</span>
                      )}
                    </div>
                  </div>

                  {alert.state === 'FIRING' && (
                    <button
                      onClick={() => resolve.mutate(alert.id)}
                      disabled={resolve.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors disabled:opacity-50 flex-shrink-0"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
