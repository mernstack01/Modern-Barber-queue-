"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";

const schema = z.object({
  name: z.string().min(2),
  phone: z.string().min(8),
  address: z.string().min(2),
  logo: z.string().optional(),
  workingHours: z.string().min(3),
  theme: z.string(),
  language: z.string()
});

type SettingsForm = z.infer<typeof schema>;

export default function SettingsPage() {
  const settings = useQuery({ queryKey: ["settings"], queryFn: api.settings });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const form = useForm<SettingsForm>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", phone: "", address: "", logo: "", workingHours: "", theme: "system", language: "en" }
  });

  useEffect(() => {
    if (!settings.data) return;
    form.reset({
      name: settings.data.shopInformation.name,
      phone: settings.data.shopInformation.phone,
      address: settings.data.shopInformation.address,
      logo: settings.data.shopInformation.logo ?? "",
      workingHours: settings.data.workingHours,
      theme: settings.data.theme,
      language: settings.data.language
    });
  }, [form, settings.data]);

  const mutation = useMutation({
    mutationFn: api.updateSettings,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast({ title: "Sozlamalar saqlandi", description: "Sartaroshxona sozlamalari yangilandi." });
    }
  });

  return (
    <div className="py-6">
      <PageHeader title="Sozlamalar" description="Sartaroshxona ma'lumotlari, ish vaqti, navbat, tema va til." />
      <Card className="glass">
        <CardHeader>
          <CardTitle>Ish maydoni sozlamalari</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Sartaroshxona nomi</Label>
                <Input {...form.register("name")} />
              </div>
              <div className="grid gap-2">
                <Label>Telefon</Label>
                <Input {...form.register("phone")} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Manzil</Label>
              <Input {...form.register("address")} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Ish vaqti</Label>
                <Input {...form.register("workingHours")} />
              </div>
              <div className="grid gap-2">
                <Label>Logo URL</Label>
                <Input {...form.register("logo")} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Tema</Label>
                <Select value={form.watch("theme")} onValueChange={(value) => form.setValue("theme", value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">Tizim bo'yicha</SelectItem>
                    <SelectItem value="light">Yorug'</SelectItem>
                    <SelectItem value="dark">Qorong'i</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Til</Label>
                <Select value={form.watch("language")} onValueChange={(value) => form.setValue("language", value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">Inglizcha</SelectItem>
                    <SelectItem value="uz">O'zbekcha</SelectItem>
                    <SelectItem value="ru">Ruscha</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button disabled={mutation.isPending}>
                <Save className="h-4 w-4" />
                Sozlamalarni saqlash
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
