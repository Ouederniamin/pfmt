import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { StudentDashboard } from "@/components/student-dashboard";

export const dynamic = "force-dynamic";

export default async function TableauDeBordPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [chapitres, progressRows, testResults] = await Promise.all([
    db.chapitre.findMany({
      orderBy: { numero: "asc" },
      include: { tests: { select: { id: true, titre: true, type: true, questions: { select: { id: true } } } } },
    }),
    db.courseProgress.findMany({ where: { clerkUserId: userId } }),
    db.testResult.findMany({
      where: { clerkUserId: userId },
      orderBy: { completedAt: "desc" },
    }),
  ]);

  const progressMap = Object.fromEntries(progressRows.map((p) => [p.chapitreId, p]));

  // Build per-chapter stats
  const chapitreStats = chapitres.map((c: any) => {
    const progress = progressMap[c.id];
    const chapTestIds = new Set(c.tests.map((t: any) => t.id));
    const chapResults = testResults.filter((r) => chapTestIds.has(r.testId));
    const uniqueTestsDone = new Set(chapResults.map((r) => r.testId));

    // Best score per test
    const bestByTest: Record<string, number> = {};
    for (const r of chapResults) {
      if (!bestByTest[r.testId] || r.percentage > bestByTest[r.testId]) {
        bestByTest[r.testId] = r.percentage;
      }
    }
    const bestScores = Object.values(bestByTest);
    const avgBest = bestScores.length > 0 ? Math.round(bestScores.reduce((a, b) => a + b, 0) / bestScores.length) : 0;

    return {
      id: c.id,
      numero: c.numero,
      titre: c.titre,
      totalTests: c.tests.length,
      testsDone: uniqueTestsDone.size,
      avgScore: avgBest,
      started: !!progress,
      lastAccessed: progress?.lastAccessedAt?.toISOString() || null,
    };
  });

  // Global stats
  const totalChapitres = chapitres.length;
  const chapitresStarted = progressRows.length;
  const totalTests = chapitres.reduce((a: number, c: any) => a + c.tests.length, 0);
  const uniqueTestsDone = new Set(testResults.map((r) => r.testId)).size;
  const allPercentages = testResults.map((r) => r.percentage);
  const avgScore = allPercentages.length > 0 ? Math.round(allPercentages.reduce((a, b) => a + b, 0) / allPercentages.length) : 0;

  // Recent results (last 10)
  const recentResults = testResults.slice(0, 10).map((r) => {
    // Find test info
    let testTitle = "Test";
    let chapitreNumero = 0;
    let chapitreTitre = "";
    for (const c of chapitres) {
      const t = (c.tests as any[]).find((t: any) => t.id === r.testId);
      if (t) {
        testTitle = t.titre;
        chapitreNumero = c.numero;
        chapitreTitre = c.titre;
        break;
      }
    }
    return {
      id: r.id,
      testTitle,
      chapitreNumero,
      chapitreTitre,
      score: r.score,
      total: r.totalQuestions,
      percentage: r.percentage,
      attempt: r.attemptNumber,
      date: r.completedAt.toISOString(),
    };
  });

  return (
    <StudentDashboard
      stats={{
        totalChapitres,
        chapitresStarted,
        totalTests,
        testsDone: uniqueTestsDone,
        avgScore,
        totalAttempts: testResults.length,
      }}
      chapitreStats={chapitreStats}
      recentResults={recentResults}
    />
  );
}
