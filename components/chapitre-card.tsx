import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ChapitreCardProps = {
  id: string;
  numero: number;
  titre: string;
  description?: string | null;
  href: string;
};

export function ChapitreCard({ id, numero, titre, description, href }: ChapitreCardProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardDescription>Chapitre {numero}</CardDescription>
        <CardTitle>{titre}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 line-clamp-3 text-sm text-slate-600">{description || "Description a venir."}</p>
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full w-1/3 rounded-full bg-[#0F4C75]" />
          </div>
          <span className="text-xs text-slate-500">33%</span>
        </div>
        <Button asChild className="mt-4 w-full">
          <Link href={href} aria-label={`Ouvrir ${titre}`}>
            Ouvrir le chapitre
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
