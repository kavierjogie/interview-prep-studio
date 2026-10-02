import type { Metadata } from "next";
import { MockView } from "@/components/mock/MockViews";

export const metadata: Metadata = { title: "Mock interview" };

export default function Page() {
  return <MockView />;
}
