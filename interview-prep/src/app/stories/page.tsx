import type { Metadata } from "next";
import { StoriesView } from "@/components/stories/StoryViews";

export const metadata: Metadata = { title: "STAR stories" };

export default function Page() {
  return <StoriesView />;
}
