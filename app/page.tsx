import Link from "next/link";
import {
  SignInButton,
  UserButton,
} from "@clerk/nextjs";
import { auth, currentUser } from "@clerk/nextjs/server";
import {
  BookOpen,
  GraduationCap,
  Brain,
  FileText,
  ChevronRight,
  Stethoscope,
  Award,
  Users,
  CheckCircle2,
} from "lucide-react";

const chapitres = [
  {
    titre: "Cancer du sein",
    desc: "Épidémiologie, dépistage, classification TNM, stratégies thérapeutiques et suivi.",
    icon: "🩺",
  },
  {
    titre: "Cancer du col utérin",
    desc: "Rôle du HPV, vaccination, frottis cervical, conisation et protocoles de traitement.",
    icon: "🔬",
  },
  {
    titre: "Cancer de l'endomètre",
    desc: "Facteurs de risque, biopsie endométriale, stadification FIGO et prise en charge.",
    icon: "📋",
  },
  {
    titre: "Cancer de l'ovaire",
    desc: "Marqueurs tumoraux, imagerie, chirurgie de cytoréduction et chimiothérapie.",
    icon: "🧬",
  },
];

const features = [
  {
    icon: BookOpen,
    title: "Cours structurés",
    desc: "Chapitres paginés avec navigation claire, rédigés pour le programme tunisien.",
  },
  {
    icon: Brain,
    title: "Tests interactifs",
    desc: "QCM, vrai/faux et cas cliniques extraits des documents de cours pour s'auto-évaluer.",
  },
  {
    icon: FileText,
    title: "Fiches résumé",
    desc: "Synthèses concises à relire avant l'examen, intégrées à chaque chapitre.",
  },
  {
    icon: Award,
    title: "Scores & progrès",
    desc: "Correction détaillée avec justifications pour chaque question du test.",
  },
];

