import type { User } from "@/domain/types";
import { apiFetch } from "./client";

export function fetchUsers(locationId?: string): Promise<User[]> {
  const params = new URLSearchParams();
  if (locationId) params.set("location_id", locationId);
  return apiFetch<User[]>(`/api/v1/users?${params}`);
}

export function createUser(body: {
  location_id: string;
  name: string;
  email?: string;
  job?: string;
  age?: number | null;
  gender?: string | null;
  personality?: string | null;
  daily_style?: string | null;
}): Promise<User> {
  return apiFetch<User>("/api/v1/users", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
