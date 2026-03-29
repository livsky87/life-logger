import type { Category } from "@/domain/types";

export interface EventStyle {
  label: string;
  color: string; // Tailwind bg class
  textColor: string;
}

const locationStyles: Record<string, EventStyle> = {
  home:    { label: "집",    color: "bg-blue-500",  textColor: "text-white" },
  office:  { label: "회사",  color: "bg-indigo-500", textColor: "text-white" },
  gym:     { label: "헬스장", color: "bg-green-500", textColor: "text-white" },
  outside: { label: "외출",  color: "bg-sky-400",   textColor: "text-white" },
};

// context: duration-based states (shown as timeline bars, can overlap)
const contextStyles: Record<string, EventStyle> = {
  sleep:           { label: "수면",     color: "bg-slate-400",   textColor: "text-white" },
  meal:            { label: "식사",     color: "bg-yellow-400",  textColor: "text-white" },
  shower:          { label: "샤워",     color: "bg-sky-400",     textColor: "text-white" },
  cooking:         { label: "요리",     color: "bg-red-300",     textColor: "text-white" },
  work:            { label: "업무",     color: "bg-indigo-400",  textColor: "text-white" },
  exercise:        { label: "운동",     color: "bg-green-400",   textColor: "text-white" },
  rest:            { label: "휴식",     color: "bg-teal-300",    textColor: "text-white" },
  video:           { label: "영상 시청", color: "bg-purple-400",  textColor: "text-white" },
  music:           { label: "음악 시청", color: "bg-pink-400",    textColor: "text-white" },
  pet_walk:        { label: "펫 산책",  color: "bg-lime-400",    textColor: "text-white" },
};

// event: instantaneous actions (shown as dots)
const eventStyles: Record<string, EventStyle> = {
  fridge:          { label: "냉장고",    color: "bg-teal-500",   textColor: "text-white" },
  microwave:       { label: "전자레인지", color: "bg-orange-400", textColor: "text-white" },
  washing_machine: { label: "세탁기",    color: "bg-cyan-500",   textColor: "text-white" },
  door:            { label: "현관문",    color: "bg-gray-500",   textColor: "text-white" },
  light:           { label: "조명",      color: "bg-yellow-300", textColor: "text-gray-800" },
  tv_on:           { label: "TV 켬",    color: "bg-purple-400", textColor: "text-white" },
  tv_off:          { label: "TV 끔",    color: "bg-purple-200", textColor: "text-gray-700" },
  ac_on:           { label: "에어컨 켬", color: "bg-blue-300",   textColor: "text-white" },
  ac_off:          { label: "에어컨 끔", color: "bg-blue-100",   textColor: "text-blue-700" },
};

// legacy activity styles (backwards compat)
const activityStyles: Record<string, EventStyle> = {
  washing_machine: { label: "세탁기",    color: "bg-cyan-400",   textColor: "text-white" },
  fridge:          { label: "냉장고",    color: "bg-teal-400",   textColor: "text-white" },
  tv:              { label: "TV",        color: "bg-purple-500", textColor: "text-white" },
  shower:          { label: "샤워",      color: "bg-blue-300",   textColor: "text-white" },
  microwave:       { label: "전자레인지", color: "bg-orange-400", textColor: "text-white" },
  sleep:           { label: "수면",      color: "bg-slate-500",  textColor: "text-white" },
  meal:            { label: "식사",      color: "bg-yellow-500", textColor: "text-white" },
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
  if (category === "location")    return locationStyles[eventType]  ?? { ...fallback, label: eventType };
  if (category === "context")     return contextStyles[eventType]   ?? { ...fallback, label: eventType };
  if (category === "event")       return eventStyles[eventType]     ?? { ...fallback, label: eventType };
  if (category === "activity")    return activityStyles[eventType]  ?? { ...fallback, label: eventType };
  if (category === "api_request") return apiStyles[eventType]       ?? { ...fallback, label: eventType };
  return { ...fallback, label: eventType };
}

export const CATEGORY_LABELS: Record<Category, string> = {
  location:    "위치",
  context:     "컨텍스트",
  event:       "이벤트",
  activity:    "활동",
  api_request: "API",
};
