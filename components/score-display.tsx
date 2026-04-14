import { Button } from "@/components/ui/button";
import { RotateCcw, Trophy } from "lucide-react";

type ScoreDisplayProps = {
  percentage: number;
  onRetry: () => void;
};

export function ScoreDisplay({ percentage, onRetry }: ScoreDisplayProps) {
  const rounded = Math.round(percentage);
  const stars = rounded <= 40 ? 1 : rounded <= 70 ? 2 : 3;
  const medal = rounded >= 90;
  const color =
    rounded >= 70
      ? "text-green-600"
      : rounded >= 40
        ? "text-amber-600"
        : "text-accent-rose";

  return (
    <div className="rounded-xl border border-primary/8 bg-gradient-to-br from-warm-cream to-muted-cream p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Trophy className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h4 className="font-serif text-base font-bold text-foreground">
            Résultat du test
          </h4>
          <p className={`text-2xl font-bold ${color}`}>{rounded}%</p>
        </div>
      </div>
      <p className="mt-3 text-2xl" aria-label="étoiles">
        {"★".repeat(stars)}{"☆".repeat(3 - stars)} {medal ? "🏅" : ""}
      </p>
      <Button
        onClick={onRetry}
        size="sm"
        variant="outline"
        className="mt-4 gap-1.5"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Refaire le test
      </Button>
    </div>
  );
}
