import type { Metadata } from "next";
import { Suspense } from "react";
import { PracticeView } from "@/components/practice/PracticeView";
import { PageSkeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = { title: "Practice" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PracticeView />
    </Suspense>
  );
}
