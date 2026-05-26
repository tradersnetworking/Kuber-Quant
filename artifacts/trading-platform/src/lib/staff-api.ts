import { useQuery } from "@tanstack/react-query";
import { authFetchJson } from "@/lib/token-store";

export async function staffFetch<T>(path: string, init?: RequestInit): Promise<T> {
  return authFetchJson<T>(path, init);
}

export function useAdminAnalytics() {
  return useQuery({
    queryKey: ["/api/admin/analytics"],
    queryFn: () => staffFetch<any>("/admin/analytics"),
    refetchInterval: 60000,
  });
}

export function usePlatformStats(enabled = true) {
  return useQuery({
    queryKey: ["/api/admin/stats"],
    queryFn: () => staffFetch<any>("/admin/stats"),
    enabled,
    refetchInterval: 60000,
  });
}

export function useManagerAnalytics() {
  return useQuery({
    queryKey: ["/api/manager/analytics"],
    queryFn: () => staffFetch<any>("/manager/analytics"),
    refetchInterval: 60000,
  });
}

export interface ManagerClientDetail {
  user: {
    id: number; email: string; fullName: string; phone: string | null;
    role: string; kycStatus: string; balanceFiat: number; balanceCrypto: number;
    totalProfit: number; referralCode: string | null; referralCount: number;
    referralEarnings: number; createdAt: string;
  };
  summary: {
    totalDeposits: number; totalWithdrawals: number;
    pendingDeposits: number; pendingWithdrawals: number;
    balanceFiat: number; balanceCrypto: number; totalProfit: number;
    referralEarnings: number; referralCount: number;
    investmentTotal: number; investmentProfit: number;
    referralPaid: number; roiTotal: number; activeInvestments: number;
  };
  kyc: {
    id: number; userId: number; fullName: string | null; address: string | null;
    country: string | null; idType: string | null; idNumber: string | null;
    panCard: string | null; aadhaarNumber: string | null;
    bankAccountNumber: string | null; bankName: string | null; ifscCode: string | null;
    idDocumentUrl: string | null; addressProofUrl: string | null; selfieUrl: string | null;
    status: string; rejectionReason: string | null; createdAt: string;
  } | null;
  transactions: Array<{
    id: number; type: string; amount: number; currency: string; status: string;
    paymentMethod: string | null; txHash: string | null; notes: string | null; createdAt: string;
  }>;
  investments: Array<{
    id: number; type: string; planName: string | null; amount: number; currency: string;
    profit: number; profitPercent: number; status: string; maturityDate: string | null; createdAt: string;
  }>;
  walletLedger: Array<{
    id: number; type: string; amount: number; currency: string; walletType: string;
    balanceBefore: number; balanceAfter: number; description: string | null; createdAt: string;
  }>;
  referralEarnings: Array<{
    id: number; referredUserId: number; amount: number; currency: string; status: string; createdAt: string;
  }>;
  roiPayouts: Array<{
    id: number; investmentId: number; amount: number; roiPercent: number;
    status: string; planName: string | null; createdAt: string;
  }>;
}

export function useManagerClientDetail(clientId: number) {
  return useQuery({
    queryKey: ["/api/manager/clients", clientId],
    queryFn: () => staffFetch<ManagerClientDetail>(`/manager/clients/${clientId}`),
    enabled: clientId > 0,
  });
}

export async function replyToTicketAsStaff(ticketId: number, message: string, role: "admin" | "manager" | "support") {
  const path = role === "admin"
    ? `/admin/tickets/${ticketId}/reply`
    : role === "manager"
    ? `/manager/tickets/${ticketId}/reply`
    : `/support-team/tickets/${ticketId}/reply`;
  return staffFetch<any>(path, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export async function closeTicketAsAdmin(ticketId: number) {
  return staffFetch<any>(`/admin/tickets/${ticketId}/close`, { method: "POST" });
}

export async function updateSupportTicketStatus(ticketId: number, status: string) {
  return staffFetch<any>(`/support-team/tickets/${ticketId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function resolveSupportTicket(ticketId: number) {
  return staffFetch<any>(`/support-team/tickets/${ticketId}/resolve`, { method: "POST" });
}

export async function closeSupportTicket(ticketId: number) {
  return staffFetch<any>(`/support-team/tickets/${ticketId}/close`, { method: "POST" });
}
