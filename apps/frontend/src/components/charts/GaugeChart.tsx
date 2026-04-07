import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';

interface GaugeChartProps {
  value: number;
  max?: number;
  unit?: string;
  label?: string;
}

function getColor(percent: number): string {
  if (percent >= 90) return '#ef4444';
  if (percent >= 75) return '#f97316';
  if (percent >= 50) return '#eab308';
  return '#22c55e';
}

export default function GaugeChart({ value, max = 100, unit = '%', label }: GaugeChartProps) {
  const percent = Math.min((value / max) * 100, 100);
  const color = getColor(percent);

  const data = [{ value: percent, fill: color }];

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="70%"
          innerRadius="60%"
          outerRadius="90%"
          startAngle={180}
          endAngle={0}
          data={data}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" cornerRadius={4} background={{ fill: '#e5e7eb' }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute bottom-6 text-center">
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {value.toFixed(1)}
          <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>
        </p>
        {label && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>}
      </div>
    </div>
  );
}
