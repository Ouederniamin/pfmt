"use client";

import Link from "next/link";
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
} from "recharts";
import {
  BookOpen,
  CheckCircle2,
  Trophy,
  TrendingUp,
  Clock,
  ChevronRight,
  Star,
  Target,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Types ── */

type GlobalStats = {
  totalChapitres: number;
  chapitresStarted: number;
  totalTests: number;
  testsDone: number;
  avgScore: number;
  totalAttempts: number;
};

type ChapitreStats = {
  id: string;
  numero: number;
  titre: string;
  totalTests: number;
  testsDone: number;
  avgScore: number;
  started: boolean;
  lastAccessed: string | null;
};

type RecentResult = {
  id: string;
  testTitle: string;
  chapitreNumero: number;
  chapitreTitre: string;
  score: number;
  total: number;
  percentage: number;
  attempt: number;
  date: string;
};

type Props = {
  stats: GlobalStats;
  chapitreStats: ChapitreStats[];
  recentResults: RecentResult[];
};

/* ── Constants ── */

const COLORS = {
  primary: "#0F4C75",
  gold: "#c9a96e",
  rose: "#a94064",
  emerald: "#059669",
  muted: "#94a3b8",
};

const tooltipStyle = {
  borderRadius: "12px",
  border: "1px solid rgba(15,76,117,0.1)",
  fontSize: "12px",
  fontFamily: "DM Sans, sans-serif",
  boxShadow: "0 4px 20px rgba(15,76,117,0.08)",
};

/* ── Helpers ── */

function scoreColor(pct: number) {
  if (pct >= 80) return "text-emerald-600";
  if (pct >= 60) return "text-amber-600";
  return "text-rose-600";
}

function scoreBg(pct: number) {
  if (pct >= 80) return "bg-emerald-50 border-emerald-200/60";
  if (pct >= 60) return "bg-amber-50 border-amber-200/60";
  return "bg-rose-50 border-rose-200/60";
}

function stars(pct: number) {
  if (pct >= 80) return 3;
  if (pct >= 60) return 2;
  return 1;
}

function relativeDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Hier";
  if (diff < 7) return `Il y a ${diff} jours`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════ */

export function StudentDashboard({ stats, chapitreStats, recentResults }: Props) {
  const coursePct = stats.totalChapitres > 0
    ? Math.round((stats.chapitresStarted / stats.totalChapitres) * 100)
    : 0;
  const testPct = stats.totalTests > 0
    ? Math.round((stats.testsDone / stats.totalTests) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* ── Page header ── */}
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
          Tableau de bord
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Suivez votre progression — Faculté de Médecine de Tunis
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={BookOpen}
          label="Chapitres commencés"
          value={`${stats.chapitresStarted}/${stats.totalChapitres}`}
          sub={`${coursePct}% du programme`}
          accent="primary"
        />
        <StatCard
          icon={CheckCircle2}
          label="Tests réalisés"
          value={`${stats.testsDone}/${stats.totalTests}`}
          sub={`${testPct}% complétés`}
          accent="gold"
        />
        <StatCard
          icon={Trophy}
          label="Score moyen"
          value={`${stats.avgScore}%`}
          sub={stats.avgScore >= 70 ? "Bon niveau !" : "Continuez vos efforts"}
          accent="emerald"
        />
        <StatCard
          icon={Target}
          label="Tentatives totales"
          value={`${stats.totalAttempts}`}
          sub={`${stats.testsDone} tests uniques`}
          accent="rose"
        />
      </div>

      {/* ── Charts row ── */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Progress by chapter */}
        <div className="rounded-2xl border border-primary/8 bg-surface p-5">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h3 className="font-serif text-sm font-bold text-foreground">
              Progression par chapitre
            </h3>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chapitreStats.map((c) => ({
                  name: `Ch.${c.numero}`,
                  tests: c.testsDone,
                  total: c.totalTests,
                  score: c.avgScore,
                }))}
                barGap={2}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,76,117,0.06)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar
                  dataKey="tests"
                  name="Tests faits"
                  fill={COLORS.primary}
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="total"
                  name="Tests total"
                  fill="rgba(15,76,117,0.15)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Score distribution donut */}
        <div className="rounded-2xl border border-primary/8 bg-surface p-5">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="font-serif text-sm font-bold text-foreground">
              Scores par chapitre
            </h3>
          </div>
          {chapitreStats.some((c) => c.avgScore > 0) ? (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chapitreStats
                      .filter((c) => c.avgScore > 0)
                      .map((c) => ({
                        name: `Ch.${c.numero}`,
                        value: c.avgScore,
                      }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {chapitreStats
                      .filter((c) => c.avgScore > 0)
                      .map((_, i) => (
                        <Cell
                          key={i}
                          fill={
                            [COLORS.primary, COLORS.gold, COLORS.rose, COLORS.emerald, COLORS.muted][
                              i % 5
                            ]
                          }
                        />
                      ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${v}%`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[240px] items-center justify-center">
              <p className="text-sm text-text-muted">
                Passez des tests pour voir vos scores
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Chapter progress table ── */}
      <div className="rounded-2xl border border-primary/8 bg-surface p-5">
        <h3 className="font-serif text-sm font-bold text-foreground mb-4">
          Détail par chapitre
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-primary/8">
                <th className="pb-3 pr-4 font-semibold text-text-muted text-xs uppercase tracking-wider">
                  Chapitre
                </th>
                <th className="pb-3 px-4 font-semibold text-text-muted text-xs uppercase tracking-wider text-center">
                  Tests
                </th>
                <th className="pb-3 px-4 font-semibold text-text-muted text-xs uppercase tracking-wider text-center">
                  Score moy.
                </th>
                <th className="pb-3 px-4 font-semibold text-text-muted text-xs uppercase tracking-wider text-center">
                  Progression
                </th>
                <th className="pb-3 pl-4 font-semibold text-text-muted text-xs uppercase tracking-wider text-right">
                  Dernier accès
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5">
              {chapitreStats.map((c) => {
                const pct = c.totalTests > 0
                  ? Math.round((c.testsDone / c.totalTests) * 100)
                  : 0;
                return (
                  <tr key={c.id} className="group">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/cours/${c.id}`}
                        className="flex items-center gap-2 group-hover:text-primary transition-colors"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/8 font-serif text-xs font-bold text-primary">
                          {c.numero}
                        </span>
                        <span className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {c.titre}
                        </span>
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-center text-text-muted">
                      {c.testsDone}/{c.totalTests}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {c.avgScore > 0 ? (
                        <span className={cn("font-semibold", scoreColor(c.avgScore))}>
                          {c.avgScore}%
                        </span>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="mx-auto flex w-24 items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-medium text-text-muted w-7 text-right">
                          {pct}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pl-4 text-right text-xs text-text-muted">
                      {c.lastAccessed ? relativeDate(c.lastAccessed) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Recent results ── */}
      <div className="rounded-2xl border border-primary/8 bg-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-serif text-sm font-bold text-foreground">
            Résultats récents
          </h3>
          {recentResults.length > 0 && (
            <span className="text-xs text-text-muted">
              {recentResults.length} dernier{recentResults.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {recentResults.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10">
            <div className="rounded-full bg-primary/5 p-4">
              <Trophy className="h-6 w-6 text-primary/40" />
            </div>
            <p className="text-sm text-text-muted">
              Aucun résultat pour l&apos;instant
            </p>
            <Link
              href="/cours"
              className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Commencer un cours
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentResults.map((r) => (
              <div
                key={r.id}
                className={cn(
                  "flex items-center gap-4 rounded-xl border px-4 py-3 transition-colors",
                  scoreBg(r.percentage)
                )}
              >
                {/* Stars */}
                <div className="flex shrink-0 gap-0.5">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-3.5 w-3.5",
                        i < stars(r.percentage)
                          ? "fill-amber-400 text-amber-400"
                          : "text-slate-200"
                      )}
                    />
                  ))}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {r.testTitle}
                  </p>
                  <p className="text-[11px] text-text-muted">
                    Ch.{r.chapitreNumero} · Tentative {r.attempt} · {relativeDate(r.date)}
                  </p>
                </div>

                {/* Score */}
                <div className="text-right shrink-0">
                  <p className={cn("text-lg font-bold", scoreColor(r.percentage))}>
                    {r.percentage}%
                  </p>
                  <p className="text-[10px] text-text-muted">
                    {r.score}/{r.total}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Stat card ── */

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  accent: "primary" | "gold" | "emerald" | "rose";
}) {
  const accentMap = {
    primary: {
      iconBg: "bg-primary/8",
      iconText: "text-primary",
      ring: "border-primary/10",
    },
    gold: {
      iconBg: "bg-amber-50",
      iconText: "text-amber-600",
      ring: "border-amber-200/40",
    },
    emerald: {
      iconBg: "bg-emerald-50",
      iconText: "text-emerald-600",
      ring: "border-emerald-200/40",
    },
    rose: {
      iconBg: "bg-rose-50",
      iconText: "text-rose-600",
      ring: "border-rose-200/40",
    },
  };

  const a = accentMap[accent];

  return (
    <div className={cn("rounded-2xl border bg-surface p-5", a.ring)}>
      <div className="flex items-center gap-3 mb-3">
        <div className={cn("rounded-xl p-2", a.iconBg)}>
          <Icon className={cn("h-4 w-4", a.iconText)} />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          {label}
        </p>
      </div>
      <p className="font-serif text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-text-muted">{sub}</p>
    </div>
  );
}
