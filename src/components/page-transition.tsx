"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useContext, useRef } from "react";
import {
  fade_out,
  normalize,
  transition_fast,
  fade_out_scale_1,
} from "@/lib/transitions";

function FrozenRouter({ children }: { children: React.ReactNode }) {
  // Keep the *previous* route tree rendered while exit animation plays.
  // Without this, Next's App Router may swap the children to the next route
  // immediately, making exits appear to "not run".
  const context = useContext(LayoutRouterContext);
  const frozen = useRef(context).current;
  return (
    <LayoutRouterContext.Provider value={frozen}>
      {children}
    </LayoutRouterContext.Provider>
  );
}

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        // Ensure there's no "flash of visible content" before Framer applies initial.
        // This also matches SSR markup for smoother hydration.
        style={{ opacity: 0 }}
        initial={fade_out}
        animate={normalize}
        exit={fade_out_scale_1}
        transition={transition_fast}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
