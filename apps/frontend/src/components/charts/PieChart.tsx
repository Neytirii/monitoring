import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface DataPoint {
  name: string;
  value: number;
}

interface PieChartProps {
  data: DataPoint[];
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#eab308', '#22c55e', '#06b6d4'];

export default function PieChart({ data }: PieChartProps) {
  const aggregated = data.reduce<Record<string, number>>((acc, d) => {
    acc[d.name] = (acc[d.name] ?? 0) + d.value;
    return acc;
  }, {});

  const chartData = Object.entries(aggregated).map(([name, value]) => ({ name, value }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsPieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          outerRadius="70%"
          dataKey="value"
          labelLine={false}
        >
          {chartData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: '#1f2937',
            border: 'none',
            borderRadius: '8px',
            color: '#f9fafb',
            fontSize: '12px',
          }}
        />
        <Legend iconType="circle" iconSize={8} />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}
