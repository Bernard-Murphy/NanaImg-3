"use client";

import { useCallback, useState } from "react";
import { useParams } from "next/navigation";
import { gql, useQuery, useMutation } from "@apollo/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  ArrowUp,
  ArrowDown,
  Eye,
  MessageSquare,
  Plus,
  Info,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { CopeSection } from "@/components/cope-section";
import { motion, AnimatePresence } from "framer-motion";
import {
  fade_out,
  normalize,
  fade_out_scale_1,
  transition,
} from "@/lib/transitions";
import BouncyClick from "@/components/ui/bouncy-click";
import Counter from "@/components/ui/counter";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import TimelineRibbon from "@/components/timeline-ribbon";
import TimelineItemDialog from "@/components/timeline-item-dialog";

const TIMELINE_QUERY = gql`
  query GetTimeline($id: Int!) {
    timeline(id: $id) {
      id
      name
      manifesto
      timestamp
      removed
      views
      karma
      userVote
      commentCount
      canEdit
      user {
        id
        username
      }
      anonId
      anonTextColor
      anonTextBackground
      items {
        id
        title
        description
        startDate
        endDate
        files {
          id
          thumbnailUrl
          mimeType
        }
        albums {
          id
          files {
            id
            thumbnailUrl
            mimeType
          }
        }
      }
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

export default function TimelinePageClient() {
  const params = useParams();
  const timelineId = parseInt(params.id as string);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(
    null
  );
  const handleDateRangeChange = useCallback(
    (range: { start: Date; end: Date } | null) => {
      setDateRange((prev) => {
        if (!prev && !range) return prev;
        if (!range) return null;
        if (
          prev &&
          prev.start.getTime() === range.start.getTime() &&
          prev.end.getTime() === range.end.getTime()
        ) {
          return prev;
        }
        return range;
      });
    },
    []
  );

  const { data, loading, refetch } = useQuery(TIMELINE_QUERY, {
    variables: { id: timelineId },
  });
  const { data: meData } = useQuery(ME_QUERY);
  const [vote] = useMutation(VOTE_MUTATION);

  const timeline = data?.timeline;

  const handleVote = async (voteValue: number) => {
    if (!meData?.me) {
      toast.warning("You must be logged in to vote.");
      return;
    }

    try {
      await vote({
        variables: {
          flavor: "timeline",
          contentId: timelineId,
          vote: timeline?.userVote === voteValue ? 0 : voteValue,
        },
      });
      refetch();
    } catch (error: any) {
      toast.warning(error.message);
    }
  };

  // Filter items based on date range from lens
  const visibleItems = timeline?.items?.filter((item: any) => {
    if (!dateRange) return false; // Only show items within the lens range
    const itemStart = new Date(item.startDate);
    const itemEnd = item.endDate ? new Date(item.endDate) : itemStart;
    return itemStart <= dateRange.end && itemEnd >= dateRange.start;
  }) || [];

  // Sort visible items by number of associated files (for priority display)
  const sortedVisibleItems = [...visibleItems].sort((a: any, b: any) => {
    const aFileCount = a.files.length + a.albums.reduce((sum: number, album: any) => sum + album.files.length, 0);
    const bFileCount = b.files.length + b.albums.reduce((sum: number, album: any) => sum + album.files.length, 0);
    return bFileCount - aFileCount;
  });

  return (
    <div
      className="w-full py-4 pb-32"
    >
      {loading ? (
        <div className="px-4">
          <Card className="p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-1/4" />
              <div className="h-32 bg-muted rounded" />
            </div>
          </Card>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {!timeline || timeline.removed ? (
            <motion.div
              initial={fade_out}
              animate={normalize}
              exit={fade_out_scale_1}
              key="not-found"
              transition={transition}
              className="px-4 text-center"
            >
              <Card className="p-8">
                <h1 className="text-2xl font-bold mb-4">Timeline Not Found</h1>
                <p className="text-muted-foreground mb-4">
                  {timeline?.removed
                    ? "This timeline has been removed."
                    : "This timeline does not exist."}
                </p>
                <Button asChild>
                  <Link href="/browse">Browse Timelines</Link>
                </Button>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="exists"
              initial={fade_out}
              animate={normalize}
              exit={fade_out_scale_1}
              transition={transition}
              className="flex gap-4 px-4"
            >
              {/* Main Content Area */}
              <div className="flex-1 space-y-4">
                {/* Mobile Info Button */}
                <div className="lg:hidden">
                  <BouncyClick>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowInfo(true)}
                      className="w-full"
                    >
                      <Info className="h-4 w-4 mr-2" />
                      Timeline Info
                    </Button>
                  </BouncyClick>
                </div>

                {/* Timeline Items Display */}
                {sortedVisibleItems.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                    {sortedVisibleItems.map((item: any) => {
                      const allFiles = [
                        ...item.files,
                        ...item.albums.flatMap((album: any) => album.files),
                      ];
                      const thumbnail = allFiles[0]?.thumbnailUrl;

                      return (
                        <BouncyClick key={item.id}>
                          <Card
                            className="overflow-hidden cursor-pointer hover:border-primary transition-colors"
                            onClick={() => setSelectedItem(item)}
                          >
                            {thumbnail && (
                              <div className="aspect-square relative bg-muted">
                                <img
                                  src={thumbnail}
                                  alt={item.title || "Timeline item"}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <CardContent className="p-3">
                              <div className="space-y-1">
                                <div className="text-xs text-muted-foreground truncate">
                                  {new Date(item.startDate).toLocaleDateString()}
                                </div>
                                <div className="text-sm font-medium truncate">
                                  {item.title || "Untitled"}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {allFiles.length} file{allFiles.length !== 1 ? "s" : ""}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </BouncyClick>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-muted-foreground">
                      {timeline.items?.length === 0
                        ? "No timeline items yet. Click 'Add Item' to get started"
                        : "No items in the selected date range."}
                    </p>
                  </div>
                )}
              </div>

              {/* Desktop Sidebar */}
              <div className="hidden lg:block w-80 xl:w-96 space-y-4">
                <div className="flex items-center justify-end gap-2">
                  <BouncyClick>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowComments(true)}
                    >
                      <MessageSquare className="h-4 w-4" />
                      Comments ({timeline.commentCount})
                    </Button>
                  </BouncyClick>

                  {timeline.canEdit && (
                    <BouncyClick>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setShowAddItem(true)}
                      >
                        <Plus className="h-4 w-4" />
                        Add Item
                      </Button>
                    </BouncyClick>
                  )}
                </div>
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex justify-between">
                      <div>
                      <h1 className="text-2xl font-bold mb-2">
                        {timeline.name || "Untitled Timeline"}
                      </h1>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <div>
                          {timeline.user ? (
                            <Link
                              href={`/u/${timeline.user.username}`}
                              className="hover:underline"
                            >
                              {timeline.user.username}
                            </Link>
                          ) : (
                            <>
                              Anon{" "}
                              <span
                                className="px-2 py-1 rounded text-xs font-medium"
                                style={{
                                  color: timeline.anonTextColor,
                                  backgroundColor: timeline.anonTextBackground,
                                }}
                              >
                                {timeline.anonId}
                              </span>
                            </>
                          )}
                        </div>
                        <div>{formatDate(timeline.timestamp)}</div>
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          <Counter count={timeline.views} />
                        </div>
                      </div>
  
                    </div>
                                        <div className="flex flex-col items-center gap-2">
                      <BouncyClick>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleVote(1)}
                          className={timeline.userVote === 1 ? "text-primary" : ""}
                        >
                          <ArrowUp className="h-5 w-5" />
                        </Button>
                      </BouncyClick>
                      <span className="text-xl font-bold">
                        <Counter count={timeline.karma} />
                      </span>
                      <BouncyClick>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleVote(-1)}
                          className={
                            timeline.userVote === -1 ? "text-primary" : ""
                          }
                        >
                          <ArrowDown className="h-5 w-5" />
                        </Button>
                      </BouncyClick>
                    </div>
                    </div>

                    {timeline.manifesto && (
                      <div className="text-sm text-muted-foreground prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {timeline.manifesto}
                        </ReactMarkdown>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-2">
                      

                      {/* Voting */}
                      {/* <div className="flex items-center justify-center gap-2 border rounded-md p-2">
                        <BouncyClick>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleVote(1)}
                          >
                            <ArrowUp
                              className={`h-4 w-4 ${
                                timeline.userVote === 1 ? "text-primary" : ""
                              }`}
                            />
                          </Button>
                        </BouncyClick>
                        <span className="text-sm font-bold min-w-[2rem] text-center">
                          <Counter count={timeline.karma} />
                        </span>
                        <BouncyClick>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleVote(-1)}
                          >
                            <ArrowDown
                              className={`h-4 w-4 ${
                                timeline.userVote === -1 ? "text-primary" : ""
                              }`}
                            />
                          </Button>
                        </BouncyClick>
                      </div> */}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Timeline Ribbon */}
              <TimelineRibbon
                items={timeline.items || []}
                onDateRangeChange={handleDateRangeChange}
              />

              {/* Mobile Info Dialog */}
              <Dialog open={showInfo} onOpenChange={setShowInfo}>
                <DialogContent className="[&>button]:hidden max-w-lg">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h2 className="text-xl font-bold mb-2">
                          {timeline.name || "Untitled Timeline"}
                        </h2>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          <div>
                            {timeline.user ? (
                              <Link
                                href={`/u/${timeline.user.username}`}
                                className="hover:underline"
                              >
                                {timeline.user.username}
                              </Link>
                            ) : (
                              <>
                                Anon{" "}
                                <span
                                  className="px-2 py-1 rounded text-xs font-medium"
                                  style={{
                                    color: timeline.anonTextColor,
                                    backgroundColor: timeline.anonTextBackground,
                                  }}
                                >
                                  {timeline.anonId}
                                </span>
                              </>
                            )}
                          </div>
                          <div>{formatDate(timeline.timestamp)}</div>
                          <div className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            <Counter count={timeline.views} />
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowInfo(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {timeline.manifesto && (
                      <div className="text-sm text-muted-foreground prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {timeline.manifesto}
                        </ReactMarkdown>
                      </div>
                    )}

                    <div className="space-y-2">
                      <BouncyClick>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowInfo(false);
                            setShowComments(true);
                          }}
                          className="w-full"
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Comments ({timeline.commentCount})
                        </Button>
                      </BouncyClick>

                      {timeline.canEdit && (
                        <BouncyClick>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => {
                              setShowInfo(false);
                              setShowAddItem(true);
                            }}
                            className="w-full"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Item
                          </Button>
                        </BouncyClick>
                      )}

                      <div className="flex items-center justify-center gap-2 border rounded-md p-2">
                        <BouncyClick>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleVote(1)}
                          >
                            <ArrowUp
                              className={`h-4 w-4 ${
                                timeline.userVote === 1 ? "text-primary" : ""
                              }`}
                            />
                          </Button>
                        </BouncyClick>
                        <span className="text-sm font-bold min-w-[2rem] text-center">
                          <Counter count={timeline.karma} />
                        </span>
                        <BouncyClick>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleVote(-1)}
                          >
                            <ArrowDown
                              className={`h-4 w-4 ${
                                timeline.userVote === -1 ? "text-primary" : ""
                              }`}
                            />
                          </Button>
                        </BouncyClick>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Comments Dialog */}
              <Dialog open={showComments} onOpenChange={setShowComments}>
                <DialogContent className="[&>button]:hidden max-w-4xl max-h-[80vh] overflow-y-auto">
                  <div className="absolute top-0 right-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="p-4 h-2 w-2"
                      onClick={() => setShowComments(false)}
                    >
                      <X className="h-2 w-2" />
                    </Button>
                  </div>
                  <CopeSection flavor="timeline" contentId={timelineId} />
                </DialogContent>
              </Dialog>

              {/* Add/Edit Timeline Item Dialog */}
              {(showAddItem || selectedItem) && (
                <TimelineItemDialog
                  open={showAddItem || !!selectedItem}
                  onOpenChange={(open) => {
                    if (!open) {
                      setShowAddItem(false);
                      setSelectedItem(null);
                    }
                  }}
                  timelineId={timelineId}
                  item={selectedItem}
                  canEdit={timeline.canEdit}
                  onSuccess={() => {
                    refetch();
                    setShowAddItem(false);
                    setSelectedItem(null);
                  }}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
