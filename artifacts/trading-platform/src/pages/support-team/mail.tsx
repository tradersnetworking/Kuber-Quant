import { SupportMailInboxPanel } from "@/components/support/SupportMailInboxPanel";

export default function SupportTeamMailPage() {
  return (
    <SupportMailInboxPanel
      title="Support Mail"
      description="Manage client queries, complaints, disputes, and other emails sent to support@kuberquant.com."
      apiBase="/support-team/mail"
    />
  );
}
