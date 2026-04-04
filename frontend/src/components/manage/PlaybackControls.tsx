"use client";

import { useRef } from "react";
import clsx from "clsx";
import type { Schedule } from "@/domain/scheduleTypes";

const SPEEDS = [1, 5, 10, 25, 50, 100];

function formatScheduleHm(entry: Schedule): string {
  const d = new Date(entry.datetime);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

interface Props {
  entries: Schedule[];
  currentIndex: number;
  isPlaying: boolean;
  speed: number;
  onPlay: () => void;
  onPause: () => void;
  onSpeedChange: (s: number) => void;
  onSeek: (index: number) => void;
}

export function PlaybackControls({
  entries,
  currentIndex,
  isPlaying,
  speed,
  onPlay,
  onPause,
  onSpeedChange,
  onSeek,
}: Props) {
  const barRef = useRef<HTMLDivElement>(null);
  const total = entries.length;
  const progress = total > 1 ? (currentIndex / (total - 1)) * 100 : 0;

  const current = entries[currentIndex];
  const timeLabel = current ? formatScheduleHm(current) : "--:--";

  const handleBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!barRef.current || total === 0) return;
    const rect = barRef.current.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const idx = Math.round(ratio * (total - 1));
    onSeek(idx);
  };

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3 space-y-2">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono text-gray-500 w-10 shrink-0">
          {entries[0] ? formatScheduleHm(entries[0]) : "00:00"}
        </span>
        <div className="flex-1 relative">
          {/* Current time label */}
          <div
            className="absolute -top-5 text-xs font-mono text-indigo-600 font-semibold"
            style={{ left: `${progress}%`, transform: "translateX(-50%)" }}
          >
            {timeLabel}
          </div>
          {/* Bar */}
          <div
            ref={barRef}
            className="h-2 bg-gray-200 rounded-full cursor-pointer hover:bg-gray-300 transition relative"
            onClick={handleBarClick}
          >
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
            {/* Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-indigo-600 rounded-full shadow border-2 border-white"
              style={{ left: `${progress}%`, transform: "translateX(-50%) translateY(-50%)" }}
            />
          </div>
        </div>
        <span className="text-xs font-mono text-gray-500 w-10 shrink-0 text-right">
          {entries.length > 0
            ? formatScheduleHm(entries[entries.length - 1])
            : "23:59"}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {/* Play/Pause */}
        <button
          onClick={isPlaying ? onPause : onPlay}
          disabled={total === 0}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {isPlaying ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Entry counter */}
        <span className="text-xs text-gray-500">
          {total > 0 ? `${currentIndex + 1} / ${total}` : "0 / 0"}
        </span>

        {/* Speed buttons */}
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-xs text-gray-400 mr-1">속도</span>
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={clsx(
                "px-2 py-1 text-xs rounded font-medium transition",
                speed === s
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Current entry description */}
      {current && (
        <div className="text-xs text-gray-500 truncate pt-0.5">
          <span className="text-gray-400 mr-1">📍 {current.location || "위치 없음"}</span>
          {current.description}
        </div>
      )}
    </div>
  );
}
