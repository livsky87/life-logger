export type Category = "location" | "activity" | "api_request";

// location:    'home' | 'office' | 'gym' | 'outside' | ...
// activity:    'washing_machine' | 'fridge' | 'tv' | 'shower' | ...
// api_request: 'GET' | 'POST' | 'PUT' | 'DELETE'

export interface LifeLogEvent {
  id: number;
  category: Category;
  event_type: string;
  started_at: string; // ISO8601
  ended_at: string | null;
  data: Record<string, unknown>;
}

export interface TimelineUser {
  user_id: string;
  user_name: string;
  events: LifeLogEvent[];
}

export interface TimelineLocation {
  location_id: string;
  name: string;
  timezone: string;
  users: TimelineUser[];
}

export interface TimelineResponse {
  date: string;
  locations: TimelineLocation[];
}

export interface Location {
  id: string;
  location_code: string | null;
  name: string;
  timezone: string;
  description: string | null;
  created_at: string;
}

export interface User {
  id: string;
  location_id: string;
  name: string;
  email: string | null;
  job: string | null;
  created_at: string;
}

export interface LifeLog {
  id: number;
  user_id: string;
  location_id: string;
  category: Category;
  event_type: string;
  started_at: string;
  ended_at: string | null;
  data: Record<string, unknown>;
  created_at: string;
}
