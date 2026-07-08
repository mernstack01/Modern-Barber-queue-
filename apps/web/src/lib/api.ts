import type { Customer, DashboardStats, HistoryItem, Paginated, Profile, QueueItem, QueueStatus, Settings } from "@/lib/types";

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const TOKEN_KEY = "barber_access_token";
const REFRESH_KEY = "barber_refresh_token";
const AUTH_EXPIRED_EVENT = "barber_auth_expired";

export type LoginInput = { phone: string; password: string };
export type CustomerInput = {
  name: string;
  phone: string;
  service: string;
  estimatedWait: number;
  notes?: string;
};

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function setRefreshToken(token: string) {
  localStorage.setItem(REFRESH_KEY, token);
}

export function getRefreshToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function onAuthExpired(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(AUTH_EXPIRED_EVENT, callback);
  return () => window.removeEventListener(AUTH_EXPIRED_EVENT, callback);
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const response = await fetch(`${getApiUrl()}${path}`, {
    ...init,
    headers: buildHeaders(init.headers)
  });

  if (response.status === 401 && retry && path !== "/auth/login" && path !== "/auth/refresh") {
    const refreshed = await refreshAccessToken();
    if (refreshed) return request<T>(path, init, false);
    expireSession();
    throw new Error("Sessiya muddati tugadi. Qayta kiring.");
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = Array.isArray(payload?.message) ? payload.message.join(", ") : payload?.message;
    throw new Error(message ?? "So'rov bajarilmadi");
  }

  return response.json() as Promise<T>;
}

function buildHeaders(headers: RequestInit["headers"] = {}) {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers
  };
}

async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  const response = await fetch(`${getApiUrl()}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken })
  });

  if (!response.ok) return false;

  const payload = (await response.json()) as { accessToken?: string };
  if (!payload.accessToken) return false;

  setToken(payload.accessToken);
  return true;
}

function expireSession() {
  clearToken();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }
}

function getApiUrl() {
  if (typeof window === "undefined") return configuredApiUrl;
  const host = window.location.hostname;
  const configuredIsLocalhost = configuredApiUrl.includes("localhost") || configuredApiUrl.includes("127.0.0.1");

  if (configuredIsLocalhost && host !== "localhost" && host !== "127.0.0.1") {
    return `${window.location.protocol}//${host}:4000`;
  }

  return configuredApiUrl;
}

export const api = {
  login: (input: LoginInput) =>
    request<{ accessToken: string; refreshToken: string; user: Profile }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input)
    }),
  logout: () => request<{ success: boolean }>("/auth/logout", { method: "POST" }),
  refresh: () => request<{ accessToken: string }>("/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken: getRefreshToken() }) }),
  dashboard: () => request<DashboardStats>("/dashboard"),
  queue: (params?: { search?: string; status?: QueueStatus | "ALL"; today?: boolean }) => {
    const search = new URLSearchParams();
    if (params?.search) search.set("search", params.search);
    if (params?.status && params.status !== "ALL") search.set("status", params.status);
    if (params?.today) search.set("today", "true");
    const query = search.toString();
    return request<Paginated<QueueItem>>(`/queue${query ? `?${query}` : ""}`);
  },
  createQueue: (input: CustomerInput) =>
    request<QueueItem>("/queue", { method: "POST", body: JSON.stringify(input) }),
  updateQueue: (id: string, input: Partial<CustomerInput> & { status?: QueueStatus; position?: number }) =>
    request<QueueItem>(`/queue/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  cancelQueue: (id: string) => request<QueueItem>(`/queue/${id}`, { method: "DELETE" }),
  callQueue: (id: string) => request<QueueItem>(`/queue/${id}/call`, { method: "POST" }),
  startQueue: (id: string) => request<QueueItem>(`/queue/${id}/start`, { method: "POST" }),
  finishQueue: (id: string) => request<QueueItem>(`/queue/${id}/finish`, { method: "POST" }),
  reorderQueue: (orderedIds: string[]) =>
    request<Paginated<QueueItem>>("/queue/reorder", { method: "POST", body: JSON.stringify({ orderedIds }) }),
  history: (date?: string) => request<HistoryItem[]>(`/history${date ? `?date=${date}` : ""}`),
  customers: (search?: string) => request<Array<Customer & { queues: QueueItem[] }>>(`/customers${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  createCustomer: (input: Pick<Customer, "name" | "phone" | "notes">) => request<Customer>("/customers", { method: "POST", body: JSON.stringify(input) }),
  updateCustomer: (id: string, input: Partial<Pick<Customer, "name" | "phone" | "notes">>) =>
    request<Customer>(`/customers/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  deleteCustomer: (id: string) => request<Customer>(`/customers/${id}`, { method: "DELETE" }),
  profile: () => request<Profile>("/profile"),
  updateProfile: (input: Partial<Profile>) =>
    request<Profile>("/profile", { method: "PATCH", body: JSON.stringify(input) }),
  settings: () => request<Settings>("/settings"),
  updateSettings: (input: Partial<Settings["shopInformation"]> & { theme?: string; language?: string }) =>
    request<Settings>("/settings", { method: "PATCH", body: JSON.stringify(input) })
};
