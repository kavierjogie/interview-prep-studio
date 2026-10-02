import { BarChart3, BookOpenText, Briefcase, LayoutDashboard, Library, Mic, Settings, Timer } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/practice", label: "Practice", icon: Timer },
  { href: "/mock", label: "Mock interview", icon: Mic },
  { href: "/questions", label: "Questions", icon: Library },
  { href: "/stories", label: "Stories", icon: BookOpenText },
  { href: "/prepare", label: "Job prep", icon: Briefcase },
  { href: "/progress", label: "Progress", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

/** Shown in the phone tab bar; everything else lives under More. Same labels as the sidebar. */
export const PRIMARY_HREFS: readonly string[] = ["/", "/questions", "/practice", "/stories"];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
