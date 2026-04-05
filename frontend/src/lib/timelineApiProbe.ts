import type { ApiObservationBatchCreate, ApiObservationOutcome } from "@/domain/apiObservationTypes";
import { createApiObservationsBatch } from "@/infrastructure/api/apiObservationApi";

const PROBE_DETAIL = "GET /api/v1/locations (타임라인 자동 점검)";

/**
 * 가벼운 읽기 전용 호출로 HDE(가용성)를 점검하고, 결과를 api-observations에 기록합니다.
 * POST에는 Admin Bearer가 필요합니다(세션에 토큰이 있을 때만 호출하세요).
 */
export async function probeLocationsListAndReport(locationId: string): Promise<void> {
  const started = Date.now();
  let httpStatus: number | null = null;
  let outcome: ApiObservationOutcome = "failure";
  let description = "";

  try {
    const res = await fetch("/api/v1/locations", { method: "GET" });
    httpStatus = res.status;
    const elapsed = Date.now() - started;
    if (res.ok) {
      outcome = "success";
      description = `응답 ${elapsed}ms`;
    } else if (res.status >= 500) {
      outcome = "failure";
      const t = await res.text();
      description = t.slice(0, 300) || `HTTP ${res.status}`;
    } else {
      outcome = "warning";
      description = `HTTP ${res.status} · ${elapsed}ms`;
    }
  } catch (e) {
    outcome = "failure";
    description = e instanceof Error ? e.message : "네트워크 오류";
  }

  const body: ApiObservationBatchCreate = {
    items: [
      {
        observed_at: new Date().toISOString(),
        method: "GET",
        detail: PROBE_DETAIL,
        http_status: httpStatus,
        outcome,
        description,
        location_id: locationId,
        user_id: null,
      },
    ],
  };
  await createApiObservationsBatch(body);
}
