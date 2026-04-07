import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X, GripVertical } from 'lucide-react';
import LineChart from '../charts/LineChart';
import GaugeChart from '../charts/GaugeChart';
import PieChart from '../charts/PieChart';
import { useHostMetrics } from '../../hooks/useMetrics';

interface WidgetData {
  id: string;
  type: string;
  title: string;
  config: Record<string, unknown>;
  position: { x: number; y: number; w: number; h: number };
}

interface WidgetProps {
  widget: WidgetData;
  onRemove: (id: string) => void;
}

function WidgetContent({ widget }: { widget: WidgetData }) {
  const hostId = widget.config['hostId'] as string | undefined;
  const metric = widget.config['metric'] as string | undefined;
  const { data: metrics = [] } = useHostMetrics(hostId ?? '', { metric });

  const chartData = metrics.map((m) => ({
    time: new Date(m.time).toLocaleTimeString(),
    value: m.value,
    name: m.name,
  }));

  switch (widget.type) {
    case 'line':
      return <LineChart data={chartData} dataKey="value" />;
    case 'gauge': {
      const latest = metrics[0];
      return <GaugeChart value={latest?.value ?? 0} max={100} />;
    }
    case 'pie':
      return <PieChart data={chartData} />;
    default:
      return (
        <div className="flex items-center justify-center h-full text-gray-400">
          Unknown widget type: {widget.type}
        </div>
      );
  }
}

export default function Widget({ widget, onRemove }: WidgetProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widget.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{widget.title}</h3>
        </div>
        <button
          onClick={() => onRemove(widget.id)}
          className="text-gray-400 hover:text-red-500 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 h-48">
        <WidgetContent widget={widget} />
      </div>
    </div>
  );
}
