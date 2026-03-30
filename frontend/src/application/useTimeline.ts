"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchTimeline } from "@/infrastructure/api/lifeLogApi";
import type { TimelineFilter } from "@/domain/types";

/**
 * Derive which DB categories we need to fetch based on the current filter state.
 * This is the primary mechanism for keeping API payloads small on weekly/monthly views:
 * only categories that are actually visible in the UI get sent to the backend.
 *
 *  showLocation → "location"
 *  showContext  → "activity" + "context"   (duration-based bars)
 *  showEvent    → "activity" + "event"     (instantaneous dots — also stored as activity)
 *
 * Because context and event both map to "activity" in the DB, if either is on
 * we must request "activity". Duplicates are removed automatically via Set.
 */
function filterToCategories(filter: TimelineFilter): string[] {
  const cats = new Set<string>();
  if (filter.showLocation) cats.add("location");
  if (filter.showContext) {
    cats.add("activity");
    cats.add("context");
  }
  if (filter.showEvent) {
    cats.add("activity");
    cats.add("event");
  }
  // api_request is always fetched — per-user show/hide is handled locally in UserRow
  cats.add("api_request");
  return Array.from(cats);
}

export function useTimeline(
  start: string,
  end: string,
  locationIds: string[],
  filter: TimelineFilter,
) {
  const categories = useMemo(
    () => filterToCategories(filter),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filter.showLocation, filter.showContext, filter.showEvent],
  );

  return useQuery({
    queryKey: ["timeline", start, end, locationIds, categories],
    queryFn: () => fetchTimeline(start, end, locationIds, categories),
    staleTime: 30_000,
    refetchInterval: 60_000,
    // Skip the request entirely if nothing would be shown
    enabled: categories.length > 0,
  });
}
