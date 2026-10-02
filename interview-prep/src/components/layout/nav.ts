import { BarChart3, BookOpenText, Briefcase, LayoutDashboard, Library, Mic, Settings, Timer } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/practice", label: "Practice", icon: Timer },
  { href: "/mock", label: "Mock interview", icon: Mic },
  { href: "/questions", label: "Question bank", icon: Library },
  { href: "/stories", label: "STAR stories", icon: BookOpenText },
  { href: "/prepare", label: "Job prep", icon: Briefcase },
  { href: "/progress", label: "Progress", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
