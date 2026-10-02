import type { Metadata } from "next";
import { StoryDetailView } from "@/components/stories/StoryViews";

export const metadata: Metadata = { title: "Story" };

export default function Page() {
  return <StoryDetailView />;
}
