"use client";

import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";

interface TimelineRibbonProps {
  items: Array<{
    id: number;
    startDate: string;
    endDate?: string | null;
    color: string;
  }>;
  onDateRangeChange: (range: { start: Date; end: Date } | null) => void;
}

export default function TimelineRibbon({
  items,
  onDateRangeChange,
}: TimelineRibbonProps) {
  const ribbonRef = useRef<HTMLDivElement>(null);
  const [initialized, setInitialized] = useState(false);
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

  // Add padding to date range (10% on each side, minimum 1 day)
  const paddedDateRange = dateRange
    ? (() => {
        const timeDiff = dateRange.max.getTime() - dateRange.min.getTime();
        // If single item or very close dates, add at least 1 week padding on each side
        const padding = Math.max(timeDiff * 0.1, 7 * 24 * 60 * 60 * 1000);
        return {
          min: new Date(dateRange.min.getTime() - padding),
          max: new Date(dateRange.max.getTime() + padding),
        };
      })()
    : null;

  // Initialize lens to cover at least one item - only run once when items first appear
  useEffect(() => {
    if (!initialized && items.length > 0) {
      setInitialized(true);
      // Use a small delay to ensure paddedDateRange is calculated
      setTimeout(() => {
        setLensPosition(0);
        setLensWidth(100); // Start with full width to show all items
      }, 0);
    }
  }, [initialized, items.length]);

  // Store previous range to avoid unnecessary updates
  const prevRangeRef = useRef<{ start: number; end: number } | null>(null);

  // Calculate visible date range based on lens position
  useEffect(() => {
    if (!paddedDateRange) {
      if (prevRangeRef.current !== null) {
        prevRangeRef.current = null;
        onDateRangeChange(null);
      }
      return;
    }

    const totalTime = paddedDateRange.max.getTime() - paddedDateRange.min.getTime();
    const lensStartTime =
      paddedDateRange.min.getTime() + (totalTime * lensPosition) / 100;
    const lensEndTime =
      paddedDateRange.min.getTime() +
      (totalTime * (lensPosition + lensWidth)) / 100;

    // Only update if the range actually changed
    if (
      !prevRangeRef.current ||
      prevRangeRef.current.start !== lensStartTime ||
      prevRangeRef.current.end !== lensEndTime
    ) {
      prevRangeRef.current = { start: lensStartTime, end: lensEndTime };
      onDateRangeChange({
        start: new Date(lensStartTime),
        end: new Date(lensEndTime),
      });
    }
  }, [lensPosition, lensWidth, paddedDateRange?.min?.getTime(), paddedDateRange?.max?.getTime(), onDateRangeChange]);

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

  // Generate date markers (5 evenly spaced) with unique labels
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

  // Check for duplicate labels and make them more specific
  const labeledMarkers = dateMarkers.map((marker, index) => {
    // Generate candidate labels for all markers first
    const candidateLabels = dateMarkers.map(m => 
      m.date.toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      })
    );

    // Check if this label would be duplicate
    const myLabel = candidateLabels[index];
    const hasDuplicate = candidateLabels.filter(l => l === myLabel).length > 1;

    let label: string;
    if (hasDuplicate) {
      // Check if we need even more specificity (same day)
      const sameDayExists = dateMarkers.some((other, otherIndex) => {
        if (index === otherIndex) return false;
        return (
          other.date.getDate() === marker.date.getDate() &&
          other.date.getMonth() === marker.date.getMonth() &&
          other.date.getFullYear() === marker.date.getFullYear()
        );
      });

      if (sameDayExists) {
        // Use day + month + time format
        label = marker.date.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
        });
      } else {
        // Use day + month format
        label = marker.date.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        });
      }
    } else {
      // Use month + year format
      label = myLabel;
    }

    return { ...marker, label };
  });

  // Calculate item positions and widths
  const itemPositions = items.map((item) => {
    const start = new Date(item.startDate);
    const end = item.endDate ? new Date(item.endDate) : null;
    const totalTime = paddedDateRange.max.getTime() - paddedDateRange.min.getTime();
    const itemStartTime = start.getTime() - paddedDateRange.min.getTime();
    const startPercent = (itemStartTime / totalTime) * 100;

    let width = 0;
    if (end) {
      const itemEndTime = end.getTime() - paddedDateRange.min.getTime();
      const endPercent = (itemEndTime / totalTime) * 100;
      width = endPercent - startPercent;
    }

    return {
      id: item.id,
      startPercent: Math.max(0, Math.min(100, startPercent)),
      width: Math.max(0, width),
      color: item.color,
      hasEndDate: !!end
    };
  });

  return (
    <Card className="fixed bottom-0 left-0 right-0 p-4 rounded-none border-t border-x-0 border-b-0 bg-background/95 backdrop-blur">
      <div className="container mx-auto max-w-6xl">
        <div ref={ribbonRef} className="relative h-16">
          {/* Timeline bar */}
          <div className="absolute inset-x-0 top-8 h-2 bg-muted rounded-full">
            {/* Item markers */}
            {itemPositions.map((pos) => (
              pos.hasEndDate ? (
                // Date range - render as a bar
                <div
                  key={pos.id}
                  className="absolute h-2 rounded-full"
                  style={{
                    left: `${pos.startPercent}%`,
                    width: `${pos.width}%`,
                    backgroundColor: pos.color,
                    opacity: 0.6,
                    top: "0"
                  }}
                />
              ) : (
                // Single date - render as a dot
                <div
                  key={pos.id}
                  className="absolute w-2 h-2 rounded-full -translate-x-1/2"
                  style={{
                    left: `${pos.startPercent}%`,
                    backgroundColor: pos.color,
                    opacity: 0.6,
                    top: "0"
                  }}
                />
              )
            ))}
          </div>

          {/* Date markers */}
          <div className="absolute inset-x-0 top-12 flex justify-between text-xs text-muted-foreground">
            {labeledMarkers.map((marker, i) => (
              <div
                key={i}
                className="flex flex-col items-center"
                style={{ position: "absolute", left: `${marker.percent}%`, transform: "translateX(-50%)" }}
              >
                <div className="w-px h-2 bg-muted-foreground/30" />
                <span className="mt-1">
                  {marker.label}
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

