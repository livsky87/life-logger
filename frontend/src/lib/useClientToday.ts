"use client";

import { useEffect, useState } from "react";
import { isToday } from "date-fns";

/**
 * 서버(SSR)와 브라우저의 로컬 날짜가 달라 `isToday`가 어긋나 하이드레이션 오류가 나지 않도록,
 * 클라이언트 마운트 이후에만 "오늘" 여부를 반환합니다.
 */
export function useIsClientCalendarToday(calendarDate: Date): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted && isToday(calendarDate);
}
