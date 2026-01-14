import {
  motion,
  AnimatePresence,
  type TargetAndTransition,
} from "framer-motion";
import { normalize } from "@/lib/transitions";
import { useEffect, useState } from "react";

/**
 * Animated count that I made
 * Intuitive number display with scrolling digits
 *
 * If fraction, count will be displayed like: count / max, with increasing count increasing the numerator
 * Else, count will be displayed as (max - count)
 */

export interface CountProps {
  count: number;
  max?: number;
  fraction?: boolean; // Count will be displayed like: count / max
}

export default function AnimatedCount({ count, fraction, max }: CountProps) {
  return <></>;
  const [currentCount, setCurrentCount] = useState<number>(count);
  const [entrance, setEntrance] = useState<TargetAndTransition>({ opacity: 0 });
  const [exit, setExit] = useState<TargetAndTransition>({ opacity: 0 });

  useEffect(() => {
    if (fraction) {
      if (count > currentCount) {
        if (exit.y !== -10) {
          setExit({
            opacity: 0,
            y: -10,
          });
        } else setCurrentCount(count);
      } else if (count < currentCount) {
        if (exit.y !== 10) {
          setExit({
            opacity: 0,
            y: 10,
          });
        } else setCurrentCount(count);
      }
    } else {
      if (count > currentCount) {
        if (exit.y !== -10) {
          setExit({
            opacity: 0,
            y: -10,
          });
        } else {
          setCurrentCount(count);
        }
      } else if (count < currentCount) {
        if (exit.y !== 10) {
          setExit({
            opacity: 0,
            y: 10,
          });
        } else setCurrentCount(count);
      }
    }
  }, [count]);

  useEffect(() => {
    if (fraction) {
      if (count > currentCount) {
        if (entrance.y !== -10) {
          setEntrance({
            opacity: 0,
            y: -10,
          });
        } else setCurrentCount(count);
      } else if (count < currentCount) {
        if (entrance.y !== 10) {
          setEntrance({
            opacity: 0,
            y: 10,
          });
        } else setCurrentCount(count);
      }
    } else {
      if (count > currentCount) {
        if (entrance.y !== 10) {
          setEntrance({
            opacity: 0,
            y: 10,
          });
        } else setCurrentCount(count);
      } else if (count < currentCount) {
        if (entrance.y !== -10) {
          setEntrance({
            opacity: 0,
            y: -10,
          });
        } else setCurrentCount(count);
      }
    }
  }, [JSON.stringify(exit)]);

  useEffect(() => {
    setCurrentCount(count);
  }, [JSON.stringify(entrance)]);

  const split = String(
    fraction || !max ? currentCount : max - currentCount
  ).split("");

  return (
    <div className="flex overflow-hidden" key={String(split.length)}>
      {split.map((char, index) => {
        return (
          <AnimatePresence mode="wait" key={String(char)}>
            <motion.div
              transition={{
                x: { duration: 0.13 },
                y: { duration: 0.13 },
                opacity: { duration: 0.08 },
                scale: { duration: 0.08 },
              }}
              key={String(char) + String(index)}
              exit={exit}
              animate={normalize}
              initial={entrance}
              className={max && count > max ? "text-red-400" : ""}
            >
              {char}
            </motion.div>
          </AnimatePresence>
        );
      })}
      {fraction && max && (
        <>
          <div className="mx-2">/</div>
          <div>{max}</div>
        </>
      )}
    </div>
  );
}
