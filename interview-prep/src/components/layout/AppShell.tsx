"use client";

import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { useStore } from "@/lib/store";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { MobileNav, MobileTopBar } from "./MobileNav";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  const { ready, storageError } = useStore();
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar />
        {storageError && (
          <div role="alert" className="border-b border-marigold/40 bg-marigold-soft px-4 py-2.5 text-sm text-marigold-text">
            <div className="mx-auto flex max-w-6xl items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{storageError}</p>
            </div>
          </div>
        )}
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:px-10 lg:pb-12 lg:pt-10">
          {ready ? children : <PageSkeleton />}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
