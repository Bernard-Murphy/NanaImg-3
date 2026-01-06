import React from 'react';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DraggableItemProps {
  id: string;
  index: number;
  isDragging?: boolean;
  isDraggedOver?: boolean;
  onDragStart: (id: string, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  children: React.ReactNode;
  className?: string;
}

export function DraggableItem({
  id,
  index,
  isDragging = false,
  isDraggedOver = false,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  children,
  className,
}: DraggableItemProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    onDragStart(id, index);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      onDrop={(e) => onDrop(e, index)}
      className={cn(
        'relative transition-all duration-200',
        isDragging && 'opacity-50 scale-95',
        isDraggedOver && 'border-t-2 border-primary',
        className
      )}
    >
      <div className="flex items-center gap-4">
        <div className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}

interface DragDropContainerProps {
  children: React.ReactNode;
  className?: string;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

export function DragDropContainer({
  children,
  className,
  onDragOver,
  onDrop,
}: DragDropContainerProps) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    onDragOver?.(e);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDrop?.(e);
  };

  return (
    <div
      className={cn('space-y-2', className)}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}
    </div>
  );
}
