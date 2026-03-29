import type { Category } from "@/domain/types";

interface EventStyle {
  label: string;
  color: string; // Tailwind bg class
  textColor: string;
}

const locationStyles: Record<string, EventStyle> = {
  home:    { label: "집",   color: "bg-blue-500",   textColor: "text-white" },
  office:  { label: "회사", color: "bg-indigo-500",  textColor: "text-white" },
  gym:     { label: "헬스장", color: "bg-green-500", textColor: "text-white" },
  outside: { label: "외출", color: "bg-sky-400",     textColor: "text-white" },
};

const activityStyles: Record<string, EventStyle> = {
  washing_machine: { label: "세탁기",  color: "bg-cyan-400",    textColor: "text-white" },
  fridge:          { label: "냉장고",  color: "bg-teal-400",    textColor: "text-white" },
  tv:              { label: "TV",      color: "bg-purple-500",  textColor: "text-white" },
  shower:          { label: "샤워",    color: "bg-blue-300",    textColor: "text-white" },
  microwave:       { label: "전자레인지", color: "bg-orange-400", textColor: "text-white" },
  sleep:           { label: "수면",    color: "bg-slate-500",   textColor: "text-white" },
  meal:            { label: "식사",    color: "bg-yellow-500",  textColor: "text-white" },
};

const apiStyles: Record<string, EventStyle> = {
  GET:    { label: "GET",    color: "bg-emerald-500", textColor: "text-white" },
  POST:   { label: "POST",   color: "bg-amber-500",   textColor: "text-white" },
  PUT:    { label: "PUT",    color: "bg-blue-600",    textColor: "text-white" },
  DELETE: { label: "DELETE", color: "bg-red-500",     textColor: "text-white" },
  PATCH:  { label: "PATCH",  color: "bg-pink-500",    textColor: "text-white" },
};

const fallback: EventStyle = { label: "", color: "bg-gray-400", textColor: "text-white" };

export function getEventStyle(category: Category, eventType: string): EventStyle {
  if (category === "location") return locationStyles[eventType] ?? { ...fallback, label: eventType };
  if (category === "activity") return activityStyles[eventType] ?? { ...fallback, label: eventType };
  if (category === "api_request") return apiStyles[eventType] ?? { ...fallback, label: eventType };
  return { ...fallback, label: eventType };
}

export const CATEGORY_LABELS: Record<Category, string> = {
  location: "위치",
  activity: "활동",
  api_request: "API",
};
