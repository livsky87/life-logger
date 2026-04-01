"use client";

import { useState, useRef, useEffect } from "react";
import clsx from "clsx";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Tooltip({ content, children, className }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<{ top: boolean }>({ top: false });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setPos({ top: spaceBelow < 180 });
    }
  }, [visible]);

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
            "left-0"
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
