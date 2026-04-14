"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  Star,
  Trophy,
  RotateCcw,
  ArrowRight,
  Target,
  Sparkles,
  Medal,
  Flame,
  Zap,
  Award,
  TrendingUp,
  Shield,
} from "lucide-react";

type Option = {
  id: string;
  texte: string;
  correct: boolean;
  justification?: string;
};

type Question = {
  id: string;
  ordre: number;
  enonce: string;
  contexte?: string | null;
  options: Option[];
};

type TestPlayerProps = {
  testId: string;
  chapitreId: string;
  type: "QCM" | "CAS_CLINIQUE" | "VRAI_FAUX";
  questions: Question[];
  onComplete?: (correct: number, total: number) => void;
};

export function TestPlayer({ testId, chapitreId, type, questions, onComplete }: TestPlayerProps) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Set<string>>>({});
  // Track which questions have been validated
  const [validated, setValidated] = useState<Set<number>>(new Set());
  const [showResults, setShowResults] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);

  // Gamification state
  const [runningXP, setRunningXP] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lastXPGain, setLastXPGain] = useState<number | null>(null);

  const current = questions[index];
  const isCurrentValidated = validated.has(index);
  const selectedIds = answers[current?.id] ?? new Set<string>();

  const toggleOption = (questionId: string, optionId: string) => {
    if (isCurrentValidated) return;
    setAnswers((prev) => {
      const selected = new Set(prev[questionId] ?? []);
      if (selected.has(optionId)) {
        selected.delete(optionId);
      } else {
        selected.add(optionId);
      }
      return { ...prev, [questionId]: selected };
    });
  };

  const validateCurrent = () => {
    setValidated((prev) => new Set(prev).add(index));
    const correct = isQuestionCorrect(current);
    if (correct) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      const gain = 10 + (newStreak >= 5 ? 5 : newStreak >= 3 ? 3 : 0); // streak bonus
      setRunningXP((prev) => prev + gain);
      setLastXPGain(gain);
    } else {
      setStreak(0);
      setLastXPGain(0);
    }
    // Clear XP gain display after animation
    setTimeout(() => setLastXPGain(null), 1800);
  };

  const isQuestionCorrect = (q: Question) => {
    const selected = answers[q.id] ?? new Set<string>();
    const correctIds = new Set(q.options.filter((o) => o.correct).map((o) => o.id));
    if (selected.size !== correctIds.size) return false;
    for (const id of selected) {
      if (!correctIds.has(id)) return false;
    }
    return true;
  };

  const results = useMemo(() => {
    const correct = questions.filter((q) => isQuestionCorrect(q)).length;
    return { correct, total: questions.length, percentage: questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, questions]);

  const stars = results.percentage <= 40 ? 1 : results.percentage <= 70 ? 2 : 3;

  const goNext = () => {
    if (index < questions.length - 1) {
      setIndex(index + 1);
    }
  };

  const goPrev = () => {
    if (index > 0) {
      setIndex(index - 1);
    }
  };

  const finishTest = async () => {
    setShowResults(true);

    // Save results to API
    setSaving(true);
    try {
      const answersObj: Record<string, string[]> = {};
      for (const [qId, selected] of Object.entries(answers)) {
        answersObj[qId] = [...selected];
      }
      const res = await fetch("/api/test-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId,
          chapitreId,
          score: results.correct,
          totalQuestions: results.total,
          percentage: results.percentage,
          answers: answersObj,
        }),
      });
      if (res.ok) {
        setSaved(true);
      }
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setAnswers({});
    setValidated(new Set());
    setIndex(0);
    setShowResults(false);
    setSaved(false);
    setSaveError(false);
    setRunningXP(0);
    setStreak(0);
    setLastXPGain(null);
  };

  if (questions.length === 0) {
    return <p className="text-sm text-text-muted">Aucune question disponible.</p>;
  }

  /* ═══ RESULTS SCREEN ═══ */
  if (showResults) {
    return (
      <ResultsScreen
        results={results}
        stars={stars}
        questions={questions}
        isQuestionCorrect={isQuestionCorrect}
        saving={saving}
        saved={saved}
        saveError={saveError}
        onReset={reset}
        onBack={onComplete ? () => onComplete(results.correct, results.total) : undefined}
        onQuestionClick={(qi) => { setShowResults(false); setIndex(qi); }}
      />
    );
  }

  /* ═══ QUESTION VIEW ═══ */
  const correctIds = new Set(current.options.filter((o) => o.correct).map((o) => o.id));
  const correctCount = correctIds.size;

  return (
    <div className="space-y-3">
      {/* Compact progress: dots + bar merged into one row */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1 shrink-0">
          {questions.map((q, qi) => {
            const isDone = validated.has(qi);
            const isCorrect = isDone && isQuestionCorrect(q);
            const isCurrent = qi === index;
            return (
              <button
                key={q.id}
                onClick={() => setIndex(qi)}
                className={cn(
                  "relative flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold transition-all",
                  isCurrent && !isDone && "border-2 border-primary bg-primary/10 text-primary",
                  isDone && isCorrect && "bg-green-100 text-green-700",
                  isDone && !isCorrect && "bg-red-100 text-red-700",
                  !isCurrent && !isDone && "bg-primary/5 text-text-muted hover:bg-primary/10"
                )}
              >
                {isDone ? (isCorrect ? "✓" : "✗") : qi + 1}
                {isDone && isCorrect && (
                  <Star className="absolute -right-1 -top-1 h-3 w-3 fill-accent-gold text-accent-gold animate-star-pop drop-shadow-sm" />
                )}
              </button>
            );
          })}
        </div>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-primary/10">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${((index + 1) / questions.length) * 100}%` }}
          />
        </div>
        {validated.size > 0 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-semibold text-text-muted">
              {[...validated].filter((vi) => isQuestionCorrect(questions[vi])).length}/{validated.size}
            </span>
            {runningXP > 0 && (
              <span className="flex items-center gap-0.5 rounded-full bg-accent-gold/10 px-1.5 py-0.5 text-[10px] font-bold text-accent-gold">
                <Zap className="h-2.5 w-2.5" />
                {runningXP}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Clinical context */}
      {type === "CAS_CLINIQUE" && current.contexte && (
        <div className="rounded-lg border border-accent-gold/20 bg-warm-cream px-3 py-2.5 text-sm leading-relaxed text-foreground">
          {current.contexte}
        </div>
      )}

      {/* Question text */}
      <div>
        <h4 className="font-serif text-[15px] font-semibold text-foreground leading-snug">
          {current.enonce}
        </h4>
        {correctCount > 1 && !isCurrentValidated && (
          <p className="mt-1 text-[11px] text-text-muted">
            ({correctCount} réponses correctes — cochez toutes les bonnes réponses)
          </p>
        )}
      </div>

      {/* Options */}
      <div className="space-y-1.5">
        {current.options.map((option) => {
          const isSelected = selectedIds.has(option.id);
          const isCorrect = option.correct;
          const showResult = isCurrentValidated;

          return (
            <div key={option.id} className="space-y-0.5">
              <button
                type="button"
                onClick={() => toggleOption(current.id, option.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg border-2 px-3 py-2.5 text-left text-sm transition-all",
                  showResult && isCorrect
                    ? "border-green-400 bg-green-50"
                    : showResult && isSelected && !isCorrect
                      ? "border-red-300 bg-red-50"
                      : isSelected
                        ? "border-primary bg-primary/5"
                        : "border-primary/8 hover:border-primary/20 hover:bg-muted-cream/50"
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 text-[10px] font-bold transition-all",
                    showResult && isCorrect
                      ? "border-green-500 bg-green-500 text-white"
                      : showResult && isSelected && !isCorrect
                        ? "border-red-400 bg-red-400 text-white"
                        : isSelected
                          ? "border-primary bg-primary text-white"
                          : "border-primary/20 text-text-muted"
                  )}
                >
                  {showResult
                    ? (isCorrect ? "✓" : isSelected ? "✗" : option.id.toUpperCase())
                    : option.id.toUpperCase()
                  }
                </span>
                <span className="flex-1 leading-snug">{option.texte}</span>
              </button>
              {showResult && option.justification && (
                <div className={cn(
                  "ml-8 rounded px-2.5 py-1.5 text-xs leading-relaxed",
                  isCorrect ? "bg-green-50 text-green-800 border border-green-100" : "bg-red-50 text-red-800 border border-red-100"
                )}>
                  {option.justification}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Result feedback for current question */}
      {isCurrentValidated && (
        <div className={cn(
          "relative flex items-center gap-2.5 rounded-lg border-2 px-3 py-2.5 overflow-hidden",
          isQuestionCorrect(current)
            ? "border-green-200 bg-green-50"
            : "border-red-200 bg-red-50"
        )}>
          {isQuestionCorrect(current) ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
          ) : (
            <XCircle className="h-5 w-5 shrink-0 text-red-600" />
          )}
          <p className={cn(
            "text-sm font-semibold flex-1",
            isQuestionCorrect(current) ? "text-green-800" : "text-red-800"
          )}>
            {isQuestionCorrect(current)
              ? "Bonne réponse !"
              : `Réponses correctes : ${[...correctIds].map((id) => id.toUpperCase()).join(", ")}`
            }
          </p>
          {/* XP gain badge */}
          {lastXPGain !== null && isQuestionCorrect(current) && (
            <span className="animate-xp-pop flex items-center gap-1 rounded-full bg-accent-gold/15 px-2 py-0.5 text-xs font-bold text-accent-gold">
              <Zap className="h-3 w-3" />
              +{lastXPGain} XP
            </span>
          )}
          {lastXPGain === 0 && !isQuestionCorrect(current) && (
            <span className="animate-xp-pop flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-500">
              +0 XP
            </span>
          )}
          {/* Streak indicator */}
          {isQuestionCorrect(current) && streak >= 2 && (
            <span className="animate-xp-pop flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-600" style={{ animationDelay: "0.15s" }}>
              <Flame className="h-3 w-3" />
              {streak}x
            </span>
          )}
          {/* Floating star for correct */}
          {isQuestionCorrect(current) && (
            <Star className="absolute -right-1 -top-1 h-6 w-6 fill-accent-gold text-accent-gold animate-star-pop opacity-80" />
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={goPrev}
          disabled={index === 0}
          className="gap-1.5"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Précédent
        </Button>

        {!isCurrentValidated ? (
          <Button
            size="sm"
            onClick={validateCurrent}
            disabled={selectedIds.size === 0}
            className="gap-1.5"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Valider
          </Button>
        ) : index < questions.length - 1 ? (
          <Button
            size="sm"
            onClick={goNext}
            className="gap-1.5"
          >
            Suivante
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        ) : validated.size === questions.length ? (
          <Button
            size="sm"
            onClick={finishTest}
            className="gap-1.5 bg-accent-gold hover:bg-accent-gold/90 text-white shadow-sm"
          >
            <Trophy className="h-3.5 w-3.5" />
            Voir les résultats
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              // Find first unvalidated question
              const next = questions.findIndex((_, qi) => !validated.has(qi));
              if (next >= 0) setIndex(next);
            }}
            className="gap-1.5"
          >
            Question suivante non répondue
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   GAMIFIED RESULTS SCREEN
   ══════════════════════════════════════════════════════════ */

type ResultsScreenProps = {
  results: { correct: number; total: number; percentage: number };
  stars: number;
  questions: Question[];
  isQuestionCorrect: (q: Question) => boolean;
  saving: boolean;
  saved: boolean;
  saveError: boolean;
  onReset: () => void;
  onBack?: () => void;
  onQuestionClick: (idx: number) => void;
};

/* XP points: 10 per correct answer + bonuses */
function calcXP(correct: number, total: number, pct: number) {
  let xp = correct * 10;
  if (pct === 100) xp += 50;       // Perfect bonus
  else if (pct >= 80) xp += 25;    // Excellence bonus
  else if (pct >= 60) xp += 10;    // Good job bonus
  return xp;
}

/* Animated counter hook */
function useAnimatedCounter(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return value;
}

/* Radial gauge SVG */
function ScoreGauge({ percentage, size = 180, strokeWidth = 12 }: { percentage: number; size?: number; strokeWidth?: number }) {
  const [animatedPct, setAnimatedPct] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedPct / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedPct(percentage), 100);
    return () => clearTimeout(timer);
  }, [percentage]);

  const gradientId = `gauge-gradient-${percentage}`;
  const glowColor = percentage >= 80 ? "#059669" : percentage >= 60 ? "#0F4C75" : percentage >= 40 ? "#d97706" : "#e11d48";

  return (
    <svg width={size} height={size} className="drop-shadow-lg">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          {percentage >= 80 ? (
            <>
              <stop offset="0%" stopColor="#059669" />
              <stop offset="100%" stopColor="#10b981" />
            </>
          ) : percentage >= 60 ? (
            <>
              <stop offset="0%" stopColor="#0F4C75" />
              <stop offset="100%" stopColor="#3282b8" />
            </>
          ) : percentage >= 40 ? (
            <>
              <stop offset="0%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#f59e0b" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#e11d48" />
              <stop offset="100%" stopColor="#f43f5e" />
            </>
          )}
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Background track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(15,76,117,0.06)"
        strokeWidth={strokeWidth}
      />
      {/* Animated arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{
          transition: "stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)",
          filter: `drop-shadow(0 0 6px ${glowColor}40)`,
        }}
      />
    </svg>
  );
}

/* Confetti particles (CSS-only) */
function Confetti({ count = 24 }: { count?: number }) {
  const colors = ["#c9a96e", "#0F4C75", "#059669", "#f59e0b", "#a94064", "#3282b8"];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: count }).map((_, i) => {
        const color = colors[i % colors.length];
        const left = Math.random() * 100;
        const delay = Math.random() * 2;
        const size = 4 + Math.random() * 6;
        const duration = 2.5 + Math.random() * 2;
        const shape = i % 3 === 0 ? "rounded-full" : i % 3 === 1 ? "rounded-sm" : "";
        return (
          <div
            key={i}
            className={cn("absolute animate-confetti-fall", shape)}
            style={{
              left: `${left}%`,
              top: "-10px",
              width: `${size}px`,
              height: i % 3 === 2 ? `${size * 2.5}px` : `${size}px`,
              backgroundColor: color,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
              opacity: 0.85,
            }}
          />
        );
      })}
    </div>
  );
}

function ResultsScreen({
  results,
  stars: starCount,
  questions,
  isQuestionCorrect,
  saving,
  saved,
  saveError,
  onReset,
  onBack,
  onQuestionClick,
}: ResultsScreenProps) {
  const xp = calcXP(results.correct, results.total, results.percentage);
  const animatedPct = useAnimatedCounter(results.percentage, 1500);
  const animatedXP = useAnimatedCounter(xp, 1800);
  const animatedCorrect = useAnimatedCounter(results.correct, 1200);

  const grade = results.percentage >= 80 ? "excellent" : results.percentage >= 60 ? "bien" : results.percentage >= 40 ? "moyen" : "insuffisant";

  const medals = {
    excellent: { icon: Trophy, label: "Médaille d'Or", color: "text-amber-500", bg: "bg-gradient-to-br from-amber-100 via-yellow-50 to-amber-100", border: "border-amber-300/60", ring: "ring-amber-200/50", emoji: "🥇" },
    bien:      { icon: Medal, label: "Médaille d'Argent", color: "text-slate-500", bg: "bg-gradient-to-br from-slate-100 via-gray-50 to-slate-100", border: "border-slate-300/60", ring: "ring-slate-200/50", emoji: "🥈" },
    moyen:     { icon: Award, label: "Médaille de Bronze", color: "text-orange-600", bg: "bg-gradient-to-br from-orange-100 via-amber-50 to-orange-100", border: "border-orange-300/60", ring: "ring-orange-200/50", emoji: "🥉" },
    insuffisant: { icon: Shield, label: "Continue tes efforts", color: "text-slate-400", bg: "bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100", border: "border-slate-200/60", ring: "ring-slate-100/50", emoji: "💪" },
  }[grade];

  const MedalIcon = medals.icon;

  // Earned badges
  const badges: { icon: React.ComponentType<{ className?: string }>; label: string; earned: boolean; color: string }[] = [
    { icon: Flame, label: "Score Parfait", earned: results.percentage === 100, color: "text-orange-500" },
    { icon: Zap, label: "Excellence", earned: results.percentage >= 80 && results.percentage < 100, color: "text-amber-500" },
    { icon: TrendingUp, label: "Progression", earned: results.percentage >= 50, color: "text-emerald-500" },
    { icon: Target, label: "Précision", earned: results.correct >= Math.ceil(results.total * 0.7), color: "text-primary" },
  ];

  const earnedBadges = badges.filter((b) => b.earned);

  return (
    <div className="relative space-y-6">
      {/* Confetti for great scores */}
      {results.percentage >= 60 && <Confetti count={results.percentage >= 80 ? 30 : 16} />}

      {/* ─── Hero section with medal + gauge ─── */}
      <div className={cn(
        "relative overflow-hidden rounded-3xl border-2 p-6 sm:p-8 text-center",
        medals.border,
        medals.bg,
      )}>
        {/* Decorative background glow */}
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
          style={{
            background: grade === "excellent"
              ? "radial-gradient(circle, rgba(201,169,110,0.3), transparent 70%)"
              : grade === "bien"
                ? "radial-gradient(circle, rgba(15,76,117,0.2), transparent 70%)"
                : "radial-gradient(circle, rgba(148,163,184,0.15), transparent 70%)",
          }}
        />

        {/* Medal icon with pulse ring */}
        <div className="relative mx-auto mb-1 flex items-center justify-center animate-result-enter">
          <div className={cn(
            "absolute h-24 w-24 rounded-full animate-ping-slow opacity-20",
            grade === "excellent" ? "bg-amber-300" : grade === "bien" ? "bg-primary-light" : "bg-slate-300",
          )} />
          <div className={cn(
            "relative flex h-20 w-20 items-center justify-center rounded-full border-2 shadow-lg",
            medals.border, medals.bg,
            `ring-4 ${medals.ring}`,
          )}>
            <MedalIcon className={cn("h-9 w-9", medals.color)} />
          </div>
        </div>

        {/* Medal label */}
        <p className={cn("mt-3 text-xs font-bold uppercase tracking-[0.2em]", medals.color, "animate-result-enter")}
          style={{ animationDelay: "0.15s" }}>
          {medals.label}
        </p>

        {/* Score gauge */}
        <div className="relative mx-auto mt-4 animate-result-enter" style={{ animationDelay: "0.3s", width: 180, height: 180 }}>
          <ScoreGauge percentage={results.percentage} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-serif text-4xl font-black tracking-tight text-foreground">
              {animatedPct}<span className="text-lg">%</span>
            </span>
          </div>
        </div>

        {/* Correct count */}
        <p className="mt-3 text-sm text-text-muted animate-result-enter" style={{ animationDelay: "0.45s" }}>
          <span className="font-bold text-foreground">{animatedCorrect}</span>
          {" "}/ {results.total} question{results.total !== 1 ? "s" : ""} correcte{results.correct !== 1 ? "s" : ""}
        </p>

        {/* Stars */}
        <div className="mt-4 flex items-center justify-center gap-2 animate-result-enter" style={{ animationDelay: "0.55s" }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Star
              key={i}
              className={cn(
                "h-9 w-9 transition-all duration-700",
                i < starCount
                  ? "fill-accent-gold text-accent-gold drop-shadow-md animate-star-pop"
                  : "text-primary/10"
              )}
              style={i < starCount ? { animationDelay: `${0.8 + i * 0.2}s` } : undefined}
            />
          ))}
        </div>

        {/* Save status — subtle, bottom of hero */}
        <div className="mt-4 text-xs text-text-muted/70 animate-result-enter" style={{ animationDelay: "0.65s" }}>
          {saving && <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /> Sauvegarde…</span>}
          {saved && <span className="text-emerald-600">✓ Résultat enregistré</span>}
          {saveError && <span className="text-rose-500">⚠ Échec — score affiché mais non enregistré</span>}
        </div>
      </div>

      {/* ─── Points & badges strip ─── */}
      <div className="grid gap-3 sm:grid-cols-2 animate-result-enter" style={{ animationDelay: "0.5s" }}>
        {/* XP Card */}
        <div className="flex items-center gap-4 rounded-2xl border border-accent-gold/20 bg-gradient-to-r from-amber-50/80 to-warm-cream p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-gold/10">
            <Zap className="h-6 w-6 text-accent-gold" />
          </div>
          <div>
            <p className="text-2xl font-black text-foreground tabular-nums">+{animatedXP} <span className="text-sm font-bold text-accent-gold">XP</span></p>
            <p className="text-[11px] text-text-muted">
              {results.correct * 10} base{results.percentage >= 60 ? ` + ${xp - results.correct * 10} bonus` : ""}
            </p>
          </div>
        </div>

        {/* Badges Card */}
        <div className="flex items-center gap-4 rounded-2xl border border-primary/8 bg-gradient-to-r from-primary/3 to-surface p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/8">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{earnedBadges.length} badge{earnedBadges.length !== 1 ? "s" : ""}</p>
            <div className="mt-0.5 flex gap-1.5">
              {earnedBadges.length > 0 ? earnedBadges.map((b, i) => (
                <span key={i} title={b.label} className={cn("flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm", b.color)}>
                  <b.icon className="h-3.5 w-3.5" />
                </span>
              )) : (
                <span className="text-[11px] text-text-muted">Continuez vos efforts !</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Accuracy bar chart ─── */}
      <div className="rounded-2xl border border-primary/8 bg-surface p-5 animate-result-enter" style={{ animationDelay: "0.6s" }}>
        <h4 className="flex items-center gap-2 font-serif text-sm font-bold text-foreground mb-4">
          <Target className="h-4 w-4 text-accent-gold" />
          Détail par question
        </h4>

        {/* Visual accuracy bar */}
        <div className="mb-4 flex items-center gap-1.5 rounded-xl bg-primary/4 p-2">
          {questions.map((q, qi) => {
            const correct = isQuestionCorrect(q);
            return (
              <button
                key={q.id}
                onClick={() => onQuestionClick(qi)}
                title={`Q${qi + 1}: ${correct ? "Correct" : "Incorrect"}`}
                className={cn(
                  "flex-1 h-6 rounded-md transition-all duration-500 hover:scale-110 hover:ring-2 cursor-pointer min-w-[12px]",
                  correct
                    ? "bg-emerald-400 hover:ring-emerald-200"
                    : "bg-rose-400 hover:ring-rose-200",
                )}
                style={{ animationDelay: `${0.7 + qi * 0.05}s` }}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between text-[11px] text-text-muted mb-5">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-400" />
            {results.correct} correcte{results.correct !== 1 ? "s" : ""}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-rose-400" />
            {results.total - results.correct} incorrecte{(results.total - results.correct) !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Question list */}
        <div className="space-y-1.5">
          {questions.map((q, qi) => {
            const correct = isQuestionCorrect(q);
            return (
              <button
                key={q.id}
                onClick={() => onQuestionClick(qi)}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all hover:shadow-sm",
                  correct
                    ? "border-emerald-200/70 bg-emerald-50/40 hover:bg-emerald-50/80"
                    : "border-rose-200/70 bg-rose-50/40 hover:bg-rose-50/80"
                )}
              >
                <div className={cn(
                  "relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                  correct ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                )}>
                  {correct ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                  {correct && (
                    <Star className="absolute -right-1.5 -top-1.5 h-3.5 w-3.5 fill-accent-gold text-accent-gold drop-shadow-sm" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    Q{qi + 1}. {q.enonce}
                  </p>
                </div>
                <span className={cn(
                  "shrink-0 flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold",
                  correct ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                )}>
                  {correct && <Zap className="h-2.5 w-2.5 text-accent-gold" />}
                  {correct ? "+10 XP" : "+0 XP"}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Actions ─── */}
      <div className="flex flex-wrap items-center justify-center gap-3 animate-result-enter" style={{ animationDelay: "0.7s" }}>
        <Button onClick={onReset} variant="outline" className="gap-2 rounded-xl">
          <RotateCcw className="h-4 w-4" />
          Refaire le test
        </Button>
        {onBack && (
          <Button onClick={onBack} className="gap-2 rounded-xl">
            <ArrowRight className="h-4 w-4" />
            Retour aux tests
          </Button>
        )}
      </div>
    </div>
  );
}
