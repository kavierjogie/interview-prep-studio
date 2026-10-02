import type { Metadata } from "next";
import { QuestionDetailView } from "@/components/questions/QuestionDetailView";

export const metadata: Metadata = { title: "Question" };

export default function Page() {
  return <QuestionDetailView />;
}
