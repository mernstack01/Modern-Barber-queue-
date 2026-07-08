"use client";

import { Banknote, Clock3, Scissors, Timer, UserCheck, UserX, UsersRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge, statusLabel } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { minutesLabel } from "@/lib/utils";

export default function DashboardPage() {
  const stats = useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard });

  return (
    <div className="py-6">
      <PageHeader title="Boshqaruv" description="Bugungi ish jarayonining qisqa ko'rinishi." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
        <StatCard label="Bugungi mijozlar" value={stats.data?.todayCustomers ?? 0} icon={UsersRound} loading={stats.isLoading} />
        <StatCard label="Kutayotganlar" value={stats.data?.waitingCustomers ?? 0} icon={Clock3} loading={stats.isLoading} />
        <StatCard label="Yakunlangan" value={stats.data?.completedCustomers ?? 0} icon={UserCheck} loading={stats.isLoading} />
        <StatCard label="Bekor qilingan" value={stats.data?.cancelledCustomers ?? 0} icon={UserX} loading={stats.isLoading} />
        <StatCard label="Joriy mijoz" value={stats.data?.currentCustomer ? "1" : "0"} icon={Scissors} loading={stats.isLoading} />
        <StatCard label="O'rtacha kutish" value={minutesLabel(stats.data?.averageWaitingTime ?? 0)} icon={Timer} loading={stats.isLoading} />
        <StatCard label="Daromad" value={`$${stats.data?.revenuePlaceholder ?? 0}`} icon={Banknote} loading={stats.isLoading} />
      </div>

      <Card className="glass mt-6">
        <CardHeader>
          <CardTitle>Joriy mijoz</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.data?.currentCustomer ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-2xl font-semibold">{stats.data.currentCustomer.customer.name}</p>
                <p className="text-sm text-muted-foreground">{stats.data.currentCustomer.customer.phone}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={stats.data.currentCustomer.status} />
                <p className="text-sm text-muted-foreground">{stats.data.currentCustomer.service}</p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Hozir xizmat olayotgan mijoz yo'q.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="glass">
          <CardHeader><CardTitle>Bugungi navbat</CardTitle></CardHeader>
          <CardContent className="grid gap-3">
            {(stats.data?.todayQueue ?? []).map((item) => (
              <div key={item.status} className="flex items-center gap-3">
                <span className="w-28 text-sm text-muted-foreground">{statusLabel(item.status)}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(8, item.count * 12)}%` }} />
                </div>
                <span className="w-8 text-right text-sm font-medium">{item.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader><CardTitle>Haftalik mijozlar</CardTitle></CardHeader>
          <CardContent className="flex h-48 items-end gap-2">
            {(stats.data?.weeklyCustomers ?? []).map((item) => (
              <div key={item.day} className="flex flex-1 flex-col items-center gap-2">
                <div className="w-full rounded-t-md bg-primary" style={{ height: `${Math.max(10, item.count * 8)}px` }} />
                <span className="text-[11px] text-muted-foreground">{item.day.slice(5)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
