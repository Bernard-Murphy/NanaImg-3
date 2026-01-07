"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { gql, useQuery, useMutation } from "@apollo/client";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, MessageSquare, Reply, LogIn } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import BouncyClick from "./ui/bouncy-click";
import { AuthDialog } from "@/components/auth-dialog";
import Spinner from "./ui/spinner";

// Validation schema
const commentSchema = z.object({
  text: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(1000, "Comment must be 1000 characters or less"),
});

type CommentForm = z.infer<typeof commentSchema>;
import { motion, AnimatePresence } from "framer-motion";
import {
  normalize,
  fade_out,
  transition_fast,
  fade_out_scale_1,
} from "@/lib/transitions";

const COMMENTS_QUERY = gql`
  query Comments($flavor: String!, $contentId: Int!) {
    comments: ${`commentsByContent`}(flavor: $flavor, contentId: $contentId) {
      id
      timestamp
      text
      removed
      repliesTo
      replyCount
      karma
      userVote
      user {
        username
      }
      anonId
      anonTextColor
      anonTextBackground
    }
  }
`;

const CREATE_COMMENT_MUTATION = gql`
  mutation CreateComment(
    $flavor: String!
    $contentId: Int!
    $text: String!
    $repliesTo: Int
    $recaptchaToken: String
  ) {
    createComment(
      flavor: $flavor
      contentId: $contentId
      text: $text
      repliesTo: $repliesTo
      recaptchaToken: $recaptchaToken
    ) {
      id
    }
  }
`;

const VOTE_MUTATION = gql`
  mutation Vote($flavor: String!, $contentId: Int!, $vote: Int!) {
    vote(flavor: $flavor, contentId: $contentId, vote: $vote)
  }
`;

const ME_QUERY = gql`
  query Me {
    me {
      id
    }
  }
`;

interface Comment {
  id: number;
  timestamp: string;
  text: string;
  removed: boolean;
  repliesTo: number | null;
  replyCount: number;
  karma: number;
  userVote: number | null;
  user: { username: string } | null;
  anonId: string;
  anonTextColor: string;
  anonTextBackground: string;
}

interface CopeProps {
  flavor: "file" | "album" | "timeline" | "user";
  contentId: number;
}

