"use client";

import type { ReactNode } from "react";
import { StoreProvider } from "@/lib/store";
import { ToastProvider } from "@/components/ui/Toast";
import { AppShell } from "./AppShell";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <ToastProvider>
        <AppShell>{children}</AppShell>
      </ToastProvider>
    </StoreProvider>
  );
}
