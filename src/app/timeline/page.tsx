"use client";

import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  fade_out,
  normalize,
  fade_out_scale_1,
  transition,
} from "@/lib/transitions";

export default function TimelinePage() {
  return (
    <motion.div
      initial={fade_out}
      animate={normalize}
      exit={fade_out_scale_1}
      transition={transition}
      className="container mx-auto px-4 py-16"
    >
      <Card className="max-w-2xl mx-auto">
        <CardContent className="py-12 text-center">
          <h1 className="text-4xl font-bold mb-4">Timeline</h1>
          <p className="text-xl text-muted-foreground">Coming Soon</p>
          <p className="text-sm text-muted-foreground mt-4">
            This feature is currently under development and will be available in
            a future update.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