function CopeSectionContent({ flavor, contentId }: CopeProps) {
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [sort, setSort] = useState<"newest" | "popular">("popular");
  const [repliesDialogOpen, setRepliesDialogOpen] = useState(false);
  const [selectedCommentReplies, setSelectedCommentReplies] = useState<
    Comment[]
  >([]);
  const [postAnonymously, setPostAnonymously] = useState(false);

  const commentForm = useForm<CommentForm>({
    resolver: zodResolver(commentSchema),
    defaultValues: {
      text: "",
    },
  });

  const { data: meData, refetch: refetchMe } = useQuery(ME_QUERY);
  const { data, loading, refetch } = useQuery(COMMENTS_QUERY, {
    variables: { flavor, contentId },
  });
  const [createComment, { loading: creating }] = useMutation(
    CREATE_COMMENT_MUTATION
  );
  const [vote] = useMutation(VOTE_MUTATION);

  const comments: Comment[] = data?.comments || [];

  const topLevelComments = comments.filter((c) => !c.repliesTo);
  const sortedComments = [...topLevelComments].sort((a, b) => {
    if (sort === "newest") {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    }
    return b.karma - a.karma;
  });

  const handleSubmit = async (data: CommentForm) => {
    try {
      let recaptchaToken = "";
      if (typeof window !== "undefined" && (window as any).grecaptcha) {
        try {
          recaptchaToken = await (window as any).grecaptcha.execute(
            process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
            { action: "comment" }
          );
        } catch (e) {
          console.error("reCAPTCHA error:", e);
        }
      }

      await createComment({
        variables: {
          flavor,
          contentId,
          text: data.text,
          repliesTo: replyTo,
          recaptchaToken,
        },
      });

      commentForm.reset();
      setReplyTo(null);
      setPostAnonymously(false);
      refetch();
      toast.success("Comment posted");
    } catch (error: any) {
      toast.warning(error.message);
    }
  };

  const handleVote = async (commentId: number, voteValue: number) => {
    if (!meData?.me) {
      toast.warning("You must be logged in to vote.");
      return;
    }

    try {
      await vote({
        variables: {
          flavor: "comment",
          contentId: commentId,
          vote: voteValue,
        },
      });
      refetch();
    } catch (error: any) {
      toast.warning(error.message);
    }
  };

  const showReplies = (comment: Comment) => {
    const replies = comments.filter((c) => c.repliesTo === comment.id);
    setSelectedCommentReplies(replies);
    setRepliesDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Cope Section ({comments.length})</h2>
        <div className="flex gap-2">
          <BouncyClick>
            <Button
              variant={sort === "popular" ? "default" : "outline"}
              size="sm"
              onClick={() => setSort("popular")}
            >
              Popular
            </Button>
          </BouncyClick>
          <BouncyClick>
            <Button
              variant={sort === "newest" ? "default" : "outline"}
              size="sm"
              onClick={() => setSort("newest")}
            >
              Newest
            </Button>
          </BouncyClick>
        </div>
      </div>

      <Card className="p-4">
        <form
          onSubmit={commentForm.handleSubmit(handleSubmit)}
          className="space-y-4"
        >
          {replyTo && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Reply className="h-4 w-4" />
              Replying to comment #{replyTo}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setReplyTo(null)}
              >
                Cancel
              </Button>
            </div>
          )}

          <Textarea
            {...commentForm.register("text")}
            placeholder={
              meData?.me
                ? "Write a comment (Markdown supported)..."
                : "Write an anonymous comment (Markdown supported)..."
            }
            disabled={creating}
          />
          {commentForm.formState.errors.text && (
            <p className="text-sm text-destructive">
              {commentForm.formState.errors.text.message}
            </p>
          )}

          <div className="flex flex-col space-y-3">
            {meData?.me && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="anonymous"
                  checked={postAnonymously}
                  onCheckedChange={(checked) =>
                    setPostAnonymously(checked === true)
                  }
                />
                <label
                  htmlFor="anonymous"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Post anonymously
                </label>
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">
                {commentForm.watch("text")?.length || 0}/1000 characters
              </span>
              <div className="flex items-center gap-2">
                {!meData?.me && (
                  <AuthDialog onSuccess={() => refetchMe()}>
                    <BouncyClick>
                      <Button variant="outline" size="sm" type="button">
                        <LogIn className="h-4 w-4 mr-1" />
                        Login
                      </Button>
                    </BouncyClick>
                  </AuthDialog>
                )}
                <BouncyClick
                  disabled={creating || !commentForm.watch("text")?.trim()}
                >
                  <Button
                    type="submit"
                    disabled={creating || !commentForm.watch("text")?.trim()}
                  >
                    {creating ? (
                      <Spinner size="sm" color="light" />
                    ) : (
                      "Post Comment"
                    )}
                  </Button>
                </BouncyClick>
              </div>
            </div>
          </div>
        </form>
      </Card>
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="spinner"
            className="flex justify-center py-8 items-center h-full"
            initial={fade_out}
            animate={normalize}
            exit={fade_out_scale_1}
            transition={transition_fast}
          >
            <Spinner size="md" color="light" />
          </motion.div>
        ) : sortedComments.length === 0 ? (
          <motion.div
            key="no-comments"
            className="text-center py-8 text-muted-foreground"
            initial={fade_out}
            animate={normalize}
            exit={fade_out_scale_1}
            transition={transition_fast}
          >
            Nobody has posted any cope. Be the first!
          </motion.div>
        ) : (
          <motion.div
            key="comments"
            className="space-y-4"
            initial={fade_out}
            animate={normalize}
            exit={fade_out_scale_1}
            transition={transition_fast}
          >
            {sortedComments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onVote={handleVote}
                onReply={(id) => setReplyTo(id)}
                onShowReplies={showReplies}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={repliesDialogOpen} onOpenChange={setRepliesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replies</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {selectedCommentReplies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                onVote={handleVote}
                onReply={() => {}}
                onShowReplies={() => {}}
                compact
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <p className="text-xs text-muted-foreground text-center">
        This site is protected by reCAPTCHA, and the Google{" "}
        <a href="https://policies.google.com/privacy" className="underline">
          Privacy Policy
        </a>{" "}
        and{" "}
        <a href="https://policies.google.com/terms" className="underline">
          Terms of Service
        </a>{" "}
        apply.
      </p>
    </div>
  );
}

interface CommentItemProps {
  comment: Comment;
  onVote: (id: number, vote: number) => void;
  onReply: (id: number) => void;
  onShowReplies: (comment: Comment) => void;
  compact?: boolean;
}

function CommentItem({
  comment,
  onVote,
  onReply,
  onShowReplies,
  compact,
}: CommentItemProps) {
  if (comment.removed) {
    return (
      <Card className="p-4 bg-muted/50">
        <p className="text-muted-foreground italic">[Cope removed]</p>
      </Card>
    );
  }

  const author = comment.user?.username || `Anon ${comment.anonId}`;
  const isAnon = !comment.user;

  return (
    <Card className="p-4">
      <div className="flex gap-4">
        <div className="flex flex-col items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onVote(comment.id, comment.userVote === 1 ? 0 : 1)}
          >
            <ArrowUp
              className={`h-4 w-4 ${
                comment.userVote === 1 ? "fill-primary text-primary" : ""
              }`}
            />
          </Button>
          <span className="text-sm font-medium">{comment.karma}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onVote(comment.id, comment.userVote === -1 ? 0 : -1)}
          >
            <ArrowDown
              className={`h-4 w-4 ${
                comment.userVote === -1 ? "fill-primary text-primary" : ""
              }`}
            />
          </Button>
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            {isAnon ? (
              <div
                className="px-2 py-1 rounded text-xs font-medium"
                style={{
                  color: comment.anonTextColor,
                  backgroundColor: comment.anonTextBackground,
                }}
              >
                {author}
              </div>
            ) : (
              <Link
                href={`/u/${author}`}
                className="font-medium hover:underline"
              >
                {author}
              </Link>
            )}
            <span className="text-xs text-muted-foreground">
              {formatDate(comment.timestamp)}
            </span>
            <Link
              href={`/comment/${comment.id}`}
              className="text-xs text-muted-foreground hover:underline"
            >
              #{comment.id}
            </Link>
          </div>

          {comment.repliesTo && (
            <div className="text-xs text-muted-foreground">
              <Link
                href={`/comment/${comment.repliesTo}`}
                className="hover:underline"
              >
                Replying to #{comment.repliesTo}
              </Link>
            </div>
          )}

          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{comment.text}</ReactMarkdown>
          </div>

          {!compact && (
            <div className="flex items-center gap-4 text-sm">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReply(comment.id)}
              >
                <Reply className="h-4 w-4 mr-1" />
                Reply
              </Button>
              {comment.replyCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onShowReplies(comment)}
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  {comment.replyCount}{" "}
                  {comment.replyCount === 1 ? "reply" : "replies"}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export function CopeSection({ flavor, contentId }: CopeProps) {
  return <CopeSectionContent flavor={flavor} contentId={contentId} />;
}
