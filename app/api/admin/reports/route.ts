import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { clerkClient } from "@clerk/nextjs/server";

export async function GET(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format");

  // Fetch all test results
  const results = await db.testResult.findMany({
    orderBy: { completedAt: "desc" },
  });

  // Fetch test and chapter names for the report
  const testIds = [...new Set(results.map((r) => r.testId))];
  const chapitreIds = [...new Set(results.map((r) => r.chapitreId))];

  const [tests, chapitres] = await Promise.all([
    db.test.findMany({ where: { id: { in: testIds } }, select: { id: true, titre: true, type: true } }),
    db.chapitre.findMany({ where: { id: { in: chapitreIds } }, select: { id: true, titre: true, numero: true } }),
  ]);

  const testMap = Object.fromEntries(tests.map((t) => [t.id, t]));
  const chapitreMap = Object.fromEntries(chapitres.map((c) => [c.id, c]));

  // Fetch Clerk users for names
  const userIds = [...new Set(results.map((r) => r.clerkUserId))];
  const client = await clerkClient();
  const userMap: Record<string, { name: string; email: string }> = {};

  // Fetch in batches of 100
  for (let i = 0; i < userIds.length; i += 100) {
    const batch = userIds.slice(i, i + 100);
    const response = await client.users.getUserList({ userId: batch, limit: 100 });
    for (const u of response.data) {
      userMap[u.id] = {
        name: [u.firstName, u.lastName].filter(Boolean).join(" ") || "—",
        email: u.emailAddresses[0]?.emailAddress || "—",
      };
    }
  }

  if (format === "csv") {
    const header = "Étudiant,Email,Chapitre,Test,Type,Score,Total,Pourcentage,Tentative,Date";
    const rows = results.map((r) => {
      const user = userMap[r.clerkUserId] || { name: "—", email: "—" };
      const test = testMap[r.testId];
      const chap = chapitreMap[r.chapitreId];
      return [
        `"${user.name}"`,
        `"${user.email}"`,
        `"${chap ? `Ch.${chap.numero} — ${chap.titre}` : r.chapitreId}"`,
        `"${test?.titre || r.testId}"`,
        `"${test?.type || "—"}"`,
        r.score,
        r.totalQuestions,
        r.percentage,
        r.attemptNumber,
        `"${r.completedAt.toISOString().split("T")[0]}"`,
      ].join(",");
    });

    const csv = [header, ...rows].join("\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="rapport-resultats-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  }

  // JSON format
  const enriched = results.map((r) => ({
    ...r,
    user: userMap[r.clerkUserId] || null,
    test: testMap[r.testId] || null,
    chapitre: chapitreMap[r.chapitreId] || null,
  }));

  return NextResponse.json({ results: enriched, total: enriched.length });
  } catch (err) {
    console.error("[admin/reports] GET error:", err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
