"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";

const COLORS = {
  primary: "#0F4C75",
  gold: "#c9a96e",
  rose: "#a94064",
  muted: "#94a3b8",
};

const tooltipStyle = {
  borderRadius: "12px",
  border: "1px solid rgba(15,76,117,0.1)",
  fontSize: "12px",
  fontFamily: "DM Sans, sans-serif",
  boxShadow: "0 4px 20px rgba(15,76,117,0.08)",
};

/* ── Content distribution (tests per chapitre) ── */
export function ContentBarChart({
  data,
}: {
  data: { name: string; tests: number; questions: number }[];
}) {
  return (
    <div className="rounded-2xl border border-primary/8 bg-surface p-5">
      <h3 className="font-serif text-sm font-bold text-foreground mb-1">
        Contenu par chapitre
      </h3>
      <p className="text-xs text-text-muted mb-4">Tests et questions par chapitre</p>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,76,117,0.06)" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={45}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar
              dataKey="tests"
              name="Tests"
              fill={COLORS.primary}
              radius={[4, 4, 0, 0]}
              barSize={18}
            />
            <Bar
              dataKey="questions"
              name="Questions"
              fill={COLORS.gold}
              radius={[4, 4, 0, 0]}
              barSize={18}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ── Test type distribution (pie) ── */
export function TestTypePieChart({
  data,
}: {
  data: { name: string; value: number; color: string }[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="rounded-2xl border border-primary/8 bg-surface p-5">
      <h3 className="font-serif text-sm font-bold text-foreground mb-1">
        Types de tests
      </h3>
      <p className="text-xs text-text-muted mb-4">Répartition des types d&apos;évaluation</p>
      <div className="flex items-center gap-6">
        <div className="h-[160px] w-[160px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={68}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-3 flex-1">
          {data.map((d) => (
            <div key={d.name} className="flex items-center gap-2.5">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: d.color }}
              />
              <span className="text-sm text-text-muted flex-1">{d.name}</span>
              <span className="font-serif text-sm font-bold text-foreground">
                {d.value}
              </span>
              <span className="text-[10px] text-text-muted/60 w-8 text-right">
                {total > 0 ? Math.round((d.value / total) * 100) : 0}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Questions per test (area) ── */
export function QuestionsAreaChart({
  data,
}: {
  data: { name: string; questions: number }[];
}) {
  return (
    <div className="rounded-2xl border border-primary/8 bg-surface p-5">
      <h3 className="font-serif text-sm font-bold text-foreground mb-1">
        Questions par test
      </h3>
      <p className="text-xs text-text-muted mb-4">Densité des questions dans chaque test</p>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="questionGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.rose} stopOpacity={0.2} />
                <stop offset="100%" stopColor={COLORS.rose} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,76,117,0.06)" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={45}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(v: any) => [`${v}`, "Questions"]}
            />
            <Area
              type="monotone"
              dataKey="questions"
              stroke={COLORS.rose}
              strokeWidth={2}
              fill="url(#questionGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
