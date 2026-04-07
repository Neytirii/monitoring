import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import api from '../lib/api';
import DashboardGrid from '../components/dashboard/DashboardGrid';
import WidgetPicker from '../components/dashboard/WidgetPicker';

interface Widget {
  id: string;
  type: string;
  title: string;
  config: Record<string, unknown>;
  position: { x: number; y: number; w: number; h: number };
}

interface Dashboard {
  id: string;
  name: string;
  widgets: Widget[];
}

export default function DashboardPage() {
  const { id } = useParams<{ id: string }>();
  const [showPicker, setShowPicker] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', id],
    queryFn: async (): Promise<Dashboard> => {
      const { data } = await api.get(`/dashboards/${id}`);
      return data.dashboard;
    },
    enabled: !!id && id !== 'default',
  });

  const addWidget = useMutation({
    mutationFn: async (widget: Omit<Widget, 'id'>) => {
      const { data: res } = await api.post(`/dashboards/${id}/widgets`, widget);
      return res.widget;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard', id] }),
  });

  const removeWidget = useMutation({
    mutationFn: async (widgetId: string) => {
      await api.delete(`/dashboards/${id}/widgets/${widgetId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard', id] }),
  });

  if (id === 'default') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <p className="text-lg font-medium">No dashboard selected</p>
        <p className="text-sm mt-1">Create or select a dashboard to get started</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        Failed to load dashboard
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.name}</h1>
        <button
          onClick={() => setShowPicker(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Widget
        </button>
      </div>

      {data.widgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
          <p className="text-lg font-medium">No widgets yet</p>
          <p className="text-sm mt-1">Click &quot;Add Widget&quot; to get started</p>
        </div>
      ) : (
        <DashboardGrid
          widgets={data.widgets}
          onReorder={() => {}}
          onRemoveWidget={(widgetId) => removeWidget.mutate(widgetId)}
        />
      )}

      {showPicker && (
        <WidgetPicker
          onAdd={(widget) => addWidget.mutate(widget)}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
