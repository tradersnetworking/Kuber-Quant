import { SupportMailInboxPanel } from "@/components/support/SupportMailInboxPanel";

export default function AdminMailPage() {
  return (
    <SupportMailInboxPanel
      title="Support Mail"
      description="Manage client queries, complaints, disputes, and other emails sent to support@kuberquant.com."
      apiBase="/admin/mail"
    />
  );
}
