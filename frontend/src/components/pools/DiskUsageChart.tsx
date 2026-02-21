import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatBytes } from '../../utils/format';
import type { Pool } from '../../types';

interface DiskUsageChartProps {
  pool: Pool;
}

const COLORS = ['#3b82f6', '#e5e7eb'];

export default function DiskUsageChart({ pool }: DiskUsageChartProps) {
  const data = [
    { name: 'Used', value: pool.allocated },
    { name: 'Free', value: pool.free },
  ];

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            dataKey="value"
            label={({ name, value }) => `${name}: ${formatBytes(value)}`}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => formatBytes(value)} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
