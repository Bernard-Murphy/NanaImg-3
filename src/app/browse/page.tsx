"use client";

import { useState } from "react";
import { gql, useQuery } from "@apollo/client";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  FileText,
  MessageSquare,
  Eye,
  ArrowUp,
  Camera,
  Film,
  Volume2,
  FolderOpen,
  RefreshCw,
  X,
} from "lucide-react";
import { getFileExtension } from "@/lib/utils";
import BouncyClick from "@/components/ui/bouncy-click";
import { AnimatePresence, motion } from "framer-motion";
import {
  normalize,
  fade_out,
  transition_fast,
  transition,
  fade_out_scale_1,
} from "@/lib/transitions";
import Counter from "@/components/ui/counter";
import Spinner from "@/components/ui/spinner";

// Helper function to get display name
const getDisplayName = (item: any) => {
  if (item.name) return item.name;
  if (item.__typename === "File") return item.fileName;
  return "Untitled";
};

const BROWSE_QUERY = gql`
  query Browse(
    $page: Int
    $limit: Int
    $sort: String
    $filter: String
    $search: String
  ) {
    browse(
      page: $page
      limit: $limit
      sort: $sort
      filter: $filter
      search: $search
    ) {
      items {
        ... on File {
          id
          name
          fileName
          timestamp
          thumbnailUrl
          mimeType
          views
          commentCount
          karma
          user {
            username
          }
          anonId
          anonTextColor
          anonTextBackground
        }
        ... on Album {
          id
          name
          timestamp
          views
          commentCount
          karma
          user {
            username
          }
          anonId
          anonTextColor
          anonTextBackground
          files {
            thumbnailUrl
            mimeType
          }
        }
        ... on Timeline {
          id
          name
          timestamp
          views
          commentCount
          karma
          user {
            username
          }
          anonId
          anonTextColor
          anonTextBackground
        }
      }
      total
      hasMore
    }
  }
`;

