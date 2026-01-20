"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import BouncyClick from "@/components/ui/bouncy-click";
import { motion } from "framer-motion";
import {
  fade_out,
  normalize,
  fade_out_scale_1,
  transition,
} from "@/lib/transitions";
import Spinner from "@/components/ui/spinner";

const ME_QUERY = gql`
  query Me {
    me {
      id
    }
  }
`;

const CREATE_TIMELINE_MUTATION = gql`
  mutation CreateTimeline(
    $name: String
    $manifesto: String
    $unlisted: Boolean
    $anonymous: Boolean
  ) {
    createTimeline(
      name: $name
      manifesto: $manifesto
      unlisted: $unlisted
      anonymous: $anonymous
    ) {
      id
    }
  }
`;

function CreateTimelineContent() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [manifesto, setManifesto] = useState("");
  const [unlisted, setUnlisted] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [creating, setCreating] = useState(false);

  const { data: meData, loading: meLoading } = useQuery(ME_QUERY);
  const [createTimeline] = useMutation(CREATE_TIMELINE_MUTATION);

  const handleSubmit = async () => {
    if (!meData?.me) {
      toast.warning("You must be logged in to create a timeline.");
      return;
    }

    setCreating(true);

    try {
      const { data } = await createTimeline({
        variables: {
          name: name || null,
          manifesto: manifesto || "",
          unlisted,
          anonymous,
        },
      });

      toast.success("Timeline created successfully!");
      router.push(`/timeline/${data.createTimeline.id}`);
    } catch (error: any) {
      setCreating(false);
      console.error("Create timeline error:", error);
      toast.warning(error.message || "An error occurred while creating timeline.");
    } 
  };

  if (meLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (!meData?.me) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <Card className="p-8">
            <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
            <p className="text-muted-foreground mb-4">
              You must be logged in to create a timeline.
            </p>
            <Button asChild>
              <a href="/">Go Home</a>
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={fade_out}
      animate={normalize}
      exit={fade_out_scale_1}
      transition={transition}
      className="container mx-auto px-4 py-8"
    >
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-center">Timeline (Work in Progress)</h1>
        <p className="text-center text-muted-foreground">
          This feature is still under development.
        </p>

        <Card className="p-6 space-y-4">
          <div>
            <Label htmlFor="name">Title</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="(Optional)"
              disabled={creating}
            />
          </div>

          <div>
            <Label htmlFor="manifesto">Description</Label>
            <Textarea
              id="manifesto"
              value={manifesto}
              onChange={(e) => setManifesto(e.target.value)}
              placeholder="(Optional - Markdown supported)"
              disabled={creating}
              rows={6}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="unlisted"
                checked={unlisted}
                onCheckedChange={(checked) => setUnlisted(checked as boolean)}
                disabled={creating}
              />
              <Label htmlFor="unlisted">Keep unlisted</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="anonymous"
                checked={anonymous}
                onCheckedChange={(checked) => setAnonymous(checked as boolean)}
                disabled={creating}
              />
              <Label htmlFor="anonymous">Post anonymously</Label>
            </div>
          </div>

          <BouncyClick>
            <Button
              onClick={handleSubmit}
              disabled={creating}
              className="w-full text-white"
              size="lg"
            >
              {creating ? (
                <>
                  <Spinner color="white" size="sm" className="mr-2" />
                  Creating Timeline
                </>
              ) : (
                "Create Timeline"
              )}
            </Button>
          </BouncyClick>
        </Card>

        <p className="text-xs text-muted-foreground text-center">
          After creating your timeline, you can add timeline items with dates and
          associated files.
        </p>
      </div>
    </motion.div>
  );
}

export const runtime = "edge";

export default function CreateTimelinePage() {
  return <CreateTimelineContent />;
}
