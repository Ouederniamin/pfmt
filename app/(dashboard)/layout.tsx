import { AppSidebar, SidebarProvider, SidebarMobileTrigger } from "@/components/app-sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
        <div className="flex h-screen overflow-hidden bg-background">
        {/* Desktop sidebar */}
        <AppSidebar />

        {/* Main content area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Mobile header */}
          <header className="flex items-center gap-3 border-b border-primary/8 bg-surface px-4 py-3 md:hidden">
            <SidebarMobileTrigger />
            <span className="font-serif text-sm font-bold text-primary">
              FMT Médecine
            </span>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
