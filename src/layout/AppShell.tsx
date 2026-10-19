import { useQuery } from "@tanstack/react-query";
import { Lightbulb, LogOut, PanelLeftClose, PanelLeftOpen, Search, Users } from "lucide-react";
import * as React from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { apiFetch } from "@/api/client";
import { Pokeball } from "@/components/kit/Pokeball";
import { cn } from "@/lib/utils";
import { AppearanceSelect } from "@/layout/Appearance";
import { IssueButton } from "@/layout/IssueButton";
import { activeNav, home, navSections } from "@/layout/nav";
import { SpotlightProvider, useSpotlight } from "@/layout/Spotlight";

/** The Cloudflare Access login; `pnpm dev` has none and answers "local-user". */
export const useMe = () =>
  useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<{ email: string }>({ url: "/me", method: "get" }),
    staleTime: Infinity,
  });

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

const SidebarLink = ({ to, label, icon, collapsed }: { to: string; label: string; icon: React.ReactNode; collapsed: boolean }) => (
  <NavLink
    to={to}
    end={to === "/"}
    title={collapsed ? label : undefined}
    className={({ isActive }) =>
      cn(
        "flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-body transition-colors duration-150 [&_svg]:size-4 [&_svg]:shrink-0",
        collapsed && "justify-center px-0",
        isActive ? "bg-tint/10 font-semibold text-tint" : "text-label hover:bg-fill",
      )
    }
  >
    {icon}
    <span className={collapsed ? "sr-only" : undefined}>{label}</span>
  </NavLink>
);

const Sidebar = ({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) => {
  const { open } = useSpotlight();
  const { data: me } = useMe();
  return (
    <aside className={cn("fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-hairline bg-raised/80 backdrop-blur-xl lg:flex", collapsed ? "w-16" : "w-60")}>
      <div className={cn("mx-3 mt-4 mb-3 flex h-8 items-center gap-1", collapsed && "justify-center")}>
        {!collapsed && (
          <Link to="/" className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1">
            <Pokeball className="size-6 shrink-0 text-tint" strokeWidth={9} />
            <span className="font-display text-title-3 tracking-tight">PokéroleDex</span>
          </Link>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          aria-controls="sidebar-nav"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-label-2 hover:bg-fill"
        >
          {collapsed ? <PanelLeftOpen aria-hidden className="size-4" /> : <PanelLeftClose aria-hidden className="size-4" />}
        </button>
      </div>
      <button
        type="button"
        onClick={open}
        title={collapsed ? "Search" : undefined}
        className={cn("mx-3 mb-3 flex h-8 items-center gap-2 rounded-lg bg-fill px-2.5 text-body text-label-2 transition-colors hover:bg-fill-strong", collapsed && "justify-center px-0")}
      >
        <Search aria-hidden className="size-4" />
        <span className={collapsed ? "sr-only" : undefined}>Search</span>
        {!collapsed && <kbd className="ml-auto rounded border border-hairline bg-surface px-1 text-caption">{isMac ? "⌘K" : "Ctrl K"}</kbd>}
      </button>
      <nav id="sidebar-nav" aria-label="Main" className="flex-1 overflow-y-auto px-3 pb-3">
        <SidebarLink to={home.to} label={home.label} icon={home.icon} collapsed={collapsed} />
        {navSections.map((section) => (
          <div key={section.title} className="mt-4">
            <h2 className={collapsed ? "sr-only" : "px-2.5 pb-1 text-caption font-semibold uppercase tracking-wide text-label-2"}>{section.title}</h2>
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => (
                <SidebarLink key={item.to} {...item} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="flex flex-col gap-0.5 border-t border-hairline p-3">
        <AppearanceSelect compact={collapsed} />
        <IssueButton
          trigger={
            <button type="button" title={collapsed ? "Suggest a feature" : undefined} className={cn("flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-body text-label hover:bg-fill", collapsed && "justify-center px-0")}>
              <Lightbulb aria-hidden className="size-4" />
              <span className={collapsed ? "sr-only" : undefined}>Suggest a feature</span>
            </button>
          }
        />
        <AccountRow email={me?.email} collapsed={collapsed} />
      </div>
    </aside>
  );
};

export const AccountRow = ({ email, collapsed = false }: { email?: string; collapsed?: boolean }) => {
  const local = import.meta.env.DEV;
  return (
    <div title={collapsed ? (local ? "Local mode" : email) : undefined} className={cn("flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-subhead text-label-2", collapsed && "justify-center px-0")}>
      {(!collapsed || local) && <Users aria-hidden className="size-4 shrink-0" />}
      <span className={collapsed ? "sr-only" : "min-w-0 flex-1 truncate"}>{local ? "Local mode" : (email ?? "Signed in")}</span>
      {!local && (
        <a href="/cdn-cgi/access/logout" title={collapsed ? "Log out" : undefined} className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-tint hover:bg-tint/10">
          <LogOut aria-hidden className="size-3.5" />
          <span className={collapsed ? "sr-only" : undefined}>Log out</span>
        </a>
      )}
    </div>
  );
};

/** Bottom tab bar on phones and tablets. Home also stands for every section reached from it. */
const TabBar = () => {
  const { open } = useSpotlight();
  const { pathname } = useLocation();
  const current = activeNav(pathname).to;
  const tabs = [
    { to: "/", label: "Home", icon: home.icon },
    navSections[0].items[0],
    { to: "search", label: "Search", icon: <Search /> },
    navSections[1].items[0],
    navSections[1].items[1],
  ];
  const homeOwns = !tabs.some((tab) => tab.to === current);
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-raised/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl backdrop-saturate-150 lg:hidden"
    >
      <ul className="mx-auto grid h-14 max-w-xl grid-cols-5">
        {tabs.map((tab) => {
          const active = tab.to === current || (tab.to === "/" && homeOwns);
          const content = (
            <>
              <span className="grid size-7 place-items-center [&_svg]:size-6">{tab.icon}</span>
              <span className="text-[10px] font-medium leading-none tracking-tight">{tab.label}</span>
            </>
          );
          const className = cn(
            "flex h-full w-full flex-col items-center justify-center gap-1 transition-colors duration-150",
            active ? "text-tint" : "text-label-2",
          );
          return (
            <li key={tab.to}>
              {tab.to === "search" ? (
                <button type="button" onClick={open} className={className} aria-haspopup="dialog">
                  {content}
                </button>
              ) : (
                <Link to={tab.to} className={className} aria-current={active ? "page" : undefined}>
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

/** Back to the top when moving to another section; staying inside one (list ↔ detail) keeps the scroll. */
const useScrollReset = () => {
  const { pathname } = useLocation();
  const section = pathname.split("/")[1];
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [section]);
};

export const AppShell = () => {
  useScrollReset();
  const [collapsed, setCollapsed] = React.useState(() => {
    try {
      return localStorage.getItem("pokeroledex-sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });
  const toggleSidebar = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem("pokeroledex-sidebar-collapsed", String(next));
    } catch {
      // Collapsing still works when browser storage is unavailable.
    }
  };
  return (
    <SpotlightProvider>
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-surface px-3 py-2 text-tint shadow-float focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
      <main id="main" className={cn("min-h-dvh pb-[calc(56px+env(safe-area-inset-bottom))] lg:pb-0", collapsed ? "lg:pl-16" : "lg:pl-60")}>
        <Outlet />
      </main>
      <TabBar />
    </SpotlightProvider>
  );
};
