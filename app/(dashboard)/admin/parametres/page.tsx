"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Settings, ShieldCheck, FolderOpen, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ParametresPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && (user?.publicMetadata as { role?: string })?.role !== "admin") {
      router.replace("/cours");
    }
  }, [isLoaded, user, router]);

  if (!isLoaded) return null;

  const sections = [
    {
      title: "Gestion des rôles",
      description:
        "Promouvoir des utilisateurs en administrateurs ou rétrograder des administrateurs en étudiants.",
      icon: ShieldCheck,
      action: (
        <Button asChild size="sm" className="gap-1.5">
          <Link href="/admin/utilisateurs">
            Gérer les utilisateurs
          </Link>
        </Button>
      ),
    },
    {
      title: "Gestion du contenu",
      description:
        "Créer, modifier et supprimer des chapitres, tests et questions de la plateforme.",
      icon: FolderOpen,
      action: (
        <Button asChild size="sm" variant="outline" className="gap-1.5">
          <Link href="/admin/contenu">
            Gérer le contenu
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <>
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-accent-gold mb-2">
          <Settings className="h-4 w-4" />
          Configuration
        </div>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">
          Paramètres
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Configurez la plateforme et gérez les accès.
        </p>
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          <div
            key={section.title}
            className="flex items-start gap-4 rounded-2xl border border-primary/8 bg-surface p-6 transition-all hover:border-primary/15 hover:shadow-md hover:shadow-primary/5"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary">
              <section.icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-serif text-base font-bold text-foreground">
                {section.title}
              </h2>
              <p className="mt-1 text-sm text-text-muted leading-relaxed">
                {section.description}
              </p>
              <div className="mt-4">{section.action}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
