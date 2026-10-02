import type { Metadata } from "next";
import { JobPrepListView } from "@/components/prepare/JobPrepViews";

export const metadata: Metadata = { title: "Job preparation" };

export default function Page() {
  return <JobPrepListView />;
}
