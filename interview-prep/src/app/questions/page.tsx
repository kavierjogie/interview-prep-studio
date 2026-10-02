import type { Metadata } from "next";
import { Suspense } from "react";
import { QuestionBankView } from "@/components/questions/QuestionBankView";
import { PageSkeleton } from "@/components/ui/Skeleton";

export const metadata: Metadata = { title: "Question bank" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <QuestionBankView />
    </Suspense>
  );
}
