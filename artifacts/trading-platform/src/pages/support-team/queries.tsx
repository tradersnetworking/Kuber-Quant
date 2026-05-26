import { SupportTicketsWorkspace } from "@/components/support/SupportTicketsWorkspace";

export default function SupportQueriesPage() {
  return (
    <SupportTicketsWorkspace
      title="Queries & Inquiries"
      description="Handle general questions, account inquiries, and informational requests from customers."
      defaultCategory="query"
    />
  );
}
