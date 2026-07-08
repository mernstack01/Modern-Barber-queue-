"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";

const schema = z.object({
  name: z.string().min(2),
  phone: z.string().min(8),
  notes: z.string().optional()
});

type CustomerForm = z.infer<typeof schema>;

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const customers = useQuery({ queryKey: ["customers", search], queryFn: () => api.customers(search) });
  const form = useForm<CustomerForm>({ resolver: zodResolver(schema), defaultValues: { name: "", phone: "", notes: "" } });

  const create = useMutation({
    mutationFn: api.createCustomer,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
      setOpen(false);
      form.reset();
      toast({ title: "Mijoz yaratildi", description: "Mijoz tarixi keyingi tashriflar uchun tayyor." });
    }
  });

  const remove = useMutation({
    mutationFn: api.deleteCustomer,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast({ title: "Mijoz o'chirildi", description: "Mijoz ro'yxatdan yashirildi." });
    }
  });

  return (
    <div className="py-6">
      <PageHeader
        title="Mijozlar"
        description="Mijoz ma'lumotlari, izohlar va so'nggi navbat tarixini ko'ring."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                Yangi mijoz
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Mijoz yaratish</DialogTitle>
                <DialogDescription>Qayta ishlatiladigan mijoz profilini qo'shing.</DialogDescription>
              </DialogHeader>
              <form className="grid gap-4" onSubmit={form.handleSubmit((values) => create.mutate(values))}>
                <div className="grid gap-2">
                  <Label>Ism</Label>
                  <Input {...form.register("name")} />
                </div>
                <div className="grid gap-2">
                  <Label>Telefon</Label>
                  <Input {...form.register("phone")} />
                </div>
                <div className="grid gap-2">
                  <Label>Izohlar</Label>
                  <Textarea {...form.register("notes")} />
                </div>
                <Button disabled={create.isPending}>Mijozni saqlash</Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Mijozlarni qidirish" value={search} onChange={(event) => setSearch(event.target.value)} />
      </div>
      <div className="grid gap-3">
        {customers.isLoading ? (
          Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-24" />)
        ) : customers.data?.length ? (
          customers.data.map((customer) => (
            <Card key={customer.id} className="glass">
              <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-lg font-semibold">{customer.name}</p>
                  <p className="text-sm text-muted-foreground">{customer.phone}</p>
                  {customer.notes ? <p className="mt-2 text-sm text-muted-foreground">{customer.notes}</p> : null}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {customer.queues?.[0] ? (
                    <>
                      <StatusBadge status={customer.queues[0].status} />
                      <span className="text-sm text-muted-foreground">{format(new Date(customer.queues[0].createdAt), "MMM d, HH:mm")}</span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Hali tashrif yo'q</span>
                  )}
                  <Button variant="outline" size="icon" onClick={() => remove.mutate(customer.id)} aria-label="Mijozni o'chirish">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">Mijoz topilmadi.</div>
        )}
      </div>
    </div>
  );
}
