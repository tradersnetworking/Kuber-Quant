import { PaymentGatewaysPanel } from "@/components/super-admin/PaymentGatewaysPanel";

export default function AdminPaymentGatewaysPage() {
  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Deposit & Payment Accounts</h1>
          <p className="text-muted-foreground">Manage multiple UPI, bank, crypto, and online gateway accounts for user deposits.</p>
        </div>
        <PaymentGatewaysPanel />
      </div>
);
}
