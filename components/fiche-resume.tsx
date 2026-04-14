type FicheResumeProps = {
  value?: string | null;
};

export function FicheResume({ value }: FicheResumeProps) {
  if (!value) {
    return <p className="text-sm text-text-muted">Aucune fiche résumé disponible.</p>;
  }

  let points: string[] = [];

  try {
    const parsed = JSON.parse(value) as string[];
    if (Array.isArray(parsed)) {
      points = parsed;
    }
  } catch {
    points = value
      .split("\n")
      .map((x) => x.replace(/^[-*]\s*/, "").trim())
      .filter(Boolean);
  }

  if (points.length === 0) {
    return <p className="text-sm text-text-muted">Aucune fiche résumé disponible.</p>;
  }

  return (
    <ul className="space-y-2">
      {points.map((point, index) => (
        <li key={index} className="flex items-start gap-3 rounded-xl border border-primary/8 bg-warm-cream p-3.5 text-sm leading-relaxed text-foreground">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
            {index + 1}
          </span>
          {point}
        </li>
      ))}
    </ul>
  );
}
