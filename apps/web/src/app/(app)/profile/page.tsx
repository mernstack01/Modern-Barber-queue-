"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Save } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";

const schema = z.object({
  shopName: z.string().min(2),
  name: z.string().min(2),
  phone: z.string().min(8),
  workingHours: z.string().min(3),
  avatar: z.string().url().optional().or(z.literal(""))
});

type ProfileForm = z.infer<typeof schema>;

export default function ProfilePage() {
  const profile = useQuery({ queryKey: ["profile"], queryFn: api.profile });
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const form = useForm<ProfileForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      shopName: "",
      name: "",
      phone: "",
      workingHours: "",
      avatar: ""
    }
  });

  useEffect(() => {
    if (profile.data) {
      form.reset({
        shopName: profile.data.shopName,
        name: profile.data.name,
        phone: profile.data.phone,
        workingHours: profile.data.workingHours,
        avatar: profile.data.avatar ?? ""
      });
    }
  }, [form, profile.data]);

  const mutation = useMutation({
    mutationFn: api.updateProfile,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "Profil saqlandi", description: "Sartaroshxona ma'lumotlari yangilandi." });
    },
    onError: (error) => toast({ title: "Saqlanmadi", description: error instanceof Error ? error.message : "Qayta urinib ko'ring", tone: "destructive" })
  });

  return (
    <div className="py-6">
      <PageHeader title="Sartarosh profili" description="Sartaroshxona nomi va ish vaqtlarini yangilab boring." />
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card className="glass">
          <CardContent className="p-6 text-center">
            {profile.isLoading ? (
              <Skeleton className="mx-auto h-32 w-32 rounded-lg" />
            ) : (
              <div className="mx-auto grid h-32 w-32 place-items-center overflow-hidden rounded-lg bg-secondary">
                {form.watch("avatar") ? (
                  <img src={form.watch("avatar")} alt="Barber rasmi" className="h-full w-full object-cover" />
                ) : (
                  <Camera className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
            )}
            <h2 className="mt-4 text-xl font-semibold">{profile.data?.shopName ?? "Sartaroshxona profili"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{profile.data?.workingHours ?? "Ish vaqti"}</p>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle>Sartaroshxona ma'lumotlari</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Sartaroshxona nomi</Label>
                  <Input {...form.register("shopName")} />
                </div>
                <div className="grid gap-2">
                  <Label>Sartarosh ismi</Label>
                  <Input {...form.register("name")} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Telefon</Label>
                  <Input {...form.register("phone")} />
                </div>
                <div className="grid gap-2">
                  <Label>Ish vaqti</Label>
                  <Input {...form.register("workingHours")} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Rasm URL</Label>
                <Input {...form.register("avatar")} />
              </div>
              <div className="flex justify-end">
                <Button disabled={mutation.isPending}>
                  <Save className="h-4 w-4" />
                  {mutation.isPending ? "Saqlanmoqda..." : "Profilni saqlash"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
