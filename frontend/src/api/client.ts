import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;

export const TOKEN_KEY = "vd.token";

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getApiBase = () => API_BASE;

export async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string) {
  return AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken() {
  return AsyncStorage.removeItem(TOKEN_KEY);
}

export function formatApiError(err: any): string {
  const d = err?.response?.data?.detail;
  if (!d) return err?.message || "Something went wrong";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x: any) => x?.msg || JSON.stringify(x)).join(" ");
  if (d?.msg) return d.msg;
  return String(d);
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export function formatDate(iso?: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

export function timeAgo(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso).getTime();
  const diff = (Date.now() - d) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(iso);
}
