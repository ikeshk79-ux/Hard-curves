import { useEffect } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import { Home, Dumbbell, PlusCircle, Ruler, LineChart, Camera, User, Shield } from "lucide-react";
import { Brand } from "./Brand";
import { useMe, useApi } from "../lib/api";

const NAV = [
  { to: "/", label: "Home", icon: Home, end: true, id: "home" },
  { to: "/training", label: "Training", icon: Dumbbell, id: "training" },
  { to: "/log", label: "Log", icon: PlusCircle, id: "log" },
  { to: "/measurements", label: "Measure", icon: Ruler, id: "measurements" },
  { to: "/progress", label: "Progress", icon: LineChart, id: "progress" },
  { to: "/photos", label: "Photos", icon: Camera, id: "photos" },
  { to: "/profile", label: "Profile", icon: User, id: "profile" },
];

const SideLink = ({ item }) => (
  <NavLink
    to={item.to}
    end={item.end}
    data-testid={`nav-${item.id}`}
    className={({ isActive }) =>
      `flex h-12 items-center gap-3 rounded-xl px-4 font-display text-lg font-bold uppercase tracking-wide transition-colors ${
        isActive ? "bg-hc-lime text-hc-ink" : "text-hc-muted hover:bg-hc-raised hover:text-hc-text"
      }`
    }
  >
    <item.icon className="h-5 w-5" />
    {item.label}
  </NavLink>
);

const BottomLink = ({ item }) => (
  <NavLink
    to={item.to}
    end={item.end}
    data-testid={`bottom-nav-${item.id}`}
    className={({ isActive }) =>
      `flex h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold uppercase tracking-wider transition-colors ${
        isActive ? "bg-hc-raised text-hc-lime" : "text-hc-muted"
      }`
    }
  >
    <item.icon className="h-5 w-5" />
    {item.label}
  </NavLink>
);

export default function AppShell() {
  const { data: me } = useMe();
  const api = useApi();
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (me && tz && me.timezone !== tz) api.patch("/me", { timezone: tz }).catch(() => {});
  }, [me, api]);
  return (
    <div className="hc-grain min-h-screen bg-hc-bg text-hc-text">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-hc-line bg-hc-card/60 p-5 lg:flex">
        <Link to="/" className="mb-10"><Brand /></Link>
        <nav className="flex flex-col gap-1">{NAV.map((n) => <SideLink key={n.to} item={n} />)}</nav>
        {me?.role === "admin" && (
          <Link data-testid="nav-owner" to="/owner" className="mt-2 flex h-12 items-center gap-3 rounded-xl px-4 font-display text-lg font-bold uppercase text-hc-muted hover:text-hc-text">
            <Shield className="h-5 w-5" />Owner
          </Link>
        )}
        <div className="mt-auto rounded-xl border border-hc-line p-3 text-sm">
          <div className="hc-label">Signed in</div>
          <div data-testid="sidebar-user-name" className="mt-1 truncate font-semibold">{me?.display_name || "Athlete"}</div>
        </div>
      </aside>

      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-hc-line bg-hc-bg/90 px-4 py-3 backdrop-blur-md lg:hidden">
        <Link to="/"><Brand /></Link>
        <div className="flex gap-2">
          <NavLink data-testid="header-photos-link" to="/photos" className={({ isActive }) => `grid h-11 w-11 place-items-center rounded-xl border border-hc-line ${isActive ? "text-hc-lime" : "text-hc-muted"}`}><Camera className="h-5 w-5" /></NavLink>
          <NavLink data-testid="header-profile-link" to="/profile" className={({ isActive }) => `grid h-11 w-11 place-items-center rounded-xl border border-hc-line ${isActive ? "text-hc-lime" : "text-hc-muted"}`}><User className="h-5 w-5" /></NavLink>
        </div>
      </header>

      <main className="px-4 pb-32 pt-6 sm:px-6 lg:ml-64 lg:px-10 lg:pb-16 lg:pt-10">
        <div className="mx-auto max-w-6xl"><Outlet /></div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex gap-1 border-t border-hc-line bg-hc-card/95 px-2 pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5 backdrop-blur-md lg:hidden">
        {NAV.slice(0, 5).map((n) => <BottomLink key={n.to} item={n} />)}
      </nav>
    </div>
  );
}