function BrowsePageContent() {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("recent");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { data, loading, refetch } = useQuery(BROWSE_QUERY, {
    variables: {
      page,
      limit: 49,
      sort,
      filter,
      search,
    },
  });

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
    refetch();
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearch("");
    setPage(1);
    refetch();
  };

  const handleFilterChange = (value: string) => {
    setFilter(value);
    setPage(1);
    refetch();
  };

  const handleSortChange = (value: string) => {
    setSort(value);
    setPage(1);
    refetch();
  };

  const items = data?.browse?.items || [];
  const hasMore = data?.browse?.hasMore || false;

  return (
    <motion.div
      initial={fade_out}
      animate={normalize}
      exit={fade_out_scale_1}
      transition={transition}
      className="container mx-auto px-4 py-8"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Browse</h1>

        <Card className="p-6 space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="Search files, albums, and timelines..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className={search ? "pr-10" : ""}
                  />
                  {search && (
                    <button
                      onClick={handleClearSearch}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
                      type="button"
                    >
                      <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </button>
                  )}
                </div>
                <BouncyClick>
                  <Button className="w-full" onClick={handleSearch}>
                    <Search className="h-4 w-4" />
                  </Button>
                </BouncyClick>
              </div>
            </div>
          </div>

          <div className="flex gap-4 flex-wrap">
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">
                Sort By
              </Label>
              <Tabs value={sort} onValueChange={handleSortChange}>
                <TabsList>
                  <BouncyClick>
                    <TabsTrigger value="recent">Recent</TabsTrigger>
                  </BouncyClick>
                  <BouncyClick>
                    <TabsTrigger value="recent-comment">
                      Recent Cope
                    </TabsTrigger>
                  </BouncyClick>
                  <BouncyClick>
                    <TabsTrigger value="popular">Popular</TabsTrigger>
                  </BouncyClick>
                </TabsList>
              </Tabs>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">
                Filter
              </Label>
              <Tabs value={filter} onValueChange={handleFilterChange}>
                <TabsList>
                  <BouncyClick>
                    <TabsTrigger value="all">All</TabsTrigger>
                  </BouncyClick>
                  <BouncyClick>
                    <TabsTrigger value="files">Files</TabsTrigger>
                  </BouncyClick>
                  <BouncyClick>
                    <TabsTrigger value="albums">Albums</TabsTrigger>
                  </BouncyClick>
                  <BouncyClick>
                    <TabsTrigger value="timelines">Timelines</TabsTrigger>
                  </BouncyClick>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex flex-1 justify-end items-end">
              <BouncyClick>
                <Button
                  variant="outline"
                  onClick={() => refetch()}
                  disabled={loading}
                >
                  {loading ? (
                    <Spinner size="sm" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </BouncyClick>
            </div>
          </div>
        </Card>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              initial={fade_out}
              animate={normalize}
              exit={fade_out_scale_1}
              transition={transition_fast}
              key="loading"
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3"
            >
              {[...Array(12)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="aspect-square bg-muted" />
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4" />
                  </CardHeader>
                </Card>
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={fade_out}
              animate={normalize}
              exit={fade_out_scale_1}
              transition={transition_fast}
            >
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                {items.map((item: any) => (
                  <BrowseItem
                    key={`${item.__typename}-${item.id}`}
                    item={item}
                  />
                ))}
              </div>

              {items.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg text-muted-foreground">
                    No items found
                  </p>
                </div>
              )}

              {items.length > 0 && (
                <div className="flex justify-center gap-4 mt-4">
                  <BouncyClick disabled={page === 1}>
                    <Button
                      onClick={() => {
                        setPage((p) => Math.max(1, p - 1));
                        refetch();
                      }}
                      disabled={page === 1}
                      variant="outline"
                    >
                      Previous
                    </Button>
                  </BouncyClick>

                  <span className="flex items-center text-sm text-muted-foreground">
                    Page {page}
                  </span>
                  <BouncyClick disabled={!hasMore}>
                    <Button
                      onClick={() => {
                        setPage((p) => p + 1);
                        refetch();
                      }}
                      disabled={!hasMore}
                      variant="outline"
                    >
                      Next
                    </Button>
                  </BouncyClick>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith("image/"))
    return <Camera className="h-12 w-12 text-muted-foreground" />;
  if (mimeType.startsWith("video/"))
    return <Film className="h-12 w-12 text-muted-foreground" />;
  if (mimeType.startsWith("audio/"))
    return <Volume2 className="h-12 w-12 text-muted-foreground" />;
  if (mimeType.length)
    return <FileText className="h-12 w-12 text-muted-foreground" />;
  return <FolderOpen className="h-12 w-12 text-muted-foreground" />;
};

function BrowseItem({ item }: { item: any }) {
  const isFile = item.__typename === "File";
  const isAlbum = item.__typename === "Album";
  const isTimeline = item.__typename === "Timeline";

  const href = isFile
    ? `/file/${item.id}`
    : isAlbum
    ? `/album/${item.id}`
    : `/timeline/${item.id}`;

  const thumbnail = isFile
    ? item.thumbnailUrl || null
    : isAlbum
    ? item.files[0]?.thumbnailUrl || null
    : null;

  const showEmbed = thumbnail || (isFile && item.mimeType.startsWith("image/"));
  const author = item.user?.username || "Anon";
  const isAnon = !item.user;

  return (
    <BouncyClick>
      <Link href={href}>
        <Card className="overflow-hidden hover:border-primary transition-colors cursor-pointer">
          {showEmbed ? (
            <div className="aspect-square relative bg-muted">
              {thumbnail ? (
                <Image
                  src={thumbnail}
                  alt={getDisplayName(item)}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-4xl font-bold text-muted-foreground">
                  {getFileExtension(getDisplayName(item))}
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-square relative bg-muted flex items-center justify-center">
              {getFileIcon(item.mimeType || "")}
            </div>
          )}

          <CardContent className="p-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-muted-foreground">
                  {item.__typename} #{item.id}
                </span>
                {isFile && (
                  <span className="text-xs text-muted-foreground">
                    {item.mimeType.split("/")[1]?.toUpperCase()}
                  </span>
                )}
              </div>

              <div className="text-sm font-medium truncate">
                {getDisplayName(item)}
              </div>

              <div className="text-xs text-muted-foreground">
                {isAnon ? (
                  <>
                    {author + " "}
                    <span
                      className="px-1.5 py-0.5 rounded text-xs font-medium"
                      style={{
                        color: item.anonTextColor,
                        backgroundColor: item.anonTextBackground,
                      }}
                    >
                      {item.anonId}
                    </span>
                  </>
                ) : (
                  <span>{author}</span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  <Counter count={item.views} />
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  <Counter count={item.commentCount} />
                </div>
                <div className="flex items-center gap-1">
                  <ArrowUp className="h-3 w-3" />
                  <Counter count={item.karma} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </BouncyClick>
  );
}

export const runtime = "edge";

export default function BrowsePage() {
  return <BrowsePageContent />;
}
