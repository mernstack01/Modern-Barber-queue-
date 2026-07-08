"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Clock3, GripVertical, Pencil, PhoneCall, Plus, Search, Scissors, UserCheck, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { StatusBadge, statusLabel } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { api, CustomerInput } from "@/lib/api";
import type { QueueItem, QueueStatus } from "@/lib/types";
import { cn, minutesLabel } from "@/lib/utils";

const statuses: Array<QueueStatus | "ALL"> = ["ALL", "WAITING", "CALLING", "IN_SERVICE", "COMPLETED", "CANCELLED"];

const customerSchema = z.object({
  name: z.string().min(2, "Ism kiritilishi kerak"),
  phone: z.string().min(8, "Telefon kiritilishi kerak"),
  service: z.string().min(2, "Xizmat kiritilishi kerak"),
  estimatedWait: z.coerce.number().min(0).max(480),
  notes: z.string().optional()
});

type CustomerForm = z.infer<typeof customerSchema>;

export default function QueuePage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<QueueStatus | "ALL">("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<QueueItem | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const queue = useQuery({
    queryKey: ["queue", search, status],
    queryFn: () => api.queue({ search, status, today: true })
  });

  const dashboard = useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard });
  const items = useMemo(() => queue.data?.items ?? [], [queue.data]);
  const activeItems = useMemo(
    () => items.filter((item) => ["WAITING", "CALLING", "IN_SERVICE"].includes(item.status)).sort((a, b) => a.position - b.position),
    [items]
  );
  const waitingCount = items.filter((item) => item.status === "WAITING").length;
  const callingCount = items.filter((item) => item.status === "CALLING").length;
  const inServiceCount = items.filter((item) => item.status === "IN_SERVICE").length;

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ["queue"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["history"] });
  }

  const action = useMutation({
    mutationFn: ({ id, type }: { id: string; type: "call" | "start" | "finish" | "cancel" }) => {
      if (type === "call") return api.callQueue(id);
      if (type === "start") return api.startQueue(id);
      if (type === "finish") return api.finishQueue(id);
      return api.cancelQueue(id);
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Navbat yangilandi", description: "Amal bajarildi." });
    },
    onError: (error) => toast({ title: "Amal bajarilmadi", description: error instanceof Error ? error.message : "Qayta urinib ko'ring", tone: "destructive" })
  });

  const reorder = useMutation({
    mutationFn: api.reorderQueue,
    onSuccess: invalidate,
    onError: (error) => toast({ title: "Tartiblash amalga oshmadi", description: error instanceof Error ? error.message : "Qayta urinib ko'ring", tone: "destructive" })
  });

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = activeItems.findIndex((item) => item.id === active.id);
    const newIndex = activeItems.findIndex((item) => item.id === over.id);
    const ordered = [...activeItems];
    const [moved] = ordered.splice(oldIndex, 1);
    ordered.splice(newIndex, 0, moved);
    reorder.mutate(ordered.map((item) => item.id));
  }

  function openEdit(item: QueueItem) {
    setEditing(item);
    setDialogOpen(true);
  }

  return (
    <div className="py-3 sm:py-6">
      <PageHeader
        title="Navbat"
        description="Telefon uchun oddiy ish tartibi: qo'shing, chaqiring, boshlang, yakunlang."
        action={
          <CustomerDialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) setEditing(null);
            }}
            editing={editing}
            onSaved={invalidate}
            triggerClassName="w-full sm:w-auto"
          />
        }
      />

      <QueueGuide />

      <QueueSummary waiting={waitingCount} calling={callingCount} inService={inServiceCount} />

      {queue.isError ? (
        <ErrorPanel
          title="Navbat yuklanmadi"
          description={queue.error instanceof Error ? queue.error.message : "Server bilan aloqa bo'lmadi."}
          onRetry={() => void queue.refetch()}
        />
      ) : null}

      {dashboard.isError ? (
        <ErrorPanel
          title="Joriy mijoz ma'lumoti yuklanmadi"
          description={dashboard.error instanceof Error ? dashboard.error.message : "Dashboard ma'lumoti vaqtincha olinmadi."}
          onRetry={() => void dashboard.refetch()}
        />
      ) : null}

      <CurrentCustomer
        item={dashboard.data?.currentCustomer ?? null}
        onFinish={(id) => action.mutate({ id, type: "finish" })}
        onCallNext={() => {
          const next = activeItems.find((item) => item.status === "WAITING" || item.status === "CALLING");
          if (next) action.mutate({ id: next.id, type: "call" });
        }}
      />

      <div className="mt-4 flex flex-col gap-3 rounded-lg border bg-card/75 p-3 sm:mt-6 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Ism yoki telefon bo'yicha qidirish" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <Select value={status} onValueChange={(value) => setStatus(value as QueueStatus | "ALL")}>
          <SelectTrigger className="sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((item) => (
              <SelectItem key={item} value={item}>
                {item === "ALL" ? "Bugun" : statusLabel(item)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <SortableContext items={activeItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          <div className="mt-4 grid gap-3 sm:mt-6">
            {queue.isLoading ? (
              Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-36 rounded-lg" />)
            ) : items.length > 0 ? (
              items.map((item) => (
                <QueueCard
                  key={item.id}
                  item={item}
                  sortable={activeItems.some((active) => active.id === item.id)}
                  onEdit={() => openEdit(item)}
                  onAction={(type) => action.mutate({ id: item.id, type })}
                />
              ))
            ) : (
              <div className="rounded-lg border border-dashed bg-card/70 p-8 text-center sm:p-10">
                <p className="text-lg font-medium">Bu ko'rinishda mijoz yo'q</p>
                <p className="mt-1 text-sm text-muted-foreground">Yuqoridagi “Mijoz qo'shish” tugmasini bosing va kelgan odamni navbatga kiriting.</p>
              </div>
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function QueueGuide() {
  const steps = [
    { icon: Plus, title: "1. Qo'shing", text: "Mijoz kelganda ismi, telefoni va xizmatini yozing." },
    { icon: PhoneCall, title: "2. Chaqiring", text: "Navbati kelganda mijozga chaqirish holatini bering." },
    { icon: Scissors, title: "3. Boshlang", text: "Kresloga o'tirganda xizmatni boshlang." },
    { icon: UserCheck, title: "4. Yakunlang", text: "Soch olish tugaganda tarixga o'tkazing." }
  ];

  return (
    <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {steps.map((step) => {
        const Icon = step.icon;
        return (
          <div key={step.title} className="rounded-lg border bg-card/75 p-3">
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-secondary text-foreground">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">{step.title}</p>
                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{step.text}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function QueueSummary({ waiting, calling, inService }: { waiting: number; calling: number; inService: number }) {
  return (
    <div className="mb-4 grid grid-cols-3 gap-2">
      <SummaryPill label="Kutmoqda" value={waiting} />
      <SummaryPill label="Chaqirilgan" value={calling} />
      <SummaryPill label="Xizmatda" value={inService} />
    </div>
  );
}

function SummaryPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card/75 p-3 text-center">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium text-muted-foreground sm:text-xs">{label}</p>
    </div>
  );
}

function ErrorPanel({ title, description, onRetry }: { title: string; description: string; onRetry: () => void }) {
  return (
    <div className="mb-4 rounded-lg border border-destructive/25 bg-destructive/10 p-4">
      <p className="font-semibold text-destructive">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <Button className="mt-3 h-10" variant="outline" onClick={onRetry}>
        Qayta urinish
      </Button>
    </div>
  );
}

function CurrentCustomer({
  item,
  onFinish,
  onCallNext
}: {
  item: QueueItem | null;
  onFinish: (id: string) => void;
  onCallNext: () => void;
}) {
  return (
    <Card className="glass overflow-hidden border-accent/20">
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        {item ? (
          <>
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Badge tone="blue">Joriy mijoz</Badge>
                <span className="text-xs text-muted-foreground">
                  {item.startedAt ? `Boshlangan: ${format(new Date(item.startedAt), "HH:mm")}` : "Boshlanmagan"}
                </span>
              </div>
              <p className="text-3xl font-semibold">{item.customer.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.customer.phone}</p>
            </div>
            <div className="grid gap-2 sm:flex">
              <Button className="h-12 sm:h-10" variant="secondary" onClick={onCallNext}>
                <PhoneCall className="h-4 w-4" />
                Keyingisini chaqirish
              </Button>
              <Button className="h-12 sm:h-10" onClick={() => onFinish(item.id)}>
                <UserCheck className="h-4 w-4" />
                Xizmatni yakunlash
              </Button>
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="text-xl font-semibold">Faol xizmat yo'q</p>
              <p className="mt-1 text-sm text-muted-foreground">Joy tayyor bo'lganda keyingi kutayotgan mijozni chaqiring yoki boshlang.</p>
            </div>
            <Button className="h-12 sm:h-10" onClick={onCallNext}>
              <PhoneCall className="h-4 w-4" />
              Keyingi mijozni chaqirish
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function QueueCard({
  item,
  sortable,
  onEdit,
  onAction
}: {
  item: QueueItem;
  sortable: boolean;
  onEdit: () => void;
  onAction: (type: "call" | "start" | "finish" | "cancel") => void;
}) {
  const sortableState = useSortable({ id: item.id, disabled: !sortable });
  const style = {
    transform: CSS.Transform.toString(sortableState.transform),
    transition: sortableState.transition
  };

  return (
    <Card ref={sortableState.setNodeRef} style={style} className={cn("glass transition-shadow", sortableState.isDragging && "shadow-soft")}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-3">
            <button
              className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-secondary disabled:opacity-30"
              {...sortableState.attributes}
              {...sortableState.listeners}
              disabled={!sortable}
              aria-label="Navbatdagi mijozni siljitish"
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-semibold">{item.customer.name}</h3>
                <StatusBadge status={item.status} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{item.customer.phone}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-md bg-secondary px-2 py-1">{item.service}</span>
                <span className="rounded-md bg-secondary px-2 py-1">Taxminan {minutesLabel(item.estimatedWait)}</span>
                <span className="rounded-md bg-secondary px-2 py-1">Keldi {format(new Date(item.createdAt), "HH:mm")}</span>
              </div>
              <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" />
                Keyingi amalni pastdagi tugmalardan tanlang.
              </p>
              {item.customer.notes ? <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{item.customer.notes}</p> : null}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button className="h-11 sm:h-9" size="sm" variant="secondary" onClick={() => onAction("call")} disabled={!["WAITING", "CALLING"].includes(item.status)}>
              <PhoneCall className="h-4 w-4" />
              Chaqirish
            </Button>
            <Button className="h-11 sm:h-9" size="sm" variant="secondary" onClick={() => onAction("start")} disabled={!["WAITING", "CALLING"].includes(item.status)}>
              <Scissors className="h-4 w-4" />
              Boshlash
            </Button>
            <Button className="h-11 sm:h-9" size="sm" onClick={() => onAction("finish")} disabled={!["CALLING", "IN_SERVICE"].includes(item.status)}>
              <UserCheck className="h-4 w-4" />
              Yakunlash
            </Button>
            <Button className="h-11 sm:h-9" size="sm" variant="outline" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
              Tahrirlash
            </Button>
            <Button className="col-span-2 h-11 sm:col-span-1 sm:h-9" size="sm" variant="destructive" onClick={() => onAction("cancel")} disabled={["COMPLETED", "CANCELLED"].includes(item.status)}>
              <XCircle className="h-4 w-4" />
              Bekor qilish
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CustomerDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
  triggerClassName
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: QueueItem | null;
  onSaved: () => void;
  triggerClassName?: string;
}) {
  const { toast } = useToast();
  const form = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    values: editing
      ? {
          name: editing.customer.name,
          phone: editing.customer.phone,
          service: editing.service,
          estimatedWait: editing.estimatedWait,
          notes: editing.customer.notes ?? ""
        }
      : { name: "", phone: "", service: "Oddiy soch olish", estimatedWait: 20, notes: "" }
  });

  const mutation = useMutation({
    mutationFn: (values: CustomerInput) => (editing ? api.updateQueue(editing.id, values) : api.createQueue(values)),
    onSuccess: () => {
      onSaved();
      onOpenChange(false);
      toast({ title: editing ? "Mijoz yangilandi" : "Mijoz qo'shildi", description: "Navbat yangilandi." });
    },
    onError: (error) => toast({ title: "Saqlanmadi", description: error instanceof Error ? error.message : "Qayta urinib ko'ring", tone: "destructive" })
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className={triggerClassName}>
          <Plus className="h-4 w-4" />
          Mijoz qo'shish
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Mijozni tahrirlash" : "Mijoz qo'shish"}</DialogTitle>
          <DialogDescription>Kelgan mijoz ma'lumotlari va taxminiy kutish vaqtini kiriting.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <div className="grid gap-2">
            <Label>Ism</Label>
            <Input {...form.register("name")} />
          </div>
          <div className="grid gap-2">
            <Label>Telefon</Label>
            <Input {...form.register("phone")} />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Xizmat</Label>
              <Input {...form.register("service")} />
            </div>
            <div className="grid gap-2">
              <Label>Taxminiy kutish</Label>
              <Input type="number" min={0} {...form.register("estimatedWait")} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Izohlar</Label>
            <Textarea {...form.register("notes")} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Bekor qilish
            </Button>
            <Button disabled={mutation.isPending}>{mutation.isPending ? "Saqlanmoqda..." : "Saqlash"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
