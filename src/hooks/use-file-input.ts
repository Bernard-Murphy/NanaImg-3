import { useState, useCallback, useEffect, useRef } from "react";

export interface FileInputOptions {
  multiple?: boolean;
  accept?: string;
  directory?: boolean;
}

export interface UseFileInputResult {
  selectFiles: (options?: FileInputOptions) => Promise<File[]>;
  isSelecting: boolean;
  setIsSelecting: (isSelecting: boolean) => void;
}

export function useFileInput(): UseFileInputResult {
  const [isSelecting, setIsSelecting] = useState(false);

  const selectFiles = useCallback(
    (options: FileInputOptions = {}): Promise<File[]> => {
      return new Promise((resolve) => {
        // if (isSelecting) {
        //   resolve([]);
        //   return;
        // }

        setIsSelecting(true);

        // Create virtual file input
        const input = document.createElement("input");
        input.type = "file";
        input.multiple = options.multiple ?? true;
        input.style.visibility = "hidden";
        input.style.position = "fixed";

        if (options.accept) {
          input.accept = options.accept;
        }

        if (options.directory) {
          (input as any).webkitdirectory = true;
          (input as any).directory = true;
        }

        // Handle file selection
        input.onchange = (e) => {
          cleanup();
          const target = e.target as HTMLInputElement;
          const files = target.files ? Array.from(target.files) : [];
          if (document.body.contains(input)) {
            document.body.removeChild(input);
          }
          setIsSelecting(false);
          resolve(files);
        };

        // Handle cancel (when user clicks cancel or ESC)
        const handleCancel = () => {
          cleanup();
          if (document.body.contains(input)) {
            document.body.removeChild(input);
          }
          setIsSelecting(false);
          resolve([]);
        };

        // Listen for when the window regains focus (file dialog closed)
        const handleWindowFocus = () => {
          // Small delay to allow onchange to fire first if files were selected
          // setTimeout(() => {
          //   if (document.body.contains(input)) {
          //     handleCancel();
          //   }
          // }, 100);
        };

        // Listen for focus loss as a backup
        input.onblur = handleCancel;

        window.addEventListener("focus", handleWindowFocus, { once: true });

        // Clean up after a delay if not handled
        const timeoutId = setTimeout(() => {
          cleanup();
          if (document.body.contains(input)) {
            handleCancel();
          }
        }, 30000); // 30 second timeout

        // Clean up event listeners when done
        const cleanup = () => {
          window.removeEventListener("focus", handleWindowFocus);
          clearTimeout(timeoutId);
        };

        document.body.appendChild(input);
        input.click();
      });
    },
    [isSelecting]
  );

  return {
    selectFiles,
    isSelecting,
    setIsSelecting,
  };
}

export interface UseDragAndDropAreaResult {
  isDragActive: boolean;
  dragCounter: number;
}

export function useDragAndDropArea(
  onDrop: (files: File[]) => void,
  elementId?: string
): UseDragAndDropAreaResult {
  const [isDragActive, setIsDragActive] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = elementId
      ? document.getElementById(elementId)
      : document.body;

    if (!element) return;

    elementRef.current = element;

    const preventDefaults = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDragEnter = (e: DragEvent) => {
      preventDefaults(e);
      setDragCounter((prev) => prev + 1);
      setIsDragActive(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      preventDefaults(e);
      setDragCounter((prev) => {
        const newCounter = prev - 1;
        if (newCounter === 0) {
          setIsDragActive(false);
        }
        return newCounter;
      });
    };

    const handleDragOver = (e: DragEvent) => {
      preventDefaults(e);
    };

    const handleDrop = (e: DragEvent) => {
      preventDefaults(e);
      setDragCounter(0);
      setIsDragActive(false);

      if (e.dataTransfer?.files) {
        const files = Array.from(e.dataTransfer.files);
        onDrop(files);
      }
    };

    // Add event listeners
    ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
      element.addEventListener(
        eventName,
        preventDefaults as EventListener,
        false
      );
    });

    element.addEventListener(
      "dragenter",
      handleDragEnter as EventListener,
      false
    );
    element.addEventListener(
      "dragleave",
      handleDragLeave as EventListener,
      false
    );
    element.addEventListener(
      "dragover",
      handleDragOver as EventListener,
      false
    );
    element.addEventListener("drop", handleDrop as EventListener, false);

    return () => {
      // Clean up event listeners
      ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
        element.removeEventListener(
          eventName,
          preventDefaults as EventListener,
          false
        );
      });

      element.removeEventListener(
        "dragenter",
        handleDragEnter as EventListener,
        false
      );
      element.removeEventListener(
        "dragleave",
        handleDragLeave as EventListener,
        false
      );
      element.removeEventListener(
        "dragover",
        handleDragOver as EventListener,
        false
      );
      element.removeEventListener("drop", handleDrop as EventListener, false);
    };
  }, [onDrop, elementId]);

  return {
    isDragActive,
    dragCounter,
  };
}

export interface UsePasteResult {
  isPasting: boolean;
}

export function usePaste(onPaste: (files: File[]) => void): UsePasteResult {
  const [isPasting, setIsPasting] = useState(false);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData?.files || e.clipboardData.files.length === 0) {
        return;
      }

      setIsPasting(true);

      const files = Array.from(e.clipboardData.files);
      onPaste(files);

      // Reset after a short delay
      setTimeout(() => setIsPasting(false), 100);
    };

    document.addEventListener("paste", handlePaste);

    return () => {
      document.removeEventListener("paste", handlePaste);
    };
  }, [onPaste]);

  return {
    isPasting,
  };
}
