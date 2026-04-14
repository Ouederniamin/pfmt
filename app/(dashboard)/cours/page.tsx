import Link from "next/link";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { BookOpen, ChevronRight, Clock, Search } from "lucide-react";
import { CoursSearch } from "@/components/cours-search";

export const dynamic = "force-dynamic";

const CHAPITRE_ICONS = ["🩺", "🔬", "📋", "🧬"];

export default async function CoursListPage() {
  const { userId } = await auth();

  const chapitres = await db.chapitre.findMany({
    orderBy: { numero: "asc" },
    include: {
      tests: { select: { id: true } },
    },
  });

  // Fetch progress + test results for current user
  let progressMap: Record<string, { started: boolean; completed: boolean }> = {};
  let testResultsMap: Record<string, { completed: number; total: number; bestPct: number }> = {};

  if (userId) {
    const [progressRows, testResults] = await Promise.all([
      db.courseProgress.findMany({ where: { clerkUserId: userId } }),
      db.testResult.findMany({ where: { clerkUserId: userId } }),
    ]);

    for (const p of progressRows) {
      progressMap[p.chapitreId] = { started: true, completed: p.completed };
    }

    // Group test results by chapitreId
    for (const chap of chapitres) {
      const chapTestIds = new Set(chap.tests.map((t) => t.id));
      const chapResults = testResults.filter((r) => chapTestIds.has(r.testId));
      const uniqueTestsDone = new Set(chapResults.map((r) => r.testId));
      const bestScores = [...uniqueTestsDone].map((testId) => {
        const attempts = chapResults.filter((r) => r.testId === testId);
        return Math.max(...attempts.map((a) => a.percentage));
      });
      testResultsMap[chap.id] = {
        completed: uniqueTestsDone.size,
        total: chap.tests.length,
        bestPct: bestScores.length > 0 ? Math.round(bestScores.reduce((a, b) => a + b, 0) / bestScores.length) : 0,
      };
    }
  }

  const chapitresWithProgress = chapitres.map((c: any, i: number) => ({
    id: c.id,
    numero: c.numero,
    titre: c.titre,
    description: c.description,
    testCount: c.tests.length,
    icon: CHAPITRE_ICONS[i] || "📖",
    progress: progressMap[c.id] || { started: false, completed: false },
    testStats: testResultsMap[c.id] || { completed: 0, total: 0, bestPct: 0 },
  }));

  return (
    <>
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-accent-gold font-semibold uppercase tracking-widest mb-2">
          <BookOpen className="h-4 w-4" />
          Programme
        </div>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">
          Chapitres disponibles
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-text-muted">
          Parcourez les chapitres disponibles.
          Chaque chapitre contient un cours, des fiches de révision
          et des QCM interactifs — Faculté de Médecine de Tunis.
        </p>
      </div>

      <CoursSearch chapitres={chapitresWithProgress} />
    </>
  );
}
