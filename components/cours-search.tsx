"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronRight, Clock, Search, CheckCircle2, Star } from "lucide-react";
import { cn } from "@/lib/utils";

type ChapitreWithProgress = {
  id: string;
  numero: number;
  titre: string;
  description: string | null;
  testCount: number;
  icon: string;
  progress: { started: boolean; completed: boolean };
  testStats: { completed: number; total: number; bestPct: number };
};

export function CoursSearch({ chapitres }: { chapitres: ChapitreWithProgress[] }) {
  const [search, setSearch] = useState("");

  const filtered = chapitres.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.titre.toLowerCase().includes(q) ||
      (c.description?.toLowerCase().includes(q) ?? false) ||
      `chapitre ${c.numero}`.includes(q)
    );
  });

  return (
    <>
      {/* Search bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un chapitre…"
          className="w-full rounded-xl border border-primary/10 bg-surface py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-text-muted/60 transition-all focus:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/10"
        />
      </div>

      {/* Cards grid */}
      <div className="grid gap-5 sm:grid-cols-2">
        {filtered.map((chapitre) => {
          const progressPct = chapitre.testStats.total > 0
            ? Math.round((chapitre.testStats.completed / chapitre.testStats.total) * 100)
            : chapitre.progress.started ? 10 : 0;

          return (
            <Link
              key={chapitre.id}
              href={`/cours/${chapitre.id}`}
              className="group relative overflow-hidden rounded-2xl border border-primary/8 bg-surface p-0 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5"
            >
              {/* Top accent bar */}
              <div className={cn(
                "h-1 w-full",
                chapitre.progress.completed
                  ? "bg-gradient-to-r from-green-400 via-green-500 to-green-400"
                  : "bg-gradient-to-r from-primary via-primary-light to-primary"
              )} />

              <div className="p-6">
                {/* Watermark number */}
                <span className="absolute -right-2 -top-2 font-serif text-[6rem] font-bold leading-none text-primary/[0.03]">
                  {String(chapitre.numero).padStart(2, "0")}
                </span>

                <div className="relative">
                  {/* Icon + badge row */}
                  <div className="flex items-start justify-between">
                    <span className="text-3xl">{chapitre.icon}</span>
                    <div className="flex items-center gap-2">
                      {chapitre.progress.started && (
                        <span className={cn(
                          "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                          chapitre.testStats.completed === chapitre.testStats.total && chapitre.testStats.total > 0
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        )}>
                          {chapitre.testStats.completed === chapitre.testStats.total && chapitre.testStats.total > 0 ? (
                            <><CheckCircle2 className="h-3 w-3" /> Terminé</>
                          ) : (
                            "En cours"
                          )}
                        </span>
                      )}
                      <span className="rounded-full bg-primary/8 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                        Chapitre {chapitre.numero}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <h2 className="mt-4 font-serif text-xl font-bold text-foreground transition-colors group-hover:text-primary">
                    {chapitre.titre}
                  </h2>

                  {/* Description */}
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-text-muted">
                    {chapitre.description || "Contenu en cours de rédaction."}
                  </p>

                  {/* Stats row */}
                  <div className="mt-4 flex items-center gap-4 text-xs text-text-muted">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {chapitre.testCount} test{chapitre.testCount !== 1 ? "s" : ""}
                    </span>
                    {chapitre.testStats.completed > 0 && (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                        {chapitre.testStats.completed}/{chapitre.testStats.total} réussi{chapitre.testStats.completed !== 1 ? "s" : ""}
                      </span>
                    )}
                    {chapitre.testStats.bestPct > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 text-accent-gold" />
                        Moy. {chapitre.testStats.bestPct}%
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  {chapitre.progress.started && (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-primary/10">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-700",
                            progressPct === 100 ? "bg-green-500" : "bg-primary"
                          )}
                          style={{ width: `${Math.max(progressPct, 5)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-text-muted tabular-nums">{progressPct}%</span>
                    </div>
                  )}

                  {/* CTA */}
                  <div className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-primary opacity-0 transition-all duration-200 group-hover:opacity-100">
                    {chapitre.progress.started ? "Continuer" : "Ouvrir le chapitre"}
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-primary/15 bg-muted-cream/50 py-16 text-center">
          {search ? (
            <>
              <Search className="h-10 w-10 text-primary/30" />
              <p className="mt-4 font-serif text-lg font-semibold text-foreground">
                Aucun résultat pour &ldquo;{search}&rdquo;
              </p>
              <p className="mt-1 text-sm text-text-muted">
                Essayez avec un autre terme de recherche.
              </p>
            </>
          ) : (
            <>
              <BookOpen className="h-10 w-10 text-primary/30" />
              <p className="mt-4 font-serif text-lg font-semibold text-foreground">
                Aucun chapitre disponible
              </p>
              <p className="mt-1 text-sm text-text-muted">
                Les chapitres seront ajoutés prochainement.
              </p>
            </>
          )}
        </div>
      )}
    </>
  );
}
