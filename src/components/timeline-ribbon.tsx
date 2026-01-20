"use client";

import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";

interface TimelineRibbonProps {
  items: Array<{
    id: number;
    startDate: string;
    endDate?: string | null;
  }>;
  onDateRangeChange: (range: { start: Date; end: Date } | null) => void;
}

export default function TimelineRibbon({
  items,
  onDateRangeChange,
}: TimelineRibbonProps) {
  const ribbonRef = useRef<HTMLDivElement>(null);
  const [lensPosition, setLensPosition] = useState(0); // 0-100 percentage
  const [lensWidth, setLensWidth] = useState(30); // percentage
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<"left" | "right" | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, lensPos: 0, lensWidth: 0 });

  // Calculate date range from items
  const dateRange = items.length > 0
    ? items.reduce(
        (range, item) => {
          const start = new Date(item.startDate);
          const end = item.endDate ? new Date(item.endDate) : start;
          return {
            min: range.min < start ? range.min : start,
            max: range.max > end ? range.max : end,
          };
        },
        {
          min: new Date(items[0].startDate),
          max: new Date(items[0].endDate || items[0].startDate),
        }
      )
    : null;

  // Add padding to date range (10% on each side)
  const paddedDateRange = dateRange
    ? {
        min: new Date(
          dateRange.min.getTime() -
            (dateRange.max.getTime() - dateRange.min.getTime()) * 0.1
        ),
        max: new Date(
          dateRange.max.getTime() +
            (dateRange.max.getTime() - dateRange.min.getTime()) * 0.1
        ),
      }
    : null;

  // Calculate visible date range based on lens position
  useEffect(() => {
    if (!paddedDateRange) {
      onDateRangeChange(null);
      return;
    }

    const totalTime = paddedDateRange.max.getTime() - paddedDateRange.min.getTime();
    const lensStartTime =
      paddedDateRange.min.getTime() + (totalTime * lensPosition) / 100;
    const lensEndTime =
      paddedDateRange.min.getTime() +
      (totalTime * (lensPosition + lensWidth)) / 100;

    onDateRangeChange({
      start: new Date(lensStartTime),
      end: new Date(lensEndTime),
    });
  }, [lensPosition, lensWidth, paddedDateRange, onDateRangeChange]);

  const handleMouseDown = (
    e: React.MouseEvent,
    action: "drag" | "resize-left" | "resize-right"
  ) => {
    e.preventDefault();
    setDragStart({
      x: e.clientX,
      lensPos: lensPosition,
      lensWidth: lensWidth,
    });

    if (action === "drag") {
      setIsDragging(true);
    } else if (action === "resize-left") {
      setIsResizing("left");
    } else {
      setIsResizing("right");
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!ribbonRef.current) return;

      const ribbonRect = ribbonRef.current.getBoundingClientRect();
      const deltaX = e.clientX - dragStart.x;
      const deltaPercent = (deltaX / ribbonRect.width) * 100;

      if (isDragging) {
        const newPos = Math.max(
          0,
          Math.min(100 - lensWidth, dragStart.lensPos + deltaPercent)
        );
        setLensPosition(newPos);
      } else if (isResizing === "left") {
        const newPos = Math.max(
          0,
          Math.min(
            dragStart.lensPos + dragStart.lensWidth - 5,
            dragStart.lensPos + deltaPercent
          )
        );
        const newWidth = dragStart.lensPos + dragStart.lensWidth - newPos;
        setLensPosition(newPos);
        setLensWidth(Math.max(5, newWidth));
      } else if (isResizing === "right") {
        const newWidth = Math.max(
          5,
          Math.min(100 - dragStart.lensPos, dragStart.lensWidth + deltaPercent)
        );
        setLensWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(null);
    };

    if (isDragging || isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart, lensWidth]);

  if (!paddedDateRange) {
    return null;
  }

  // Generate date markers (5 evenly spaced)
  const dateMarkers = Array.from({ length: 5 }, (_, i) => {
    const percent = (i / 4) * 100;
    const time =
      paddedDateRange.min.getTime() +
      ((paddedDateRange.max.getTime() - paddedDateRange.min.getTime()) * i) / 4;
    return {
      percent,
      date: new Date(time),
    };
  });

  // Calculate item positions
  const itemPositions = items.map((item) => {
    const start = new Date(item.startDate);
    const totalTime = paddedDateRange.max.getTime() - paddedDateRange.min.getTime();
    const itemTime = start.getTime() - paddedDateRange.min.getTime();
    const percent = (itemTime / totalTime) * 100;
    return { id: item.id, percent: Math.max(0, Math.min(100, percent)) };
  });

  return (
    <Card className="fixed bottom-0 left-0 right-0 p-4 rounded-none border-t border-x-0 border-b-0 bg-background/95 backdrop-blur">
      <div className="container mx-auto max-w-6xl">
        <div ref={ribbonRef} className="relative h-16">
          {/* Timeline bar */}
          <div className="absolute inset-x-0 top-8 h-2 bg-muted rounded-full">
            {/* Item markers */}
            {itemPositions.map((pos) => (
              <div
                key={pos.id}
                className="absolute w-2 h-2 bg-primary rounded-full -translate-x-1/2"
                style={{ left: `${pos.percent}%`, top: "0" }}
              />
            ))}
          </div>

          {/* Date markers */}
          <div className="absolute inset-x-0 top-12 flex justify-between text-xs text-muted-foreground">
            {dateMarkers.map((marker, i) => (
              <div
                key={i}
                className="flex flex-col items-center"
                style={{ position: "absolute", left: `${marker.percent}%`, transform: "translateX(-50%)" }}
              >
                <div className="w-px h-2 bg-muted-foreground/30" />
                <span className="mt-1">
                  {marker.date.toLocaleDateString(undefined, {
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            ))}
          </div>

          {/* Lens */}
          <div
            className="absolute top-6 h-6 bg-primary/20 border-2 border-primary rounded cursor-move"
            style={{
              left: `${lensPosition}%`,
              width: `${lensWidth}%`,
            }}
            onMouseDown={(e) => handleMouseDown(e, "drag")}
          >
            {/* Left resize handle */}
            <div
              className="absolute left-0 top-0 bottom-0 w-2 bg-primary cursor-ew-resize hover:bg-primary/80"
              onMouseDown={(e) => {
                e.stopPropagation();
                handleMouseDown(e, "resize-left");
              }}
            />
            {/* Right resize handle */}
            <div
              className="absolute right-0 top-0 bottom-0 w-2 bg-primary cursor-ew-resize hover:bg-primary/80"
              onMouseDown={(e) => {
                e.stopPropagation();
                handleMouseDown(e, "resize-right");
              }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}

