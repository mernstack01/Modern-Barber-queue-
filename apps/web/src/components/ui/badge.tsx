import { cn } from "@/lib/utils";

const tones = {
  neutral: "bg-secondary text-secondary-foreground",
  green: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  yellow: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  blue: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  red: "bg-red-500/12 text-red-700 dark:text-red-300"
};

export function Badge({ className, tone = "neutral", children }: { className?: string; tone?: keyof typeof tones; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex h-6 items-center rounded-md px-2 text-xs font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}
