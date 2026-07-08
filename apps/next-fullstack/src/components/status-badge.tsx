import { Badge } from "@/components/ui/badge";
import type { QueueStatus } from "@/lib/types";

const labels: Record<QueueStatus, string> = {
  WAITING: "Kutmoqda",
  CALLING: "Chaqirilmoqda",
  IN_SERVICE: "Xizmatda",
  COMPLETED: "Yakunlangan",
  CANCELLED: "Bekor qilingan"
};

const tones: Record<QueueStatus, "neutral" | "green" | "yellow" | "blue" | "red"> = {
  WAITING: "neutral",
  CALLING: "yellow",
  IN_SERVICE: "blue",
  COMPLETED: "green",
  CANCELLED: "red"
};

export function StatusBadge({ status }: { status: QueueStatus }) {
  return <Badge tone={tones[status]}>{labels[status]}</Badge>;
}

export function statusLabel(status: QueueStatus) {
  return labels[status];
}
