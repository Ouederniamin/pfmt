"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, UserButton, SignInButton } from "@clerk/nextjs";
import Image from "next/image";
import {
  BookOpen,
  Settings,
  Menu,
  Home,
  PanelLeftClose,
  PanelLeft,
  LayoutDashboard,
  FolderOpen,
  Eye,
  ShieldCheck,
  UsersRound,
  LogIn,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";

/* ─── NAV DEFINITIONS ─── */

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavSection = {
  title?: string;
  items: NavItem[];
};

const STUDENT_NAV: NavSection[] = [
  {
    items: [
      { label: "Accueil", href: "/", icon: Home },
      { label: "Tableau de bord", href: "/tableau-de-bord", icon: LayoutDashboard },
      { label: "Cours", href: "/cours", icon: BookOpen },
    ],
  },
];

const ADMIN_NAV: NavSection[] = [
  {
    title: "Principal",
    items: [
      { label: "Tableau de bord", href: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    title: "Gestion",
    items: [
      { label: "Contenu", href: "/admin/contenu", icon: FolderOpen },
      { label: "Utilisateurs", href: "/admin/utilisateurs", icon: UsersRound },
      { label: "Paramètres", href: "/admin/parametres", icon: Settings },
    ],
  },
];

/* ─── HOOKS ─── */

function useIsAdmin() {
  const { user } = useUser();
  return (user?.publicMetadata as { role?: string })?.role === "admin";
}

function useAdminMode() {
  const pathname = usePathname();
  return pathname.startsWith("/admin");
}

/* ─── SIDEBAR CONTEXT ─── */
type SidebarContextType = {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
};

const SidebarContext = React.createContext<SidebarContextType>({
  collapsed: false,
  setCollapsed: () => {},
});

export function useSidebar() {
  return React.useContext(SidebarContext);
}

/* ─── SIDEBAR PROVIDER ─── */
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
    </SidebarContext.Provider>
  );
}

/* ─── MOBILE TRIGGER ─── */
export function SidebarMobileTrigger() {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <MobileSidebarContent onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

/* ═══════════════════════════════════════════
   SHARED NAV RENDERER
   ═══════════════════════════════════════════ */

function NavLink({
  item,
  isActive,
  collapsed,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  isAdminMode?: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center rounded-xl text-sm font-medium transition-all duration-200",
        collapsed ? "h-10 w-10 justify-center" : "gap-3 px-3 py-2.5",
        isActive
          ? "bg-primary/8 text-primary shadow-sm"
          : "text-text-muted hover:bg-muted-cream hover:text-foreground"
      )}
    >
      <item.icon className="h-[18px] w-[18px] shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

function NavSections({
  sections,
  pathname,
  collapsed,
  onClick,
}: {
  sections: NavSection[];
  pathname: string;
  isAdminMode?: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}) {
  return (
    <>
      {sections.map((section, sIdx) => (
        <div key={sIdx} className={cn(sIdx > 0 && "mt-5")}>
          {section.title && !collapsed && (
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-text-muted/50">
              {section.title}
            </p>
          )}
          {collapsed && sIdx > 0 && (
            <div className="mx-auto mb-2 h-px w-6 bg-primary/8" />
          )}
          <div className="space-y-1">
            {section.items.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname === item.href ||
                      pathname.startsWith(item.href + "/");

              const linkEl = (
                <NavLink
                  item={item}
                  isActive={isActive}
                  collapsed={collapsed}
                  onClick={onClick}
                />
              );

              if (collapsed) {
                return (
                  <Tooltip key={item.href + item.label}>
                    <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
                    <TooltipContent side="right" className="font-sans">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <React.Fragment key={item.href + item.label}>
                  {linkEl}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

/* ═══════════════════════════════════════════
   MODE SWITCHER
   ═══════════════════════════════════════════ */

function ModeSwitcher({
  isAdminMode,
  collapsed,
  onClick,
}: {
  isAdminMode: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}) {
  const switchHref = isAdminMode ? "/cours" : "/admin";
  const switchLabel = isAdminMode ? "Vue étudiant" : "Espace admin";
  const SwitchIcon = isAdminMode ? Eye : ShieldCheck;

  const content = (
    <Link
      href={switchHref}
      onClick={onClick}
      className={cn(
        "flex items-center rounded-xl text-xs font-semibold transition-all duration-200",
        collapsed ? "h-10 w-10 justify-center" : "gap-2.5 px-3 py-2.5",
        isAdminMode
          ? "border border-primary/15 bg-primary/5 text-primary hover:bg-primary/10"
          : "border border-accent-gold/20 bg-accent-gold/5 text-accent-gold hover:bg-accent-gold/10"
      )}
    >
      <SwitchIcon className="h-4 w-4 shrink-0" />
      {!collapsed && switchLabel}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="font-sans">
          {switchLabel}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

/* ═══════════════════════════════════════════
   SIDEBAR USER CARD (handles auth state)
   ═══════════════════════════════════════════ */

function SidebarUserCard({ collapsed }: { collapsed?: boolean }) {
  const { user, isLoaded } = useUser();

  if (!isLoaded) return null;

  // Unauthenticated — show sign-in button
  if (!user) {
    if (collapsed) {
      return (
        <div className="flex justify-center">
          <SignInButton mode="modal">
            <button className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white transition hover:bg-primary/90">
              <LogIn className="h-4 w-4" />
            </button>
          </SignInButton>
        </div>
      );
    }
    return (
      <SignInButton mode="modal">
        <button className="flex w-full items-center gap-3 rounded-xl bg-primary/8 p-3 text-sm font-semibold text-primary transition hover:bg-primary/15">
          <LogIn className="h-4 w-4 shrink-0" />
          Se connecter
        </button>
      </SignInButton>
    );
  }

  // Authenticated
  if (collapsed) {
    return (
      <div className="flex justify-center">
        <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-gradient-to-br from-muted-cream to-warm-cream p-3">
      <div className="flex items-center gap-3">
        <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
        <div className="text-xs">
          <p className="font-semibold text-foreground">FMT Médecine</p>
          <p className="text-text-muted">Faculté de Médecine de Tunis</p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MOBILE SIDEBAR CONTENT
   ═══════════════════════════════════════════ */

function MobileSidebarContent({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  const isAdmin = useIsAdmin();
  const isAdminMode = useAdminMode();
  const sections = isAdminMode ? ADMIN_NAV : STUDENT_NAV;

  return (
    <div className="flex h-full flex-col bg-surface">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-primary/8 px-5 py-5">
        {isAdminMode ? (
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
        ) : (
          <Image src="/logo.png" alt="FMT" width={36} height={36} className="h-9 w-9 shrink-0 object-contain" />
        )}
        <div>
          <p className="font-serif text-base font-bold text-primary">
            {isAdminMode ? "Administration" : "FMT Médecine"}
          </p>
          <p className="text-[11px] font-medium text-text-muted">
            {isAdminMode ? "Panneau de gestion" : "Fac. Médecine de Tunis"}
          </p>
        </div>
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav>
          <NavSections
            sections={sections}
            pathname={pathname}
            onClick={onNavigate}
          />
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-primary/8 p-4 space-y-3">
        {isAdmin && (
          <ModeSwitcher isAdminMode={isAdminMode} onClick={onNavigate} />
        )}
        <SidebarUserCard />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   DESKTOP SIDEBAR
   ═══════════════════════════════════════════ */

export function AppSidebar() {
  const { collapsed, setCollapsed } = useSidebar();
  const pathname = usePathname();
  const isAdmin = useIsAdmin();
  const isAdminMode = useAdminMode();
  const sections = isAdminMode ? ADMIN_NAV : STUDENT_NAV;

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-primary/8 bg-surface transition-all duration-300 ease-in-out",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      {/* Logo header */}
      <div
        className={cn(
          "flex items-center border-b border-primary/8 transition-all duration-300",
          collapsed ? "justify-center px-2 py-5" : "gap-2.5 px-5 py-5"
        )}
      >
        {isAdminMode ? (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white shadow-sm shadow-primary/20">
            <ShieldCheck className="h-5 w-5" />
          </div>
        ) : (
          <Image src="/logo.png" alt="FMT" width={36} height={36} className="h-9 w-9 shrink-0 object-contain" />
        )}
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-serif text-base font-bold tracking-tight text-primary">
              {isAdminMode ? "Administration" : "FMT Médecine"}
            </p>
            <p className="text-[11px] font-medium text-text-muted">
              {isAdminMode ? "Panneau de gestion" : "Fac. Médecine de Tunis"}
            </p>
          </div>
        )}
      </div>

      {/* Nav items */}
      <ScrollArea className="flex-1 py-4">
        <nav className={cn(collapsed ? "px-2" : "px-3")}>
          <NavSections
            sections={sections}
            pathname={pathname}
            collapsed={collapsed}
          />
        </nav>
      </ScrollArea>

      {/* Bottom section */}
      <div className="mt-auto border-t border-primary/8 p-3 space-y-2">
        {/* Mode switcher */}
        {isAdmin && (
          <ModeSwitcher isAdminMode={isAdminMode} collapsed={collapsed} />
        )}

        {/* User card */}
        <SidebarUserCard collapsed={collapsed} />

        {/* Collapse toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className={cn(
                "flex items-center rounded-lg text-sm font-medium text-text-muted transition-all hover:bg-muted-cream hover:text-foreground",
                collapsed
                  ? "mx-auto h-10 w-10 justify-center"
                  : "w-full gap-2 px-3 py-2"
              )}
              aria-label={collapsed ? "Développer" : "Réduire"}
            >
              {collapsed ? (
                <PanelLeft className="h-[18px] w-[18px]" />
              ) : (
                <>
                  <PanelLeftClose className="h-[18px] w-[18px]" />
                  <span>Réduire</span>
                </>
              )}
            </button>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right" className="font-sans">
              Développer
            </TooltipContent>
          )}
        </Tooltip>
      </div>
    </aside>
  );
}
