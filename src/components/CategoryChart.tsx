import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { money } from '../lib/format';

// Supporting charts for the dashboard. Restrained palette, no decoration.

const PALETTE = [
  '#0f766e', '#0e7490', '#4d7c0f', '#a16207', '#b45309',
  '#9f1239', '#6d28d9', '#1d4ed8', '#be185d', '#475569',
  '#65a30d', '#c2410c', '#7c3aed',
];

export interface CatDatum {
  category: string;
  amount: number;
  pct: number;
}

export function CategoryDonut({
  data,
  baseCurrency,
}: {
  data: CatDatum[];
  baseCurrency: string;
}) {
  if (!data.length) return null;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="amount"
          nameKey="category"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={1}
          stroke="#fff"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number, _n, item) => [
            money(value, baseCurrency),
            (item?.payload as CatDatum)?.category,
          ]}
          contentStyle={{ borderRadius: 8, border: '1px solid #e7e5e4', fontSize: 13 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function MerchantBars({
  data,
  baseCurrency,
}: {
  data: { merchant: string; amount: number }[];
  baseCurrency: string;
}) {
  if (!data.length) return null;
  const trimmed = data.map((d) => ({
    ...d,
    label: d.merchant.length > 18 ? `${d.merchant.slice(0, 17)}…` : d.merchant,
  }));
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 34)}>
      <BarChart data={trimmed} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid horizontal={false} stroke="#f1f0ef" />
        <XAxis type="number" tickFormatter={(v) => money(v, baseCurrency)} fontSize={11} stroke="#a8a29e" />
        <YAxis type="category" dataKey="label" width={120} fontSize={11} stroke="#78716c" />
        <Tooltip
          formatter={(value: number) => [money(value, baseCurrency), 'Spend']}
          contentStyle={{ borderRadius: 8, border: '1px solid #e7e5e4', fontSize: 13 }}
          cursor={{ fill: '#fafaf9' }}
        />
        <Bar dataKey="amount" fill="#0f766e" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
