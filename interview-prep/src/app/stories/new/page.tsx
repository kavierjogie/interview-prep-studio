import type { Metadata } from "next";
import { NewStoryView } from "@/components/stories/StoryViews";

export const metadata: Metadata = { title: "New story" };

export default function Page() {
  return <NewStoryView />;
}
