import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Zap, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { clsx } from 'clsx';
import api from '../lib/api';

interface TriggerExpression {
  metric: string;
  operator: '>' | '>=' | '<' | '<=' | '==' | '!=';
  threshold: number;
}

interface Trigger {
  id: string;
  name: string;
  description?: string;
  expression: TriggerExpression;
  severity: 'INFO' | 'WARNING' | 'HIGH' | 'DISASTER';
  enabled: boolean;
  createdAt: string;
  _count?: { alerts: number };
}

const severityColors: Record<string, string> = {
  INFO: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  WARNING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  DISASTER: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const COMMON_METRICS = [
  'cpu.usage_percent',
  'mem.used_percent',
  'disk.used_percent',
  'net.bytes_sent',
  'net.bytes_recv',
];

const OPERATORS = ['>', '>=', '<', '<=', '==', '!='] as const;
const SEVERITIES = ['INFO', 'WARNING', 'HIGH', 'DISASTER'] as const;

const defaultForm = {
  name: '',
  description: '',
  metric: 'cpu.usage_percent',
  operator: '>',
  threshold: 90,
  severity: 'WARNING',
};

export default function TriggersPage() {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ ...defaultForm });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['triggers'],
    queryFn: async () => {
      const { data } = await api.get('/triggers');
      return data.triggers as Trigger[];
    },
  });

  const createTrigger = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/triggers', {
        name: form.name,
        description: form.description || undefined,
        expression: {
          metric: form.metric,
          operator: form.operator,
          threshold: Number(form.threshold),
        },
        severity: form.severity,
        enabled: true,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['triggers'] });
      setShowAdd(false);
      setForm({ ...defaultForm });
    },
  });

  const toggleTrigger = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/triggers/${id}/toggle`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['triggers'] }),
  });

  const deleteTrigger = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/triggers/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['triggers'] }),
  });

  const triggers = data ?? [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Alert Triggers</h1>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Trigger
        </button>
      </div>

      {showAdd && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Create Alert Trigger
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="High CPU Usage"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Severity
              </label>
              <select
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {SEVERITIES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Metric
              </label>
              <select
                value={form.metric}
                onChange={(e) => setForm({ ...form, metric: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {COMMON_METRICS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <div className="w-32 flex-shrink-0">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Operator
                </label>
                <select
                  value={form.operator}
                  onChange={(e) => setForm({ ...form, operator: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {OPERATORS.map((op) => (
                    <option key={op}>{op}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Threshold
                </label>
                <input
                  type="number"
                  value={form.threshold}
                  onChange={(e) => setForm({ ...form, threshold: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Alert when CPU usage exceeds 90%"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="p-3 bg-gray-50 dark:bg-gray-900/40 rounded-lg text-sm text-gray-600 dark:text-gray-400 font-mono mb-4">
            IF{' '}
            <span className="text-primary-600 dark:text-primary-400 font-semibold">
              {form.metric}
            </span>{' '}
            {form.operator}{' '}
            <span className="text-primary-600 dark:text-primary-400 font-semibold">
              {form.threshold}
            </span>{' '}
            → fire{' '}
            <span
              className={clsx(
                'font-semibold',
                form.severity === 'DISASTER' || form.severity === 'HIGH'
                  ? 'text-red-500'
                  : form.severity === 'WARNING'
                    ? 'text-yellow-500'
                    : 'text-blue-500',
              )}
            >
              {form.severity}
            </span>{' '}
            alert
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => createTrigger.mutate()}
              disabled={!form.name || createTrigger.isPending}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {createTrigger.isPending ? 'Creating...' : 'Create Trigger'}
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : triggers.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
          <Zap className="w-10 h-10 mb-3 text-gray-300" />
          <p className="font-medium">No triggers yet</p>
          <p className="text-sm mt-1">Create a trigger to start generating alerts automatically</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
          {triggers.map((trigger) => (
            <div
              key={trigger.id}
              className={clsx(
                'p-5 flex items-center justify-between gap-4 transition-opacity',
                !trigger.enabled && 'opacity-60',
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span
                    className={clsx(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                      severityColors[trigger.severity] ?? severityColors['WARNING'],
                    )}
                  >
                    {trigger.severity}
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {trigger.name}
                  </span>
                  {!trigger.enabled && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">(disabled)</span>
                  )}
                  {(trigger._count?.alerts ?? 0) > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      {trigger._count!.alerts} firing
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                  {trigger.expression.metric} {trigger.expression.operator}{' '}
                  {trigger.expression.threshold}
                </p>

                {trigger.description && (
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
                    {trigger.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => toggleTrigger.mutate(trigger.id)}
                  disabled={toggleTrigger.isPending}
                  className="text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  title={trigger.enabled ? 'Disable trigger' : 'Enable trigger'}
                >
                  {trigger.enabled ? (
                    <ToggleRight className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  ) : (
                    <ToggleLeft className="w-6 h-6" />
                  )}
                </button>

                <button
                  onClick={() => {
                    if (confirm(`Delete trigger "${trigger.name}"?`)) {
                      deleteTrigger.mutate(trigger.id);
                    }
                  }}
                  disabled={deleteTrigger.isPending}
                  className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  title="Delete trigger"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
