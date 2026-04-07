import { useState } from 'react';
import { X } from 'lucide-react';

interface WidgetPickerProps {
  onAdd: (widget: {
    type: string;
    title: string;
    config: Record<string, unknown>;
    position: { x: number; y: number; w: number; h: number };
  }) => void;
  onClose: () => void;
}

const WIDGET_TYPES = [
  { type: 'line', label: 'Line Chart', description: 'Time-series metric over time' },
  { type: 'gauge', label: 'Gauge', description: 'Current value as a gauge' },
  { type: 'pie', label: 'Pie Chart', description: 'Distribution of values' },
];

const COMMON_METRICS = [
  'cpu.usage_percent',
  'mem.used_percent',
  'disk.used_percent',
  'net.bytes_sent',
  'net.bytes_recv',
];

export default function WidgetPicker({ onAdd, onClose }: WidgetPickerProps) {
  const [selectedType, setSelectedType] = useState('line');
  const [title, setTitle] = useState('');
  const [hostId, setHostId] = useState('');
  const [metric, setMetric] = useState(COMMON_METRICS[0] ?? 'cpu.usage_percent');

  const handleAdd = () => {
    if (!title.trim()) return;

    onAdd({
      type: selectedType,
      title: title.trim(),
      config: { hostId, metric },
      position: { x: 0, y: 0, w: 1, h: 1 },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Add Widget</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Widget Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {WIDGET_TYPES.map((wt) => (
                <button
                  key={wt.type}
                  onClick={() => setSelectedType(wt.type)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    selectedType === wt.type
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{wt.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{wt.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="CPU Usage"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Host ID
            </label>
            <input
              type="text"
              value={hostId}
              onChange={(e) => setHostId(e.target.value)}
              placeholder="Host ID (optional)"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Metric
            </label>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {COMMON_METRICS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!title.trim()}
            className="flex-1 px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add Widget
          </button>
        </div>
      </div>
    </div>
  );
}
