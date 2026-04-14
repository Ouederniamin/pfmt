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
      <div className="flex flex-col gap-5">
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
          return (
            <div className="rounded-2xl border border-accent-gold/15 bg-gradient-to-br from-accent-gold/5 via-warm-cream to-surface overflow-hidden">
              {/* Score hero */}
              <div className="relative px-6 py-5">
                {/* Decorative dots */}
                <div className="absolute top-3 right-4 flex gap-1 opacity-20">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-1.5 w-1.5 rounded-full bg-accent-gold" style={{ animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>

                <div className="flex items-center gap-4">
                  {/* Score circle */}
                  <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
                    <svg viewBox="0 0 80 80" className="absolute inset-0 h-full w-full -rotate-90">
                      <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="5" className="text-primary/8" />
                      <circle
                        cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="5"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 34}`}
                        strokeDashoffset={`${2 * Math.PI * 34 * (1 - globalPct / 100)}`}
                        className={cn(
                          "transition-all duration-1000 ease-out",
                          globalPct >= 70 ? "text-accent-gold" : globalPct >= 50 ? "text-primary" : "text-accent-rose"
                        )}
                      />
                    </svg>
                    <span className="font-serif text-xl font-bold text-foreground">{globalPct}%</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Star key={i} className={cn("h-4 w-4", i < globalStars ? "fill-accent-gold text-accent-gold" : "text-primary/10")} />
                      ))}
                    </div>
                    <p className="font-serif text-base font-bold text-foreground">
                      {totalCorrect}/{totalQuestions} réponses correctes
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <MsgIcon className={cn("h-3.5 w-3.5 shrink-0", msg.color)} />
                      <p className={cn("text-xs font-medium", msg.color)}>{msg.text}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-accent-gold/10" />

              {/* Navigation CTAs */}
              <div className="flex items-stretch divide-x divide-accent-gold/10">
                <button
                  onClick={() => setTestMode(false)}
                  className="flex flex-1 items-center justify-center gap-2 px-4 py-3.5 text-sm font-medium text-text-muted transition-colors hover:bg-primary/3 hover:text-primary"
                >
                  <BookOpen className="h-4 w-4" />
                  Revoir le cours
                </button>
                {nextChapter ? (
                  <Link
                    href={`/cours/${nextChapter.id}`}
                    className="flex flex-1 items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
                  >
                    Chapitre {nextChapter.numero}
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <Link
                    href="/cours"
                    className="flex flex-1 items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
                  >
                    Tous les chapitres
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </div>
          );
        })() : (
          /* In-progress state */
          <div className="rounded-2xl border border-primary/8 bg-gradient-to-br from-primary/3 via-warm-cream to-surface p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-serif text-sm font-bold text-foreground">
                  {completedCount} / {allTests.length} test{allTests.length !== 1 ? "s" : ""} complété{completedCount !== 1 ? "s" : ""}
                </p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-primary/10">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                    style={{ width: `${allTests.length > 0 ? (completedCount / allTests.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
              {completedCount > 0 && (
                <span className="text-xs font-bold text-text-muted tabular-nums">
                  {totalCorrect}/{totalQuestions}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Test list */}
        {inCourseTests.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 px-1">
              <div className="h-px flex-1 bg-primary/10" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary/50">Avant le cours</span>
              <div className="h-px flex-1 bg-primary/10" />
            </div>
            {inCourseTests.map((test) => (
              <TestCard key={test.id} test={test} result={testResults[test.id]} onStart={() => setActiveTestId(test.id)} />
            ))}
          </div>
        )}

        {outCourseTests.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 px-1">
              <div className="h-px flex-1 bg-primary/10" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary/50">Après le cours</span>
              <div className="h-px flex-1 bg-primary/10" />
            </div>
            {outCourseTests.map((test) => (
              <TestCard key={test.id} test={test} result={testResults[test.id]} onStart={() => setActiveTestId(test.id)} />
            ))}
          </div>
        )}

        {/* Bottom navigation — visible when all done, for quick access */}
        {allDone && nextChapter && (
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-primary/15 bg-surface px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Prochain chapitre</p>
              <p className="text-sm font-serif font-semibold text-foreground truncate mt-0.5">{nextChapter.titre}</p>
            </div>
            <Link
              href={`/cours/${nextChapter.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-primary/20 transition-colors hover:bg-primary/90"
            >
              Continuer
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
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
    ? { label: "QCM", cls: "bg-primary/10 text-primary" }
    : test.type === "VRAI_FAUX"
      ? { label: "V/F", cls: "bg-amber-100 text-amber-700" }
      : { label: "Cas clinique", cls: "bg-accent-rose/10 text-accent-rose" };

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-xl border bg-surface px-4 py-3 transition-all",
        done
          ? "border-green-200/60 bg-green-50/20"
          : "border-primary/8 hover:border-primary/15 hover:shadow-sm"
      )}
    >
      <div className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
        done ? "bg-green-100" : "bg-primary/8"
      )}>
        {done ? (
          <CheckCircle2 className="h-4.5 w-4.5 text-green-600" />
        ) : (
          <ClipboardCheck className="h-4.5 w-4.5 text-primary" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-serif text-sm font-bold text-foreground truncate">{test.titre}</h3>
          <Badge className={cn("text-[10px] font-bold uppercase", typeBadge.cls)}>{typeBadge.label}</Badge>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-text-muted">
            {test.questions.length} question{test.questions.length !== 1 ? "s" : ""}
          </span>
          {done && (
            <>
              <span className="text-xs text-text-muted">·</span>
              <span className="text-xs font-semibold text-foreground">{result.correct}/{result.total}</span>
              <span className={cn(
                "text-xs font-bold",
                percentage >= 70 ? "text-green-600" : percentage >= 50 ? "text-amber-600" : "text-accent-rose"
              )}>
                {percentage}%
              </span>
              <div className="flex items-center gap-0.5 ml-auto">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-3 w-3",
                      i < stars ? "fill-accent-gold text-accent-gold" : "text-primary/10"
                    )}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <Button
        size="sm"
        variant={done ? "outline" : "default"}
        onClick={onStart}
        className={cn("gap-1.5 shrink-0 text-xs h-8", !done && "shadow-sm shadow-primary/15")}
      >
        {done ? (
          <>
            <RotateCcw className="h-3 w-3" />
            Refaire
          </>
        ) : (
          <>
            Commencer
            <ArrowRight className="h-3 w-3" />
          </>
        )}
      </Button>
    </div>
  );
}
