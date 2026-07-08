"use client";

import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Calendar } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { minutesLabel } from "@/lib/utils";
import { useState } from "react";

export default function HistoryPage() {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const history = useQuery({ queryKey: ["history", date], queryFn: () => api.history(date) });

  return (
    <div className="py-6">
      <PageHeader
        title="Tarix"
        description="Kun bo'yicha mijozlar, kutish va xizmat vaqtlarini ko'ring."
        action={
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="date" className="w-48 pl-9" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
        }
      />

      <Card className="glass overflow-hidden">
        <CardContent className="p-0">
          <div className="hidden grid-cols-[1.4fr_1fr_1fr_1fr_1fr] gap-4 border-b px-5 py-3 text-xs font-medium uppercase text-muted-foreground md:grid">
            <span>Mijoz</span>
            <span>Xizmat</span>
            <span>Kutish vaqti</span>
            <span>Davomiylik</span>
            <span>Holat</span>
          </div>
          {history.isLoading ? (
            <div className="grid gap-3 p-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-12" />
              ))}
            </div>
          ) : history.data && history.data.length > 0 ? (
            <div className="divide-y">
              {history.data.map((item) => (
                <div key={item.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr] md:items-center">
                  <div>
                    <p className="font-medium">{item.customer.name}</p>
                    <p className="text-sm text-muted-foreground">{item.customer.phone}</p>
                  </div>
                  <p className="text-sm">{item.service}</p>
                  <p className="text-sm">{minutesLabel(item.waitingTime)}</p>
                  <p className="text-sm">{minutesLabel(item.serviceDuration)}</p>
                  <StatusBadge status={item.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center text-sm text-muted-foreground">Bu sana uchun tarix yo'q.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
