import { useState, useRef, useCallback } from 'react';

export interface DragItem {
  id: string;
  [key: string]: any;
}

export interface UseDragAndDropResult {
  draggedItem: DragItem | null;
  draggedOverIndex: number | null;
  handleDragStart: (id: string, index: number) => void;
  handleDragOver: (e: React.DragEvent, index: number) => void;
  handleDragEnd: () => void;
  handleDrop: (e: React.DragEvent, index: number) => void;
  isDragging: boolean;
}

export function useDragAndDrop<T extends DragItem>(
  items: T[],
  onReorder: (newItems: T[]) => void
): UseDragAndDropResult {
  const [draggedItem, setDraggedItem] = useState<T | null>(null);
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartIndex = useRef<number | null>(null);

  const handleDragStart = useCallback((id: string, index: number) => {
    const item = items.find(item => item.id === id);
    if (!item) return;

    setDraggedItem(item);
    setIsDragging(true);
    dragStartIndex.current = index;

    // Set drag image and effect
    const dragImage = document.createElement('div');
    dragImage.innerHTML = id;
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    document.body.appendChild(dragImage);

    // Clean up
    setTimeout(() => {
      document.body.removeChild(dragImage);
    }, 0);
  }, [items]);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDraggedOverIndex(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
    setDraggedOverIndex(null);
    setIsDragging(false);
    dragStartIndex.current = null;
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (dragStartIndex.current === null || draggedItem === null) {
      return;
    }

    const startIndex = dragStartIndex.current;

    if (startIndex === dropIndex) {
      handleDragEnd();
      return;
    }

    // Reorder the items
    const newItems = [...items];
    const [removed] = newItems.splice(startIndex, 1);
    newItems.splice(dropIndex, 0, removed);

    onReorder(newItems);
    handleDragEnd();
  }, [items, draggedItem, onReorder, handleDragEnd]);

  return {
    draggedItem,
    draggedOverIndex,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDrop,
    isDragging,
  };
}
