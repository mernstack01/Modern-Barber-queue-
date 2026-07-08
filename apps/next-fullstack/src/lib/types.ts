export type QueueStatus = "WAITING" | "CALLING" | "IN_SERVICE" | "COMPLETED" | "CANCELLED";

export type Customer = {
  id: string;
  name: string;
  phone: string;
  notes?: string | null;
  createdAt: string;
};

export type QueueItem = {
  id: string;
  customerId: string;
  customer: Customer;
  service: string;
  estimatedWait: number;
  position: number;
  status: QueueStatus;
  calledAt?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DashboardStats = {
  todayCustomers: number;
  waitingCustomers: number;
  completedCustomers: number;
  cancelledCustomers: number;
  revenuePlaceholder: number;
  averageWaitingTime: number;
  currentCustomer: QueueItem | null;
  todayQueue: Array<{ status: QueueStatus; count: number }>;
  weeklyCustomers: Array<{ day: string; count: number }>;
};

export type HistoryItem = QueueItem & {
  waitingTime: number | null;
  serviceDuration: number | null;
};

export type Profile = {
  id: string;
  name: string;
  phone: string;
  role: "OWNER" | "BARBER";
  shopId: string;
  shopName: string;
  address?: string;
  workingHours: string;
  avatar?: string | null;
  createdAt: string;
};

export type Paginated<T> = {
  items: T[];
  meta: { page: number; limit: number; total: number; pageCount: number };
};

export type Settings = {
  shopInformation: {
    id: string;
    name: string;
    phone: string;
    address: string;
    logo?: string | null;
    workingHours: string;
    queueSettings: Record<string, unknown>;
  };
  workingHours: string;
  queueSettings: Record<string, unknown>;
  theme: string;
  language: string;
  supportedLanguages: string[];
};