export default async function Home() {
  const { userId } = await auth();
  const isSignedIn = !!userId;
  const user = isSignedIn ? await currentUser() : null;
  const isAdmin =
    (user?.publicMetadata as { role?: string })?.role === "admin";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ─── NAVBAR ─── */}
      <nav className="sticky top-0 z-50 border-b border-primary/10 bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
              <Stethoscope className="h-5 w-5" />
            </div>
            <span className="font-serif text-lg font-bold tracking-tight text-primary">
              OncoLearn FMT
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link
                href="/admin"
                className="hidden text-sm font-medium text-text-muted transition-colors hover:text-primary sm:inline-flex"
              >
                Administration
              </Link>
            )}
            {!isSignedIn && (
              <SignInButton mode="modal">
                <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-all hover:bg-primary-dark hover:shadow-lg hover:shadow-primary/30">
                  Se connecter
                  <ChevronRight className="h-4 w-4" />
                </button>
              </SignInButton>
            )}
            {isSignedIn && (
              <>
                <Link
                  href="/cours"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-all hover:bg-primary-dark hover:shadow-lg hover:shadow-primary/30"
                >
                  Commencer
                  <ChevronRight className="h-4 w-4" />
                </Link>
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "h-8 w-8",
                    },
                  }}
                />
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary via-primary-dark to-[#071e34]">
        {/* Geometric overlay */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.04] pattern-tile" />
        {/* Radial glow */}
        <div className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-primary-light/20 blur-[120px]" />

        <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-20 md:pb-28 md:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            {/* Badge */}
            <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-sm font-medium text-white/90 backdrop-blur-sm">
              <GraduationCap className="h-4 w-4 text-accent-gold" />
              Faculté de Médecine de Tunis
            </div>

            {/* Headline */}
            <h1 className="animate-fade-up delay-100 mt-8 font-serif text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl">
              Oncologie Gynécologique
              <span className="block text-accent-gold">&amp; Mammaire</span>
            </h1>

            {/* Subtitle */}
            <p className="animate-fade-up delay-200 mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/70 md:text-lg">
              Plateforme pédagogique interactive dédiée aux étudiants en
              médecine. Cours structurés, tests auto-évalués et fiches de
              révision — tout en un seul endroit.
            </p>

            {/* CTA buttons */}
            <div className="animate-fade-up delay-300 mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/cours"
                className="group inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-primary shadow-xl shadow-black/20 transition-all hover:bg-warm-cream hover:shadow-2xl"
              >
                Accéder aux cours
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20"
                >
                  Espace administration
                </Link>
              )}
            </div>
          </div>

          {/* Stats bar */}
          <div className="animate-fade-up delay-500 mx-auto mt-16 grid max-w-2xl grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            {[
              { value: "4", label: "Chapitres", icon: null },
              { value: "3", label: "Types de tests", icon: null },
              { value: null, label: "Programme officiel", icon: CheckCircle2 },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center justify-center text-center">
                {stat.icon ? (
                  <stat.icon className="h-7 w-7 text-accent-gold md:h-8 md:w-8" />
                ) : (
                  <p className="font-serif text-2xl font-bold text-white md:text-3xl">
                    {stat.value}
                  </p>
                )}
                <p className="mt-1 text-xs font-medium uppercase tracking-wider text-white/50">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Wave bottom edge */}
        <div className="absolute -bottom-px left-0 right-0">
          <svg
            viewBox="0 0 1440 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="block w-full h-[60px] md:h-[80px]"
            preserveAspectRatio="none"
          >
            <path
              d="M0 40C240 80 480 0 720 40C960 80 1200 0 1440 40V80H0V40Z"
              fill="var(--background)"
            />
          </svg>
        </div>
      </section>

      {/* ─── CHAPITRES ─── */}
      <section className="relative py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6">
          {/* Section header */}
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-accent-gold">
              Programme
            </p>
            <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Ce que vous allez apprendre
            </h2>
            <div className="divider-ornament mx-auto mt-4 max-w-xs">
              <span className="text-accent-gold">◆</span>
            </div>
            <p className="mt-4 text-text-muted">
              Quatre chapitres couvrant les pathologies oncologiques
              gynécologiques et mammaires essentielles.
            </p>
          </div>

          {/* Cards grid */}
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {chapitres.map((ch, i) => (
              <Link
                key={ch.titre}
                href="/cours"
                className="group relative overflow-hidden rounded-2xl border border-primary/8 bg-surface p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5"
              >
                {/* Chapter number watermark */}
                <span className="absolute -right-2 -top-4 font-serif text-[5rem] font-bold leading-none text-primary/[0.04]">
                  {String(i + 1).padStart(2, "0")}
                </span>

                <div className="relative">
                  <span className="text-3xl">{ch.icon}</span>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-accent-gold">
                    Chapitre {i + 1}
                  </p>
                  <h3 className="mt-3 font-serif text-lg font-bold text-foreground transition-colors group-hover:text-primary">
                    {ch.titre}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-muted">
                    {ch.desc}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Lire le cours
                    <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="relative bg-muted-cream py-20 md:py-28">
        {/* Subtle top border */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-gold/30 to-transparent" />

        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-accent-gold">
              Fonctionnalités
            </p>
            <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Une plateforme pensée pour réussir
            </h2>
            <div className="divider-ornament mx-auto mt-4 max-w-xs">
              <span className="text-accent-gold">◆</span>
            </div>
          </div>

          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-primary/8 bg-surface p-6 transition-all duration-300 hover:border-primary/15 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/8 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-serif text-base font-bold text-foreground">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-accent-gold">
              Parcours
            </p>
            <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Comment ça marche
            </h2>
            <div className="divider-ornament mx-auto mt-4 max-w-xs">
              <span className="text-accent-gold">◆</span>
            </div>
          </div>

          <div className="relative mt-16">
            {/* Connecting line (desktop) */}
            <div className="absolute left-0 right-0 top-10 hidden h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent lg:block" />

            <div className="grid gap-10 lg:grid-cols-3 lg:gap-8">
              {[
                {
                  step: "01",
                  title: "Choisissez un chapitre",
                  desc: "Parcourez les chapitres couvrant l'oncologie gynécologique et mammaire — FMT.",
                  icon: BookOpen,
                },
                {
                  step: "02",
                  title: "Étudiez le cours",
                  desc: "Lisez le contenu paginé avec la table des matières, consultez la fiche résumé et les ressources vidéo intégrées.",
                  icon: Users,
                },
                {
                  step: "03",
                  title: "Testez vos connaissances",
                  desc: "Passez des tests QCM, vrai/faux ou cas cliniques avec correction instantanée et justifications détaillées.",
                  icon: Brain,
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="group relative text-center lg:text-left"
                >
                  {/* Step circle */}
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary/15 bg-surface shadow-md transition-all group-hover:border-primary/40 group-hover:shadow-xl lg:mx-0">
                    <item.icon className="h-8 w-8 text-primary" />
                  </div>

                  <p className="mt-5 font-serif text-sm font-bold uppercase tracking-widest text-accent-gold">
                    Étape {item.step}
                  </p>
                  <h3 className="mt-2 font-serif text-xl font-bold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-text-muted">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA BANNER ─── */}
      <section className="relative overflow-hidden bg-primary py-16 md:py-20">
        <div className="pointer-events-none absolute inset-0 opacity-[0.03] pattern-tile" />
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-primary-light/20 blur-[100px]" />

        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-serif text-3xl font-bold text-white md:text-4xl">
            Prêt à commencer votre révision ?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base text-white/60">
            Accédez dès maintenant aux cours, fiches et tests interactifs
            d’oncologie gynécologique et mammaire — FMT.
          </p>
          <Link
            href="/cours"
            className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-sm font-bold text-primary shadow-xl shadow-black/20 transition-all hover:bg-warm-cream hover:shadow-2xl"
          >
            Explorer les cours
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-primary/8 bg-surface-elevated py-10">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
                <Stethoscope className="h-4 w-4" />
              </div>
              <span className="font-serif text-sm font-bold text-primary">
                OncoLearn FMT
              </span>
            </div>
            <p className="text-center text-sm text-text-muted">
              Faculté de Médecine de Tunis — Oncologie Gyn. & Mammaire
            </p>
            <div className="flex gap-4">
              <Link
                href="/cours"
                className="text-sm text-text-muted transition-colors hover:text-primary"
              >
                Cours
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="text-sm text-text-muted transition-colors hover:text-primary"
                >
                  Admin
                </Link>
              )}
            </div>
          </div>
          <div className="mt-8 text-center">
            <div className="divider-ornament mx-auto mb-4 max-w-xs">
              <span className="text-xs text-accent-gold">◆</span>
            </div>
            <p className="text-xs text-text-muted/60">
              © {new Date().getFullYear()} OncoLearn FMT. Projet
              pédagogique.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
