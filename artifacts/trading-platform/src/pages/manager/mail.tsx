import { SupportMailInboxPanel } from "@/components/support/SupportMailInboxPanel";

export default function ManagerMailPage() {
  return (
    <SupportMailInboxPanel
      title="Support Mail Desk"
      description="Read and reply to client emails with attachments."
      apiBase="/manager/mail"
    />
  );
}
