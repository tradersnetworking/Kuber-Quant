import { SupportTicketsWorkspace } from "@/components/support/SupportTicketsWorkspace";

export default function SupportComplaintsPage() {
  return (
    <SupportTicketsWorkspace
      title="Complaints"
      description="Review and resolve customer complaints — account issues, service problems, and disputes."
      defaultCategory="complaint"
    />
  );
}
