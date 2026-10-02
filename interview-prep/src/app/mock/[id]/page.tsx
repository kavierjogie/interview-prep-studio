import type { Metadata } from "next";
import { MockSummaryView } from "@/components/mock/MockViews";

export const metadata: Metadata = { title: "Mock interview summary" };

export default function Page() {
  return <MockSummaryView />;
}
