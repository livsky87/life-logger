"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import type { SmartThingsDevice } from "@/domain/simulationTypes";
import type { ScheduleCall } from "@/domain/scheduleTypes";

interface Props {
  devices: SmartThingsDevice[];
  personLocation: string;    // current room name from schedule entry
  isHome: boolean;           // whether person is home
  recentCalls: ScheduleCall[];
}

const OUTSIDE_ROOM = "집 밖";

// Device type → icon mapping
const DEVICE_ICONS: Record<string, string> = {
  refrigerator: "🧊",
  fridge: "🧊",
  tv: "📺",
  television: "📺",
  light: "💡",
  bulb: "💡",
  lamp: "💡",
  ac: "❄️",
  airconditioner: "❄️",
  washer: "🫧",
  washingmachine: "🫧",
  microwave: "📡",
  speaker: "🔊",
  door: "🚪",
  window: "🪟",
  fan: "🌀",
  plug: "🔌",
  outlet: "🔌",
  thermostat: "🌡️",
  camera: "📷",
  robot: "🤖",
};

function getDeviceIcon(device: SmartThingsDevice): string {
  const typeKey = (device.type ?? device.name ?? "")
    .toLowerCase()
    .replace(/[\s_-]/g, "");
  for (const [key, icon] of Object.entries(DEVICE_ICONS)) {
    if (typeKey.includes(key)) return icon;
  }
  // Try label
  const labelKey = (device.label ?? "").toLowerCase().replace(/[\s_-]/g, "");
  for (const [key, icon] of Object.entries(DEVICE_ICONS)) {
    if (labelKey.includes(key)) return icon;
  }
  return "📦";
}

function isDeviceOn(device: SmartThingsDevice): boolean {
  // Check status.switch or status.on fields from JSONB
  const status = (device as unknown as Record<string, unknown>).status as Record<string, unknown> | undefined;
  if (!status) return true; // default to on if no status info
  if ("switch" in status) return status.switch === "on" || status.switch === true;
  if ("on" in status) return status.on === true;
  return true;
}

interface RoomInfo {
  name: string;
  devices: SmartThingsDevice[];
  gridArea?: string;
}

export function FloorPlan({ devices, personLocation, isHome, recentCalls }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [personPos, setPersonPos] = useState<{ x: number; y: number } | null>(null);
  const [prevRoom, setPrevRoom] = useState<string>("");

  // Recently activated device IDs
  const activeDeviceIds = useMemo(
    () => new Set(recentCalls.map((c) => c.deviceId).filter(Boolean)),
    [recentCalls],
  );

  // Determine effective person location
  const effectiveLocation = isHome ? (personLocation || "") : OUTSIDE_ROOM;

  // Collect unique rooms from devices
  const rooms: RoomInfo[] = useMemo(() => {
    const roomMap = new Map<string, SmartThingsDevice[]>();
    for (const d of devices) {
      const r = d.roomId || "기타";
      if (!roomMap.has(r)) roomMap.set(r, []);
      roomMap.get(r)!.push(d);
    }
    return Array.from(roomMap.entries()).map(([name, devs]) => ({ name, devices: devs }));
  }, [devices]);

  const gridCols = Math.min(3, Math.max(2, rooms.length));

  // Smooth person position tracking via DOM
  useEffect(() => {
    if (!containerRef.current) return;

    const targetRoom = effectiveLocation;
    if (targetRoom === prevRoom && personPos !== null) return;
    setPrevRoom(targetRoom);

    // Delay slightly to let DOM settle (especially after index change)
    const raf = requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();

      const roomId = targetRoom === OUTSIDE_ROOM ? "room-outside" : `room-${targetRoom}`;
      const roomEl = container.querySelector(`[data-room-id="${roomId}"]`) as HTMLElement | null;

      if (roomEl) {
        const rect = roomEl.getBoundingClientRect();
        setPersonPos({
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top - containerRect.top + rect.height * 0.35,
        });
      }
    });

    return () => cancelAnimationFrame(raf);
  }, [effectiveLocation, prevRoom, personPos]);

  return (
    <div ref={containerRef} className="flex-1 overflow-auto p-4 relative select-none">
      {/* Outside area */}
      <div
        data-room-id="room-outside"
        className={`mb-4 border-2 rounded-xl p-3 transition-all duration-300 ${
          effectiveLocation === OUTSIDE_ROOM
            ? "border-gray-400 bg-gray-100 shadow-sm"
            : "border-dashed border-gray-200 bg-gray-50"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-500">🌍 집 밖</span>
        </div>
      </div>

      {/* Indoor rooms grid */}
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
      >
        {rooms.map((room) => {
          const isPersonHere = effectiveLocation === room.name;
          return (
            <div
              key={room.name}
              data-room-id={`room-${room.name}`}
              className={`border-2 rounded-xl p-3 transition-all duration-300 min-h-[120px] ${
                isPersonHere
                  ? "border-indigo-400 bg-indigo-50 shadow-sm"
                  : "border-gray-200 bg-white"
              }`}
            >
              {/* Room header */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-700">{room.name}</span>
              </div>

              {/* Devices */}
              <div className="flex flex-wrap gap-2">
                {room.devices.length === 0 && (
                  <span className="text-xs text-gray-300">기기 없음</span>
                )}
                {room.devices.map((device) => {
                  const active = activeDeviceIds.has(device.deviceId);
                  const on = isDeviceOn(device);
                  const icon = getDeviceIcon(device);
                  return (
                    <div
                      key={device.deviceId}
                      title={`${device.label || device.name} (${on ? "켜짐" : "꺼짐"})`}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 cursor-pointer
                        transition-all duration-300 min-w-[60px]
                        ${active
                          ? "border-amber-400 bg-amber-50 scale-110 shadow-md"
                          : "border-gray-200 bg-white"}
                        ${!on ? "opacity-40 grayscale" : ""}
                      `}
                    >
                      <span className={`text-xl ${active ? "animate-pulse" : ""}`}>{icon}</span>
                      <span className="text-[10px] text-gray-500 truncate max-w-[56px] text-center leading-tight">
                        {device.label || device.name}
                      </span>
                      {/* On/off indicator */}
                      <span className={`w-1.5 h-1.5 rounded-full ${on ? "bg-green-400" : "bg-gray-300"}`} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {rooms.length === 0 && (
          <div className="col-span-full text-center text-gray-400 text-sm py-8">
            시뮬레이션 구성에 기기가 없습니다.
          </div>
        )}
      </div>

      {/* Floating person avatar — smoothly transitions between rooms */}
      {personPos !== null && (
        <div
          className="absolute pointer-events-none z-10 transition-all duration-500 ease-in-out"
          style={{
            left: personPos.x - 20,
            top: personPos.y - 20,
          }}
        >
          <div className="w-10 h-10 rounded-full bg-indigo-600 border-2 border-white shadow-lg flex items-center justify-center text-lg">
            🧑
          </div>
          <div className="text-center text-[10px] text-indigo-700 font-semibold mt-0.5 whitespace-nowrap">
            {effectiveLocation}
          </div>
        </div>
      )}
    </div>
  );
}
