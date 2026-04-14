"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { useUser, SignInButton } from "@clerk/nextjs";
import { TestPlayer } from "@/components/test-player";
import { FicheResume } from "@/components/fiche-resume";
import { VideoEmbed } from "@/components/video-embed";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  FileText,
  Play,
  ClipboardCheck,
  ListOrdered,
  CheckCircle2,
  Download,
  RotateCcw,
  ArrowRight,
  Star,
  GraduationCap,
  Award,
  Sparkles,
  Trophy,
  LogIn,
  ExternalLink,
  Target,
  Flame,
  Zap,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

type SommaireEntry = {
  titre: string;
  page: number;
};

type TestType = {
  id: string;
  titre: string;
  type: "QCM" | "CAS_CLINIQUE" | "VRAI_FAUX";
  dansLeCours: boolean;
  questions: {
    id: string;
    ordre: number;
    enonce: string;
    contexte?: string | null;
    options: Array<{ id: string; texte: string; correct: boolean; justification?: string }>;
  }[];
};

type ReaderProps = {
  chapitreId: string;
  titre: string;
  sommaire: SommaireEntry[];
  conclusion?: string | null;
  conclusionFileUrl?: string | null;
  conclusionFileName?: string | null;
  ficheResume?: string | null;
  ficheResumeFileUrl?: string | null;
  ficheResumeFileName?: string | null;
  rappelCoursFileUrl?: string | null;
  rappelCoursFileName?: string | null;
  videoUrl?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  tests: TestType[];
  nextChapter?: { id: string; titre: string; numero: number };
  prevChapter?: { id: string; titre: string; numero: number };
};

type SectionId = "cours" | "conclusion" | "rappel" | "fiche" | "video";

const SECTIONS: { id: SectionId; label: string; icon: React.ElementType }[] = [
  { id: "cours", label: "Cours", icon: BookOpen },
  { id: "conclusion", label: "Conclusion", icon: CheckCircle2 },
  { id: "rappel", label: "Rappel de cours", icon: RotateCcw },
  { id: "fiche", label: "Fiche résumé", icon: FileText },
  { id: "video", label: "Vidéo", icon: Play },
];

