import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => {
  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-1 w-full overflow-hidden rounded-2 bg-secondary",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={`h-full w-full flex-1 ${
          value !== 100 ? "bg-primary" : "bg-green-500"
        } transition-all`}
        style={{
          transform:
            value && value >= 100
              ? undefined
              : `translateX(-${100 - (value || 0)}%)`,
          transitionDuration: value
            ? // ? `${0.6 - 0.6 * ((value || 0) / 100)}s`
              `${0.6}s`
            : undefined,
        }}
      />
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
