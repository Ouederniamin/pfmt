import { currentUser } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import {
  LayoutDashboard,
  FolderOpen,
  UsersRound,
  ClipboardCheck,
  ChevronRight,
  BookOpen,
  TrendingUp,
} from "lucide-react";
import {
  ContentBarChart,
  TestTypePieChart,
  QuestionsAreaChart,
} from "@/components/admin-charts";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const user = await currentUser();
  if ((user?.publicMetadata as { role?: string })?.role !== "admin") {
    redirect("/cours");
  }

  const [chapitres, tests, userCount] = await Promise.all([
    db.chapitre.findMany({ include: { tests: { include: { questions: true } } } }),
    db.test.findMany({ include: { questions: true } }),
    clerkClient().then((client) => client.users.getCount()),
  ]);

  const totalChapitres = chapitres.length;
  const totalTests = tests.length;
  const totalQuestions = tests.reduce((sum, t) => sum + t.questions.length, 0);

  /* ── chart data ── */
  const contentPerChapitre = chapitres.map((ch) => ({
    name: `Ch. ${String(ch.numero).padStart(2, "0")}`,
    tests: ch.tests.length,
    questions: ch.tests.reduce((s, t) => s + t.questions.length, 0),
  }));

  const qcmCount = tests.filter((t) => t.type === "QCM").length;
  const casCliniqueCount = tests.filter((t) => t.type === "CAS_CLINIQUE").length;
  const vraiFauxCount = tests.filter((t) => t.type === "VRAI_FAUX").length;
  const testTypeData = [
    { name: "QCM", value: qcmCount, color: "#0F4C75" },
    { name: "Cas clinique", value: casCliniqueCount, color: "#c9a96e" },
    { name: "Vrai / Faux", value: vraiFauxCount, color: "#a94064" },
  ];

  const questionsPerTest = tests.map((t) => ({
    name: t.titre.length > 16 ? t.titre.slice(0, 14) + "…" : t.titre,
    questions: t.questions.length,
  }));

  const stats = [
    {
      label: "Chapitres",
      value: totalChapitres,
      icon: BookOpen,
      color: "text-primary bg-primary/8",
      href: "/admin/contenu",
    },
    {
      label: "Tests",
      value: totalTests,
      icon: ClipboardCheck,
      color: "text-accent-gold bg-accent-gold/10",
      href: "/admin/contenu",
    },
    {
      label: "Questions",
      value: totalQuestions,
      icon: TrendingUp,
      color: "text-accent-rose bg-accent-rose/10",
      href: "/admin/contenu",
    },
    {
      label: "Utilisateurs",
      value: userCount,
      icon: UsersRound,
      color: "text-primary bg-primary/8",
      href: "/admin/utilisateurs",
    },
  ];

  const quickLinks = [
    {
      label: "Gestion du contenu",
      desc: "Créer, modifier et supprimer des chapitres et leurs tests.",
      icon: FolderOpen,
      href: "/admin/contenu",
    },
    {
      label: "Utilisateurs",
      desc: "Gérer les rôles et les permissions des utilisateurs.",
      icon: UsersRound,
      href: "/admin/utilisateurs",
    },
  ];

  return (
    <>
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-accent-gold mb-2">
          <LayoutDashboard className="h-4 w-4" />
          Tableau de bord
        </div>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">
          Administration
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Vue d&apos;ensemble de la plateforme — Faculté de Médecine de Tunis.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group rounded-2xl border border-primary/8 bg-surface p-5 transition-all hover:border-primary/15 hover:shadow-md hover:shadow-primary/5"
          >
            <div className="flex items-center justify-between">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.color}`}
              >
                <stat.icon className="h-5 w-5" />
              </div>
              <ChevronRight className="h-4 w-4 text-text-muted/30 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
            <p className="mt-4 font-serif text-3xl font-bold text-foreground">
              {stat.value}
            </p>
            <p className="mt-1 text-xs font-medium text-text-muted">
              {stat.label}
            </p>
          </Link>
        ))}
      </div>

      {/* ── Charts ── */}
      <div className="grid gap-4 lg:grid-cols-2 mb-10">
        <ContentBarChart data={contentPerChapitre} />
        <TestTypePieChart data={testTypeData} />
      </div>
      {questionsPerTest.length > 0 && (
        <div className="mb-10">
          <QuestionsAreaChart data={questionsPerTest} />
        </div>
      )}

      {/* Quick links */}
      <div className="mb-2">
        <h2 className="font-serif text-lg font-bold text-foreground">
          Accès rapide
        </h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {quickLinks.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="group flex items-start gap-4 rounded-2xl border border-primary/8 bg-surface p-5 transition-all hover:border-primary/15 hover:shadow-md hover:shadow-primary/5"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
              <link.icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-serif text-base font-bold text-foreground group-hover:text-primary transition-colors">
                {link.label}
              </h3>
              <p className="mt-1 text-sm text-text-muted leading-relaxed">
                {link.desc}
              </p>
            </div>
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-text-muted/30 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </Link>
        ))}
      </div>

      {/* Recent chapitres */}
      {chapitres.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg font-bold text-foreground">
              Chapitres récents
            </h2>
            <Link
              href="/admin/contenu"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Voir tout →
            </Link>
          </div>
          <div className="space-y-2">
            {chapitres.slice(0, 3).map((ch) => (
              <Link
                key={ch.id}
                href={`/admin/contenu/${ch.id}`}
                className="group flex items-center gap-4 rounded-xl border border-primary/8 bg-surface p-4 transition-all hover:border-primary/15 hover:shadow-sm"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/8 font-serif text-sm font-bold text-primary">
                  {String(ch.numero).padStart(2, "0")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-serif text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                    {ch.titre}
                  </p>
                  <p className="text-xs text-text-muted">
                    {ch.tests?.length ?? 0} test{(ch.tests?.length ?? 0) !== 1 ? "s" : ""}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-text-muted/30 group-hover:text-primary" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
