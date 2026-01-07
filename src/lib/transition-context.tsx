"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type TransitionDirection = "default" | "left" | "right";

interface TransitionContextType {
  direction: TransitionDirection;
  setDirection: (direction: TransitionDirection) => void;
}

const TransitionContext = createContext<TransitionContextType | undefined>(
  undefined
);

export function TransitionProvider({ children }: { children: ReactNode }) {
  const [direction, setDirection] = useState<TransitionDirection>("default");

  return (
    <TransitionContext.Provider value={{ direction, setDirection }}>
      {children}
    </TransitionContext.Provider>
  );
}

export function useTransitionDirection() {
  const context = useContext(TransitionContext);
  if (!context) {
    throw new Error("useTransitionDirection must be used within TransitionProvider");
  }
  return context;
}
