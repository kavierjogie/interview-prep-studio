"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BookOpenText, LayoutDashboard, Library, Menu, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { Logo } from "./Logo";
import { isActive, NAV_ITEMS } from "./nav";

const PRIMARY = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/questions", label: "Questions", icon: Library },
  { href: "/practice", label: "Practice", icon: Timer },
  { href: "/stories", label: "Stories", icon: BookOpenText },
];

export function MobileTopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center border-b border-line bg-surface/90 px-4 backdrop-blur lg:hidden">
      <Link href="/" aria-label="Interview Prep Studio home">
        <Logo />
      </Link>
    </header>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const primaryHrefs = PRIMARY.map((p) => p.href);
  const moreActive = NAV_ITEMS.some((n) => !primaryHrefs.includes(n.href) && isActive(pathname, n.href));

  return (
    <>
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-safe backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {PRIMARY.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium", active ? "text-pine-text" : "text-muted")}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
                {label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium", moreActive ? "text-pine-text" : "text-muted")}
          >
            <Menu className="h-5 w-5" />
            More
          </button>
        </div>
      </nav>
      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title={<Logo />}>
        <ul className="-mx-2 space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium",
                  isActive(pathname, href) ? "bg-pine-soft text-pine-text" : "hover:bg-sunken",
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  );
}
