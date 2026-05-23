import { useGetManagerStats } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Users, ShieldCheck, Ticket, ArrowRightLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function ManagerDashboard() {
  const { data: stats, isLoading } = useGetManagerStats();

  const cards = [
    {
      title: "Total Clients",
      value: stats?.totalClients,
      icon: Users,
      href: "/manager/clients",
      description: "Clients assigned to you",
      color: "text-blue-500",
    },
    {
      title: "Pending KYC",
      value: stats?.pendingKyc,
      icon: ShieldCheck,
      href: "/manager/kyc",
      description: "Awaiting verification",
      color: "text-amber-500",
    },
    {
      title: "Open Tickets",
      value: stats?.pendingTickets,
      icon: Ticket,
      href: "/manager/tickets",
      description: "Active support requests",
      color: "text-red-500",
    },
    {
      title: "Pending Txns",
      value: stats?.pendingTransactions,
      icon: ArrowRightLeft,
      href: "/manager/transactions",
      description: "Transactions to review",
      color: "text-green-500",
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Manager Dashboard</h1>
          <p className="text-muted-foreground">Monitor and manage your assigned clients.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link href={card.href}>
                <Card className="hover:bg-white/5 transition-colors cursor-pointer border-white/10 bg-white/5 backdrop-blur-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {card.title}
                    </CardTitle>
                    <card.icon className={`h-4 w-4 ${card.color}`} />
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <Skeleton className="h-8 w-20" />
                    ) : (
                      <>
                        <div className="text-2xl font-bold">{card.value ?? 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {card.description}
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quick Actions or recent activity could go here */}
          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <Link href="/manager/clients" className="flex items-center justify-center p-4 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20">
                View Clients
              </Link>
              <Link href="/manager/kyc" className="flex items-center justify-center p-4 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors border border-amber-500/20">
                Verify KYC
              </Link>
              <Link href="/manager/transactions" className="flex items-center justify-center p-4 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors border border-green-500/20">
                Review Txns
              </Link>
              <Link href="/manager/tickets" className="flex items-center justify-center p-4 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors border border-blue-500/20">
                Support Tickets
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
