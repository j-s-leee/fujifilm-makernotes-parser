"use client";

import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const GRAYS = [
  "#1a1a1a", "#333333", "#4d4d4d", "#666666", "#808080",
  "#999999", "#b3b3b3", "#cccccc", "#d9d9d9", "#e6e6e6",
];

interface SimulationData {
  name: string;
  count: number;
}

interface TrendData {
  month: string;
  count: number;
}

export function SimulationDistributionChart({ data }: { data: SimulationData[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-4">Film Simulation Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
          >
            {data.map((_, idx) => (
              <Cell key={idx} fill={GRAYS[idx % GRAYS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PopularRecipesChart({ data }: { data: SimulationData[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-4">Most Popular Simulations</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" />
          <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="count" fill="#666666" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TrendsChart({ data }: { data: TrendData[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-4">Recipes Shared Over Time</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="count" stroke="#1a1a1a" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
