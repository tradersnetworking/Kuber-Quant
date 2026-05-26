import { MtLinkedAccountsWorkspacePanel } from "@/components/super-admin/MtLinkedAccountsWorkspacePanel";

export default function AdminMt5AccountsPage() {
  return (
    <div className="space-y-6">
      <MtLinkedAccountsWorkspacePanel apiBase="/admin" showFormConfig={false} />
    </div>
  );
}
