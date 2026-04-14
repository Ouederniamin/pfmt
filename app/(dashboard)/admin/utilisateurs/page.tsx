"use client";

import { useEffect, useState, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  UsersRound,
  ShieldCheck,
  User,
  Loader2,
  Search,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ArrowUpDown,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface ClerkUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  imageUrl: string;
  role: string;
  createdAt: number;
}

type SortField = "name" | "email" | "role" | "createdAt";
type SortDir = "asc" | "desc";
type RoleFilter = "all" | "admin" | "student";

const COLORS = {
  primary: "#0F4C75",
  gold: "#c9a96e",
  rose: "#a94064",
  muted: "#94a3b8",
};

export default function UtilisateursPage() {
  const { user: me, isLoaded } = useUser();
  const router = useRouter();
  const [users, setUsers] = useState<ClerkUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    if (isLoaded && (me?.publicMetadata as { role?: string })?.role !== "admin") {
      router.replace("/cours");
    }
  }, [isLoaded, me, router]);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } finally {
      setLoading(false);
    }
  }

  async function toggleRole(userId: string, currentRole: string) {
    setUpdating(userId);
    try {
      const newRole = currentRole === "admin" ? "student" : "admin";
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
      }
    } finally {
      setUpdating(null);
    }
  }

  /* ── derived data ── */
  const adminCount = users.filter((u) => u.role === "admin").length;
  const studentCount = users.filter((u) => u.role !== "admin").length;

  const rolePieData = [
    { name: "Admins", value: adminCount, color: COLORS.gold },
    { name: "Étudiants", value: studentCount, color: COLORS.primary },
  ];

  const registrationData = useMemo(() => {
    const months: Record<string, number> = {};
    users.forEach((u) => {
      const d = new Date(u.createdAt);
      const key = d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
      months[key] = (months[key] || 0) + 1;
    });
    return Object.entries(months)
      .slice(-6)
      .map(([month, count]) => ({ month, count }));
  }, [users]);

  const filtered = useMemo(() => {
    let list = [...users];
    if (roleFilter !== "all") {
      list = list.filter((u) => u.role === roleFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (u) =>
          u.firstName?.toLowerCase().includes(q) ||
          u.lastName?.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") {
        const na = [a.firstName, a.lastName].filter(Boolean).join(" ").toLowerCase();
        const nb = [b.firstName, b.lastName].filter(Boolean).join(" ").toLowerCase();
        cmp = na.localeCompare(nb);
      } else if (sortField === "email") {
        cmp = a.email.localeCompare(b.email);
      } else if (sortField === "role") {
        cmp = a.role.localeCompare(b.role);
      } else {
        cmp = a.createdAt - b.createdAt;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [users, roleFilter, search, sortField, sortDir]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronsUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? (
      <ChevronUp className="h-3 w-3" />
    ) : (
      <ChevronDown className="h-3 w-3" />
    );
  }

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-accent-gold mb-2">
          <UsersRound className="h-4 w-4" />
          Gestion des utilisateurs
        </div>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">
          Utilisateurs
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          {users.length} utilisateur{users.length !== 1 ? "s" : ""} inscrits
        </p>
      </div>

      {/* ── Charts row ── */}
      <div className="grid gap-4 sm:grid-cols-2 mb-8">
        {/* Role distribution pie */}
        <div className="rounded-2xl border border-primary/8 bg-surface p-5">
          <h3 className="font-serif text-sm font-bold text-foreground mb-4">
            Répartition des rôles
          </h3>
          <div className="flex items-center gap-6">
            <div className="h-[140px] w-[140px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={rolePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={38}
                    outerRadius={62}
                    paddingAngle={4}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {rolePieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid rgba(15,76,117,0.1)",
                      fontSize: "12px",
                      fontFamily: "DM Sans, sans-serif",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: COLORS.gold }}
                />
                <span className="text-sm text-text-muted">Admins</span>
                <span className="ml-auto font-serif text-lg font-bold text-foreground">
                  {adminCount}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: COLORS.primary }}
                />
                <span className="text-sm text-text-muted">Étudiants</span>
                <span className="ml-auto font-serif text-lg font-bold text-foreground">
                  {studentCount}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Registrations bar chart */}
        <div className="rounded-2xl border border-primary/8 bg-surface p-5">
          <h3 className="font-serif text-sm font-bold text-foreground mb-4">
            Inscriptions récentes
          </h3>
          {registrationData.length > 0 ? (
            <div className="h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={registrationData} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,76,117,0.06)" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    width={24}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid rgba(15,76,117,0.1)",
                      fontSize: "12px",
                      fontFamily: "DM Sans, sans-serif",
                    }}
                    formatter={(v: any) => [`${v}`, "Inscrits"]}
                  />
                  <Bar dataKey="count" fill={COLORS.primary} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-text-muted py-10 text-center">Aucune donnée</p>
          )}
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted/50" />
          <input
            type="text"
            placeholder="Rechercher un utilisateur…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-primary/10 bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-text-muted/50 outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/8 transition-all"
          />
        </div>
        <div className="relative">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
            className="h-10 appearance-none rounded-xl border border-primary/10 bg-surface px-4 pr-9 text-sm font-medium text-foreground outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/8 cursor-pointer transition-all"
          >
            <option value="all">Tous les rôles</option>
            <option value="admin">Admins</option>
            <option value="student">Étudiants</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted/50 pointer-events-none" />
        </div>
        <span className="text-xs text-text-muted ml-auto">
          {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Table ── */}
      <div className="rounded-2xl border border-primary/8 bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-primary/6 bg-primary/[0.02]">
                <th className="px-5 py-3.5 text-left">
                  <button
                    onClick={() => handleSort("name")}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted hover:text-foreground transition-colors"
                  >
                    Utilisateur <SortIcon field="name" />
                  </button>
                </th>
                <th className="px-5 py-3.5 text-left hidden sm:table-cell">
                  <button
                    onClick={() => handleSort("email")}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted hover:text-foreground transition-colors"
                  >
                    Email <SortIcon field="email" />
                  </button>
                </th>
                <th className="px-5 py-3.5 text-left">
                  <button
                    onClick={() => handleSort("role")}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted hover:text-foreground transition-colors"
                  >
                    Rôle <SortIcon field="role" />
                  </button>
                </th>
                <th className="px-5 py-3.5 text-left hidden md:table-cell">
                  <button
                    onClick={() => handleSort("createdAt")}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted hover:text-foreground transition-colors"
                  >
                    Inscription <SortIcon field="createdAt" />
                  </button>
                </th>
                <th className="px-5 py-3.5 text-right">
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Actions
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5">
              {filtered.map((u) => {
                const isMe = u.id === me?.id;
                const isAdmin = u.role === "admin";
                const displayName =
                  [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;

                return (
                  <tr
                    key={u.id}
                    className="group transition-colors hover:bg-primary/[0.015]"
                  >
                    {/* User cell */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {u.imageUrl ? (
                          <img
                            src={u.imageUrl}
                            alt={displayName}
                            className="h-9 w-9 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 font-serif text-sm font-bold text-primary">
                            {(u.firstName?.[0] ?? u.email[0]).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-serif text-sm font-bold text-foreground truncate">
                              {displayName}
                            </span>
                            {isMe && (
                              <span className="rounded-full bg-primary/8 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
                                Vous
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-text-muted truncate sm:hidden">
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <span className="text-sm text-text-muted">{u.email}</span>
                    </td>

                    {/* Role badge */}
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          isAdmin
                            ? "bg-accent-gold/12 text-accent-gold"
                            : "bg-primary/8 text-primary"
                        }`}
                      >
                        {isAdmin ? (
                          <ShieldCheck className="h-3 w-3" />
                        ) : (
                          <User className="h-3 w-3" />
                        )}
                        {isAdmin ? "Admin" : "Étudiant"}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-5 py-4 hidden md:table-cell">
                      <span className="text-xs text-text-muted">
                        {new Date(u.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      {!isMe && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={updating === u.id}
                          onClick={() => toggleRole(u.id, u.role)}
                          className="text-xs h-8"
                        >
                          {updating === u.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : isAdmin ? (
                            "Rétrograder"
                          ) : (
                            "Promouvoir"
                          )}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <UsersRound className="h-10 w-10 text-primary/15" />
            <p className="mt-3 font-serif text-sm font-semibold text-foreground">
              Aucun résultat
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Essayez un autre filtre ou terme de recherche.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
