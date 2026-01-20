"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  fade_out,
  normalize,
  fade_out_scale_1,
  transition,
} from "@/lib/transitions";
import Link from "next/link";
import BouncyClick from "@/components/ui/bouncy-click";
import { Plus, List } from "lucide-react";

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
        <CardContent className="py-12 text-center space-y-6">
          <h1 className="text-4xl font-bold mb-4">Timelines</h1>
          <p className="text-xl text-muted-foreground">
            Create interactive timelines with dates, descriptions, and associated files
          </p>
          <div className="flex gap-4 justify-center">
            <BouncyClick>
              <Button asChild size="lg">
                <Link href="/timeline/create">
                  <Plus className="h-5 w-5 mr-2" />
                  Create Timeline
                </Link>
              </Button>
            </BouncyClick>
            <BouncyClick>
              <Button asChild variant="outline" size="lg">
                <Link href="/browse?filter=timelines">
                  <List className="h-5 w-5 mr-2" />
                  Browse Timelines
                </Link>
              </Button>
            </BouncyClick>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
