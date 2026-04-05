"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import clsx from "clsx";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Tooltip({ content, children, className }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<{ top: boolean; alignEnd: boolean }>({
    top: false,
    alignEnd: false,
  });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setPos((p) => ({ ...p, top: spaceBelow < 180 }));
    }
    if (!visible) {
      setPos({ top: false, alignEnd: false });
    }
  }, [visible]);

  useLayoutEffect(() => {
    if (!visible || !triggerRef.current || !tooltipRef.current) return;
    const t = triggerRef.current.getBoundingClientRect();
    const tip = tooltipRef.current.getBoundingClientRect();
    const margin = 8;
    const overflowRight = tip.right > window.innerWidth - margin;
    setPos((p) => ({ ...p, alignEnd: overflowRight }));
  }, [visible, content]);

  return (
    <div
      ref={triggerRef}
      className={clsx("relative inline-flex", className)}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && content && (
        <div
          ref={tooltipRef}
          className={clsx(
            "absolute z-50 w-max max-w-xs",
            "bg-gray-900 text-white text-xs rounded-lg shadow-xl",
            "px-3 py-2 pointer-events-none",
            pos.top ? "bottom-full mb-1.5" : "top-full mt-1.5",
            pos.alignEnd ? "right-0 left-auto" : "left-0"
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
