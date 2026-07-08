"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Scissors } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { api, setRefreshToken, setToken } from "@/lib/api";

const schema = z.object({
  phone: z.string().min(8),
  password: z.string().min(6)
});

type LoginForm = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const form = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { phone: "+998901234567", password: "password123" }
  });

  async function onSubmit(values: LoginForm) {
    try {
      const response = await api.login(values);
      setToken(response.accessToken);
      setRefreshToken(response.refreshToken);
      toast({ title: "Xush kelibsiz", description: `${response.user.shopName} ishga tayyor.` });
      router.replace("/queue");
    } catch (error) {
      toast({ title: "Kirish amalga oshmadi", description: error instanceof Error ? error.message : "Kirish ma'lumotlarini tekshiring", tone: "destructive" });
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.20),transparent_36%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--secondary)))] px-4">
      <Card className="glass w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Scissors className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-2xl">Atlas Queue</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Bugungi barber navbatini boshqarish uchun kiring.</p>
          </div>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input id="phone" {...form.register("phone")} />
              {form.formState.errors.phone ? <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p> : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Parol</Label>
              <Input id="password" type="password" {...form.register("password")} />
              {form.formState.errors.password ? <p className="text-xs text-destructive">{form.formState.errors.password.message}</p> : null}
            </div>
            <Button disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Kirilmoqda..." : "Kirish"}</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