export function CoursReader({
  chapitreId, titre, sommaire, conclusion, conclusionFileUrl, conclusionFileName,
  ficheResume, ficheResumeFileUrl, ficheResumeFileName,
  rappelCoursFileUrl, rappelCoursFileName,
  videoUrl, fileUrl, fileName, tests,
  nextChapter, prevChapter,
}: ReaderProps) {
  const { user } = useUser();
  const isAuthenticated = !!user;

  const [activeSection, setActiveSection] = useState<SectionId>("cours");
  const [tocOpen, setTocOpen] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const inCourseTests = useMemo(() => tests.filter((t) => t.dansLeCours), [tests]);
  const outCourseTests = useMemo(() => tests.filter((t) => !t.dansLeCours), [tests]);
  const allTests = useMemo(() => [...inCourseTests, ...outCourseTests], [inCourseTests, outCourseTests]);

  /* ─── Test mode state ─── */
  const [testMode, setTestMode] = useState(false);
  const [activeTestId, setActiveTestId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { correct: number; total: number }>>({});

  /* ─── Previous results from DB (best scores) ─── */
  const [bestScores, setBestScores] = useState<Record<string, { correct: number; total: number; percentage: number }>>({});

  // Load previous results on mount (only when authenticated)
  useEffect(() => {
    if (!isAuthenticated) return;
    fetch(`/api/test-results?chapitreId=${chapitreId}`)
      .then((res) => res.json())
      .then((data) => {
        const bests: Record<string, { correct: number; total: number; percentage: number }> = {};
        for (const r of data.results || []) {
          if (!bests[r.testId] || r.percentage > bests[r.testId].percentage) {
            bests[r.testId] = { correct: r.score, total: r.totalQuestions, percentage: r.percentage };
          }
        }
        setBestScores(bests);
        // Pre-fill testResults with best scores so test hub shows them
        const prefilled: Record<string, { correct: number; total: number }> = {};
        for (const [testId, best] of Object.entries(bests)) {
          prefilled[testId] = { correct: best.correct, total: best.total };
        }
        setTestResults(prefilled);
      })
      .catch((err) => console.error("[cours-reader] Failed to load test results:", err));
  }, [chapitreId, isAuthenticated]);

  // Track course progress (only when authenticated)
  const trackProgress = useCallback(() => {
    if (!isAuthenticated) return;
    fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapitreId }),
    }).catch((err) => console.error("[cours-reader] Failed to track progress:", err));
  }, [chapitreId, isAuthenticated]);

  useEffect(() => {
    trackProgress();
  }, [trackProgress]);

  const handleTestComplete = (testId: string, correct: number, total: number) => {
    setTestResults((prev) => ({ ...prev, [testId]: { correct, total } }));
    setActiveTestId(null);
  };

  const navigateToPage = (pageNum: number) => {
    if (iframeRef.current && fileUrl) {
      iframeRef.current.src = `${fileUrl}#page=${pageNum}`;
    }
  };

  /* ═══════════════════════════════════════════
     TEST MODE — replaces entire course view
     ═══════════════════════════════════════════ */
  if (testMode) {
    /* ── Auth gate: require sign-in to take tests ── */
    if (!isAuthenticated) {
      return (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent-gold mb-1">
                <ClipboardCheck className="h-3.5 w-3.5" />
                Évaluation
              </div>
              <h1 className="font-serif text-xl font-bold tracking-tight text-foreground md:text-2xl">
                {titre}
              </h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTestMode(false)}
              className="gap-1.5 text-xs shrink-0"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Retour au cours
            </Button>
          </div>

          <div className="flex flex-col items-center justify-center rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/3 via-warm-cream to-surface px-6 py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <LogIn className="h-7 w-7 text-primary" />
            </div>
            <h2 className="font-serif text-lg font-bold text-foreground">
              Connectez-vous pour passer les tests
            </h2>
            <p className="mt-2 max-w-sm text-sm text-text-muted leading-relaxed">
              Créez un compte gratuit pour accéder aux QCM, suivre votre progression et obtenir vos résultats.
            </p>
            <SignInButton mode="modal">
              <button className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-primary/20 transition-colors hover:bg-primary/90">
                <LogIn className="h-4 w-4" />
                Se connecter
              </button>
            </SignInButton>
            <p className="mt-3 text-xs text-text-muted">
              Pas encore de compte ?{" "}
              <SignInButton mode="modal">
                <button className="font-semibold text-primary hover:underline">Inscrivez-vous gratuitement</button>
              </SignInButton>
            </p>
          </div>
        </div>
      );
    }

    /* ── Active test (playing) ── */
    if (activeTestId) {
      const test = allTests.find((t) => t.id === activeTestId);
      if (!test) { setActiveTestId(null); return null; }
      return (
        <div className="flex flex-col gap-3">
          {/* Compact header: back + title + badge inline */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTestId(null)}
              className="h-7 w-7 p-0 shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="font-serif text-base font-bold text-foreground truncate">{test.titre}</h2>
            <Badge className={cn(
              "text-[10px] font-bold uppercase shrink-0",
              test.type === "QCM" ? "bg-primary/10 text-primary" : test.type === "VRAI_FAUX" ? "bg-amber-100 text-amber-700" : "bg-accent-rose/10 text-accent-rose"
            )}>
              {test.type === "QCM" ? "QCM" : test.type === "VRAI_FAUX" ? "V/F" : "Cas clinique"}
            </Badge>
            <span className="text-xs text-text-muted shrink-0">{test.questions.length}Q</span>
          </div>
          <TestPlayer
            testId={test.id}
            chapitreId={chapitreId}
            type={test.type}
            questions={test.questions}
            onComplete={(correct, total) => handleTestComplete(test.id, correct, total)}
          />
        </div>
      );
    }

    /* ── Test hub ── */
    const completedCount = Object.keys(testResults).length;
    const totalCorrect = Object.values(testResults).reduce((a, r) => a + r.correct, 0);
    const totalQuestions = Object.values(testResults).reduce((a, r) => a + r.total, 0);
    const globalPct = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    const globalStars = globalPct <= 40 ? 1 : globalPct <= 70 ? 2 : 3;
    const allDone = completedCount === allTests.length && allTests.length > 0;

    // Motivational message based on score
    const getMessage = () => {
      if (globalPct >= 90) return { text: "Exceptionnel ! Vous maîtrisez ce chapitre.", icon: Trophy, color: "text-accent-gold" };
      if (globalPct >= 70) return { text: "Très bien ! Quelques points à revoir.", icon: Sparkles, color: "text-primary" };
      if (globalPct >= 50) return { text: "Pas mal ! Révisez les points manqués.", icon: Award, color: "text-amber-600" };
      return { text: "Continuez à travailler, vous progresserez !", icon: GraduationCap, color: "text-accent-rose" };
    };

    return (
      <div className="flex flex-col gap-6">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent-gold mb-1">
              <ClipboardCheck className="h-3.5 w-3.5" />
              Évaluation
            </div>
            <h1 className="font-serif text-xl font-bold tracking-tight text-foreground md:text-2xl">
              {titre}
            </h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTestMode(false)}
            className="gap-1.5 text-xs shrink-0"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Retour au cours
          </Button>
        </div>

        {/* Completion state — all tests done */}
        {allDone ? (() => {
          const msg = getMessage();
          const MsgIcon = msg.icon;

          // Grade-based theming
          const grade = globalPct >= 80 ? "excellent" : globalPct >= 60 ? "bien" : globalPct >= 40 ? "moyen" : "insuffisant";
          const gradeTheme = {
            excellent: {
              gradient: "from-amber-50 via-yellow-50/80 to-warm-cream",
              border: "border-amber-200/60",
              ring: "ring-amber-100",
              medalBg: "bg-gradient-to-br from-amber-100 to-yellow-50",
              medalIcon: Trophy,
              medalColor: "text-amber-500",
              label: "Excellent !",
              gaugeFill: "text-amber-400",
              accentDot: "bg-amber-300",
              emoji: "🏆",
            },
            bien: {
              gradient: "from-primary/5 via-sky-50/80 to-warm-cream",
              border: "border-primary/20",
              ring: "ring-primary/10",
              medalBg: "bg-gradient-to-br from-primary/10 to-sky-50",
              medalIcon: Award,
              medalColor: "text-primary",
              label: "Très bien !",
              gaugeFill: "text-primary",
              accentDot: "bg-primary/40",
              emoji: "🎯",
            },
            moyen: {
              gradient: "from-orange-50/80 via-amber-50/50 to-warm-cream",
              border: "border-orange-200/50",
              ring: "ring-orange-100/50",
              medalBg: "bg-gradient-to-br from-orange-100 to-amber-50",
              medalIcon: Target,
              medalColor: "text-orange-500",
              label: "Peut mieux faire",
              gaugeFill: "text-orange-400",
              accentDot: "bg-orange-300",
              emoji: "📚",
            },
            insuffisant: {
              gradient: "from-slate-50 via-gray-50/80 to-warm-cream",
              border: "border-slate-200/60",
              ring: "ring-slate-100",
              medalBg: "bg-gradient-to-br from-slate-100 to-gray-50",
              medalIcon: GraduationCap,
              medalColor: "text-slate-500",
              label: "Continuez !",
              gaugeFill: "text-slate-400",
              accentDot: "bg-slate-300",
              emoji: "💪",
            },
          }[grade];

          const GradeMedalIcon = gradeTheme.medalIcon;
          const circumference = 2 * Math.PI * 52;
          const dashOffset = circumference * (1 - globalPct / 100);

          // Earned achievements
          const achievements = [
            { icon: Flame, label: "Score parfait", earned: globalPct === 100, color: "text-orange-500", bg: "bg-orange-50" },
            { icon: Zap, label: "Excellence", earned: globalPct >= 80 && globalPct < 100, color: "text-amber-500", bg: "bg-amber-50" },
            { icon: TrendingUp, label: "Progression", earned: globalPct >= 50, color: "text-emerald-500", bg: "bg-emerald-50" },
            { icon: Target, label: "Précision", earned: totalCorrect >= Math.ceil(totalQuestions * 0.7), color: "text-primary", bg: "bg-primary/5" },
          ];
          const earned = achievements.filter(a => a.earned);

          return (
            <div className={cn(
              "relative overflow-hidden rounded-3xl border-2",
              gradeTheme.border,
              `bg-gradient-to-br ${gradeTheme.gradient}`,
            )}>
              {/* Decorative background elements */}
              <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-accent-gold/5 blur-3xl" />
              <div className="pointer-events-none absolute -left-4 bottom-0 h-32 w-32 rounded-full bg-primary/5 blur-3xl" />
              <div className="pointer-events-none absolute right-6 top-4 flex gap-1.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn("h-1.5 w-1.5 rounded-full animate-pulse", gradeTheme.accentDot)}
                    style={{ animationDelay: `${i * 200}ms`, opacity: 0.3 + i * 0.1 }}
                  />
                ))}
              </div>

              {/* Main content */}
              <div className="relative px-6 pt-8 pb-6">
                <div className="flex flex-col items-center text-center">
                  {/* Medal + Score gauge */}
                  <div className="relative mb-2">
                    {/* Outer glow ring */}
                    <div className={cn(
                      "absolute inset-0 scale-110 rounded-full opacity-30 blur-md",
                      grade === "excellent" ? "bg-amber-200" : grade === "bien" ? "bg-primary/30" : "bg-slate-200"
                    )} />

                    {/* Gauge ring */}
                    <div className="relative flex h-32 w-32 items-center justify-center">
                      <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full -rotate-90">
                        <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="7" className="text-black/[0.04]" />
                        <circle
                          cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="7"
                          strokeLinecap="round"
                          strokeDasharray={circumference}
                          strokeDashoffset={dashOffset}
                          className={cn("transition-all duration-1000 ease-out", gradeTheme.gaugeFill)}
                        />
                      </svg>

                      {/* Center medal icon */}
                      <div className={cn(
                        "relative flex h-16 w-16 items-center justify-center rounded-2xl border shadow-lg",
                        gradeTheme.medalBg, gradeTheme.border, `ring-4 ${gradeTheme.ring}`
                      )}>
                        <GradeMedalIcon className={cn("h-7 w-7", gradeTheme.medalColor)} />
                      </div>
                    </div>
                  </div>

                  {/* Grade label */}
                  <p className={cn(
                    "text-xs font-bold uppercase tracking-[0.2em] mb-2",
                    gradeTheme.medalColor,
                  )}>
                    {gradeTheme.label}
                  </p>

                  {/* Score */}
                  <div className="flex items-baseline gap-1.5 mb-1">
                    <span className="font-serif text-5xl font-black tracking-tight text-foreground">{globalPct}</span>
                    <span className="text-lg font-bold text-text-muted">%</span>
                  </div>

                  {/* Stars */}
                  <div className="flex items-center gap-1.5 mb-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-6 w-6 transition-all",
                          i < globalStars
                            ? "fill-accent-gold text-accent-gold drop-shadow-sm"
                            : "text-primary/10"
                        )}
                      />
                    ))}
                  </div>

                  {/* Score detail */}
                  <p className="text-sm text-text-muted mb-1">
                    <span className="font-bold text-foreground">{totalCorrect}</span> / {totalQuestions} réponses correctes
                  </p>

                  {/* Motivational message */}
                  <div className="flex items-center gap-2 rounded-full border border-primary/8 bg-white/60 px-4 py-1.5 backdrop-blur-sm">
                    <MsgIcon className={cn("h-4 w-4 shrink-0", msg.color)} />
                    <p className={cn("text-xs font-semibold", msg.color)}>{msg.text}</p>
                  </div>
                </div>

                {/* Achievements strip */}
                {earned.length > 0 && (
                  <div className="mt-5 flex justify-center gap-2.5">
                    {earned.map((a, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold shadow-sm",
                          a.bg, a.color, "border-current/10"
                        )}
                      >
                        <a.icon className="h-3.5 w-3.5" />
                        {a.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-primary/10 to-transparent" />

              {/* Navigation CTAs */}
              <div className="flex items-stretch divide-x divide-primary/8 bg-white/30 backdrop-blur-sm">
                <button
                  onClick={() => setTestMode(false)}
                  className="flex flex-1 items-center justify-center gap-2 px-4 py-4 text-sm font-medium text-text-muted transition-all hover:bg-white/60 hover:text-primary"
                >
                  <BookOpen className="h-4 w-4" />
                  Revoir le cours
                </button>
                {nextChapter ? (
                  <Link
                    href={`/cours/${nextChapter.id}`}
                    className="flex flex-1 items-center justify-center gap-2 px-4 py-4 text-sm font-bold text-primary transition-all hover:bg-primary/5"
                  >
                    Chapitre {nextChapter.numero}
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <Link
                    href="/cours"
                    className="flex flex-1 items-center justify-center gap-2 px-4 py-4 text-sm font-bold text-primary transition-all hover:bg-primary/5"
                  >
                    Tous les chapitres
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </div>
          );
        })() : (
          /* In-progress state — richer progress card */
          <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/5 via-warm-cream to-surface p-6">
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/5 blur-2xl" />
            <div className="flex items-center gap-4">
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
                <svg viewBox="0 0 56 56" className="absolute inset-0 h-full w-full -rotate-90">
                  <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="4" className="text-primary/10" />
                  <circle
                    cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 24}`}
                    strokeDashoffset={`${2 * Math.PI * 24 * (1 - (allTests.length > 0 ? completedCount / allTests.length : 0))}`}
                    className="text-primary transition-all duration-700 ease-out"
                  />
                </svg>
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-serif text-base font-bold text-foreground">
                  {completedCount} / {allTests.length} test{allTests.length !== 1 ? "s" : ""} complété{completedCount !== 1 ? "s" : ""}
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-primary/8">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-primary-light transition-all duration-700 ease-out"
                    style={{ width: `${allTests.length > 0 ? (completedCount / allTests.length) * 100 : 0}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-text-muted">
                  {completedCount > 0
                    ? `${totalCorrect}/${totalQuestions} réponses correctes`
                    : "Commencez un test pour évaluer vos connaissances"
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Test list */}
        {inCourseTests.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-1">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/8">
                <BookOpen className="h-3 w-3 text-primary" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-primary/60">Pendant le cours</span>
              <div className="h-px flex-1 bg-gradient-to-r from-primary/10 to-transparent" />
            </div>
            {inCourseTests.map((test) => (
              <TestCard key={test.id} test={test} result={testResults[test.id]} onStart={() => setActiveTestId(test.id)} />
            ))}
          </div>
        )}

        {outCourseTests.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-1">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-gold/10">
                <ClipboardCheck className="h-3 w-3 text-accent-gold" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-accent-gold/70">Après le cours</span>
              <div className="h-px flex-1 bg-gradient-to-r from-accent-gold/15 to-transparent" />
            </div>
            {outCourseTests.map((test) => (
              <TestCard key={test.id} test={test} result={testResults[test.id]} onStart={() => setActiveTestId(test.id)} />
            ))}
          </div>
        )}

        {/* Bottom navigation — visible when all done */}
        {allDone && nextChapter && (
          <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-r from-primary/5 via-surface to-primary/5">
            <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary via-primary-light to-primary/40" />
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/8">
                <ChevronRight className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-accent-gold">Prochain chapitre</p>
                <p className="text-sm font-serif font-bold text-foreground truncate mt-0.5">{nextChapter.titre}</p>
              </div>
              <Link
                href={`/cours/${nextChapter.id}`}
                className="group inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-primary/20 transition-all hover:bg-primary-dark hover:shadow-lg hover:shadow-primary/30"
              >
                Continuer
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     COURSE MODE — normal reading view
     ═══════════════════════════════════════════ */
  return (
    <div className="flex flex-col gap-6">
      {/* Header + Terminer button */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-accent-gold mb-2">
            <BookOpen className="h-4 w-4" />
            Lecture
          </div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            {titre}
          </h1>
        </div>
        {allTests.length > 0 && (
          <Button
            onClick={() => setTestMode(true)}
            className="gap-2 px-5 py-2.5 text-sm font-semibold shadow-md shadow-primary/20 shrink-0"
          >
            <GraduationCap className="h-4 w-4" />
            Passer aux tests
          </Button>
        )}
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-primary/8 bg-surface p-1">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all",
              activeSection === s.id
                ? "bg-primary text-white shadow-sm"
                : "text-text-muted hover:bg-muted-cream hover:text-foreground"
            )}
          >
            <s.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{s.label}</span>
          </button>
        ))}
      </div>

      {/* ─── COURS SECTION (PDF + Sommaire) ─── */}
      {activeSection === "cours" && (
        <div className="flex gap-6">
          {/* Sommaire sidebar */}
          {tocOpen && sommaire.length > 0 && (
            <aside className="hidden w-64 shrink-0 lg:block">
              <div className="sticky top-4 rounded-2xl border border-primary/8 bg-surface p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-accent-gold">
                    <ListOrdered className="h-3.5 w-3.5" />
                    Sommaire
                  </h3>
                  <button
                    onClick={() => setTocOpen(false)}
                    className="text-text-muted hover:text-foreground"
                    aria-label="Fermer le sommaire"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                </div>
                <Separator className="mb-3 bg-primary/8" />
                <ScrollArea className="max-h-[60vh]">
                  <nav className="space-y-0.5">
                    {sommaire.map((entry, i) => {
                      const depth = getHeadingDepth(entry.titre);
                      return (
                        <button
                          key={i}
                          onClick={() => navigateToPage(entry.page)}
                          className={cn(
                            "w-full text-left rounded-lg py-2 text-[13px] leading-snug transition-all",
                            depth === 0 && "px-2.5 font-semibold",
                            depth === 1 && "pl-5 pr-2.5 font-medium",
                            depth >= 2 && "pl-8 pr-2.5 text-[12px]",
                            "text-text-muted hover:bg-primary/5 hover:text-primary"
                          )}
                        >
                          {entry.page > 1 && (
                            <span className="mr-1.5 text-xs font-semibold text-primary/40 tabular-nums">
                              p.{entry.page}
                            </span>
                          )}
                          {entry.titre}
                        </button>
                      );
                    })}
                  </nav>
                </ScrollArea>

                {fileUrl && (
                  <>
                    <Separator className="my-3 bg-primary/8" />
                    <a
                      href={fileUrl}
                      download={fileName || `${titre}.pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 rounded-lg bg-primary/8 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/15"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Télécharger PDF
                    </a>
                  </>
                )}
              </div>
            </aside>
          )}

          {/* Main PDF viewer */}
          <div className="flex-1 min-w-0">
            {!tocOpen && sommaire.length > 0 && (
              <div className="mb-4">
                <button
                  onClick={() => setTocOpen(true)}
                  className="hidden rounded-lg border border-primary/8 p-2 text-text-muted transition hover:bg-muted-cream hover:text-foreground lg:flex items-center gap-2 text-xs font-medium"
                  aria-label="Ouvrir le sommaire"
                >
                  <ListOrdered className="h-4 w-4" />
                  Sommaire
                </button>
              </div>
            )}

            <article className="rounded-2xl border border-primary/8 bg-surface shadow-sm overflow-hidden">
              {fileUrl ? (
                <>
                  {/* Desktop: native iframe PDF viewer */}
                  <iframe
                    ref={iframeRef}
                    src={fileUrl}
                    className="hidden md:block h-[80vh] w-full"
                    title="Document du cours"
                  />
                  {/* Mobile: Google Docs viewer + fallback open button */}
                  <div className="md:hidden">
                    <iframe
                      src={`https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(fileUrl)}`}
                      className="h-[70vh] w-full"
                      title="Document du cours"
                    />
                    <div className="flex items-center gap-2 border-t border-primary/8 p-3">
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Ouvrir le PDF
                      </a>
                      <a
                        href={fileUrl}
                        download={fileName || `${titre}.pdf`}
                        className="flex items-center justify-center gap-2 rounded-lg border border-primary/15 px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/5"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <BookOpen className="h-10 w-10 text-primary/20" />
                  <p className="mt-3 text-sm text-text-muted">
                    Aucun document PDF disponible pour ce chapitre.
                  </p>
                </div>
              )}
            </article>
          </div>
        </div>
      )}

      {/* ─── CONCLUSION ─── */}
      {activeSection === "conclusion" && (
        <article className="rounded-2xl border border-primary/8 bg-surface shadow-sm">
          <div className="border-b border-primary/8 px-6 py-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-serif text-lg font-bold text-foreground">
              <CheckCircle2 className="h-5 w-5 text-accent-gold" />
              Conclusion
            </h2>
            {conclusionFileUrl && (
              <a
                href={conclusionFileUrl}
                download={conclusionFileName || "conclusion.pdf"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark"
              >
                <Download className="h-4 w-4" />
                Télécharger
              </a>
            )}
          </div>
          <div className="px-6 py-5">
            {conclusionFileUrl ? (
              <PdfViewer url={conclusionFileUrl} title="Conclusion PDF" fileName={conclusionFileName || "conclusion.pdf"} />
            ) : conclusion ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-muted">
                {conclusion}
              </p>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <CheckCircle2 className="h-10 w-10 text-primary/20" />
                <p className="mt-3 text-sm text-text-muted">La conclusion sera ajoutée prochainement.</p>
              </div>
            )}
          </div>
        </article>
      )}

      {/* ─── RAPPEL DE COURS ─── */}
      {activeSection === "rappel" && (
        <article className="rounded-2xl border border-primary/8 bg-surface shadow-sm">
          <div className="border-b border-primary/8 px-6 py-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-serif text-lg font-bold text-foreground">
              <RotateCcw className="h-5 w-5 text-accent-gold" />
              Rappel de cours
            </h2>
            {rappelCoursFileUrl && (
              <a
                href={rappelCoursFileUrl}
                download={rappelCoursFileName || "rappel-de-cours.pdf"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark"
              >
                <Download className="h-4 w-4" />
                Télécharger
              </a>
            )}
          </div>
          <div className="px-6 py-5">
            {rappelCoursFileUrl ? (
              <PdfViewer url={rappelCoursFileUrl} title="Rappel de cours PDF" fileName={rappelCoursFileName || "rappel-de-cours.pdf"} />
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <RotateCcw className="h-10 w-10 text-primary/20" />
                <p className="mt-3 text-sm text-text-muted">Le rappel de cours sera ajouté prochainement.</p>
              </div>
            )}
          </div>
        </article>
      )}

      {/* ─── FICHE RÉSUMÉ ─── */}
      {activeSection === "fiche" && (
        <article className="rounded-2xl border border-primary/8 bg-surface shadow-sm">
          <div className="border-b border-primary/8 px-6 py-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-serif text-lg font-bold text-foreground">
              <FileText className="h-5 w-5 text-accent-gold" />
              Fiche résumé
            </h2>
            {ficheResumeFileUrl && (
              <a
                href={ficheResumeFileUrl}
                download={ficheResumeFileName || "fiche-resume.pdf"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark"
              >
                <Download className="h-4 w-4" />
                Télécharger
              </a>
            )}
          </div>
          <div className="px-6 py-5">
            {ficheResumeFileUrl ? (
              <PdfViewer url={ficheResumeFileUrl} title="Fiche résumé PDF" fileName={ficheResumeFileName || "fiche-resume.pdf"} />
            ) : ficheResume ? (
              <FicheResume value={ficheResume} />
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="h-10 w-10 text-primary/20" />
                <p className="mt-3 text-sm text-text-muted">La fiche résumé sera ajoutée prochainement.</p>
              </div>
            )}
          </div>
        </article>
      )}

      {/* ─── VIDEO ─── */}
      {activeSection === "video" && (
        <article className="rounded-2xl border border-primary/8 bg-surface shadow-sm">
          <div className="border-b border-primary/8 px-6 py-4">
            <h2 className="flex items-center gap-2 font-serif text-lg font-bold text-foreground">
              <Play className="h-5 w-5 text-accent-gold" />
              Vidéo
            </h2>
          </div>
          <div className="p-6">
            <VideoEmbed url={videoUrl} />
          </div>
        </article>
      )}
    </div>
  );
}

/* ─── Helpers ─── */
function getHeadingDepth(titre: string): number {
  const numMatch = titre.match(/^(\d+(?:\.\d+)*)/);
  if (numMatch) return Math.min(numMatch[1].split(".").length - 1, 2);
  return 0;
}

/* ─── Mobile-friendly PDF Viewer ─── */
function PdfViewer({ url, title, fileName }: { url: string; title: string; fileName: string }) {
  return (
    <div className="rounded-xl border border-primary/8 overflow-hidden">
      {/* Desktop: native iframe */}
      <iframe
        src={url}
        className="hidden md:block h-[70vh] w-full"
        title={title}
      />
      {/* Mobile: Google Docs viewer + action bar */}
      <div className="md:hidden">
        <iframe
          src={`https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`}
          className="h-[60vh] w-full"
          title={title}
        />
        <div className="flex items-center gap-2 border-t border-primary/8 bg-surface p-3">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
          >
            <ExternalLink className="h-4 w-4" />
            Ouvrir le PDF
          </a>
          <a
            href={url}
            download={fileName}
            className="flex items-center justify-center rounded-lg border border-primary/15 px-3 py-2.5 text-primary transition hover:bg-primary/5"
          >
            <Download className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}

/* ─── Test Card ─── */
function TestCard({
  test,
  result,
  onStart,
}: {
  test: TestType;
  result?: { correct: number; total: number };
  onStart: () => void;
}) {
  const done = !!result;
  const percentage = done ? Math.round((result.correct / result.total) * 100) : 0;
  const stars = percentage <= 40 ? 1 : percentage <= 70 ? 2 : 3;

  const typeBadge = test.type === "QCM"
    ? { label: "QCM", cls: "bg-primary/10 text-primary border-primary/15" }
    : test.type === "VRAI_FAUX"
      ? { label: "V/F", cls: "bg-amber-100 text-amber-700 border-amber-200/50" }
      : { label: "Cas clinique", cls: "bg-accent-rose/10 text-accent-rose border-accent-rose/15" };

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-surface transition-all duration-300",
        done
          ? "border-emerald-200/60 hover:border-emerald-300/70 hover:shadow-md hover:shadow-emerald-100/50"
          : "border-primary/8 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5"
      )}
    >
      {/* Subtle left accent bar */}
      <div className={cn(
        "absolute inset-y-0 left-0 w-0.5 transition-all group-hover:w-1",
        done ? "bg-emerald-400" : "bg-primary/30 group-hover:bg-primary"
      )} />

      <div className="flex items-center gap-4 px-5 py-4">
        {/* Status icon */}
        <div className={cn(
          "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all",
          done
            ? "bg-gradient-to-br from-emerald-100 to-emerald-50 shadow-sm shadow-emerald-200/40"
            : "bg-gradient-to-br from-primary/8 to-primary/3 group-hover:from-primary/12 group-hover:to-primary/5"
        )}>
          {done ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : (
            <ClipboardCheck className="h-5 w-5 text-primary" />
          )}
          {done && percentage >= 80 && (
            <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent-gold text-white shadow-sm">
              <Star className="h-3 w-3 fill-white" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="font-serif text-sm font-bold text-foreground group-hover:text-primary transition-colors">{test.titre}</h3>
            <Badge className={cn("text-[10px] font-bold uppercase border", typeBadge.cls)}>{typeBadge.label}</Badge>
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-xs text-text-muted">
              {test.questions.length} question{test.questions.length !== 1 ? "s" : ""}
            </span>
            {done && (
              <>
                <div className="h-3 w-px bg-primary/10" />
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-foreground">{result.correct}/{result.total}</span>
                  <span className={cn(
                    "rounded-md px-1.5 py-0.5 text-[10px] font-bold",
                    percentage >= 70 ? "bg-emerald-100 text-emerald-700" : percentage >= 50 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                  )}>
                    {percentage}%
                  </span>
                </div>
                <div className="flex items-center gap-0.5 ml-auto">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-3.5 w-3.5",
                        i < stars ? "fill-accent-gold text-accent-gold" : "text-primary/10"
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Action button */}
        <Button
          size="sm"
          variant={done ? "outline" : "default"}
          onClick={onStart}
          className={cn(
            "gap-2 shrink-0 text-xs h-9 rounded-xl transition-all",
            done
              ? "hover:bg-primary/5 hover:border-primary/20"
              : "shadow-md shadow-primary/15 hover:shadow-lg hover:shadow-primary/25"
          )}
        >
          {done ? (
            <>
              <RotateCcw className="h-3.5 w-3.5" />
              Refaire
            </>
          ) : (
            <>
              Commencer
              <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
