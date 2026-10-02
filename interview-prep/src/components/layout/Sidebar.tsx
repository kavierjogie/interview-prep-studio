"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { isActive, NAV_ITEMS } from "./nav";

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface lg:flex">
      <div className="px-5 pb-6 pt-6">
        <Link href="/" aria-label="Interview Prep Studio home">
          <Logo />
        </Link>
      </div>
      <nav aria-label="Main" className="flex-1 space-y-0.5 px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-[10px] px-3 py-2 text-[14.5px] font-medium transition-colors",
                active ? "bg-pine-soft text-pine-text" : "text-muted hover:bg-sunken hover:text-ink",
              )}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.2 : 1.8} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="m-3 rounded-xl bg-surface-2 p-3.5 text-[12.5px] leading-relaxed text-muted">
        <p className="mb-1 flex items-center gap-1.5 font-medium text-ink">
          <ShieldCheck className="h-3.5 w-3.5 text-pine" /> Stored in this browser
        </p>
        Your answers stay on this device. AI analysis only sends the answer you choose to analyse.
      </div>
    </aside>
  );
}
