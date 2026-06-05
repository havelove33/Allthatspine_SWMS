"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

export interface MonthStat {
  month: string
  출근일: number
  지각: number
  조기퇴근: number
}

export function YearlyChart({ data }: { data: MonthStat[] }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <ResponsiveContainer width="100%" height={340}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
            cursor={{ fill: "rgba(0,0,0,0.04)" }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="출근일" fill="#0E7C8C" radius={[3, 3, 0, 0]} />
          <Bar dataKey="지각" fill="#F59E0B" radius={[3, 3, 0, 0]} />
          <Bar dataKey="조기퇴근" fill="#94A3B8" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
