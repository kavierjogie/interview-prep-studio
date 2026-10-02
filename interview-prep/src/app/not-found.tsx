import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function NotFound() {
  return <EmptyState title="Page not found" description="That page doesn't exist." action={<ButtonLink href="/">Go to dashboard</ButtonLink>} />;
}
