"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { gql, useQuery } from "@apollo/client";
import Link from "next/link";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FileText, MessageSquare, ArrowUp, Eye } from "lucide-react";
import { formatDate, getFileExtension } from "@/lib/utils";
import { CopeSection } from "@/components/cope-section";
import { motion, AnimatePresence } from "framer-motion";
import {
  fade_out,
  normalize,
  fade_out_scale_1,
  transition,
  transition_fast,
} from "@/lib/transitions";
import Counter from "@/components/ui/counter";
import BouncyClick from "@/components/ui/bouncy-click";

const USER_QUERY = gql`
  query GetUser($username: String!) {
    user(username: $username) {
      id
      username
      displayName
      timestamp
      avatar
      avatarFile {
        fileUrl
      }
      bio
      banned
      role
      karma
      posts {
        id
        name
        timestamp
        thumbnailUrl
        mimeType
        views
        commentCount
        karma
      }
      albums {
        id
        name
        timestamp
        views
        commentCount
        karma
        files {
          thumbnailUrl
        }
      }
      comments {
        id
        timestamp
        text
        karma
        flavor
        contentId
      }
    }
  }
`;

function UserPageClient() {
  const params = useParams();
  const username = params.username as string;
  const [tab, setTab] = useState("posts");

  const { data, loading } = useQuery(USER_QUERY, {
    variables: { username },
  });

  const user = data?.user;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <Card className="p-8">
            <div className="animate-pulse space-y-4">
              <div className="flex gap-4">
                <div className="h-24 w-24 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-8 bg-muted rounded w-1/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto text-center">
          <Card className="p-8">
            <h1 className="text-2xl font-bold mb-4">User Not Found</h1>
            <p className="text-muted-foreground mb-4">
              This user does not exist.
            </p>
            <Button asChild>
              <Link href="/browse">Browse Files</Link>
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
      <div className="max-w-6xl mx-auto space-y-6">
        {/* User Header */}
        <Card>
          <CardContent className="p-6 relative">
            <div className="text-muted-foreground absolute top-2 left-3 text-sm">
              #{user.id}
            </div>
            <div className="flex gap-6">
              <Avatar className="h-24 w-24">
                {user.avatarFile && (
                  <AvatarImage src={user.avatarFile.fileUrl} />
                )}
                <AvatarFallback className="text-3xl">
                  {user.username[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex gap-2">
                      <h1 className="text-3xl font-bold">{user.displayName}</h1>
                    </div>

                    <p className="text-muted-foreground">@{user.username}</p>
                    {user.banned && (
                      <span className="inline-block mt-2 px-2 py-1 bg-destructive text-destructive-foreground rounded text-xs font-medium">
                        BANNED
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-2xl font-bold">
                      <Counter count={user.karma} />
                    </div>
                    <div className="text-sm text-muted-foreground">Clout</div>
                  </div>
                </div>

                {user.bio && (
                  <p className="mt-4 text-muted-foreground">{user.bio}</p>
                )}

                <div className="flex gap-6 mt-4 text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium text-foreground">
                      {user.posts.length}
                    </span>{" "}
                    Posts
                  </div>
                  <div>
                    <span className="font-medium text-foreground">
                      {user.albums.length}
                    </span>{" "}
                    Albums
                  </div>
                  <div>
                    <span className="font-medium text-foreground">
                      {user.comments.length}
                    </span>{" "}
                    Comments
                  </div>
                  <div>Joined {formatDate(user.timestamp)}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <BouncyClick>
              <TabsTrigger value="posts">Posts</TabsTrigger>
            </BouncyClick>
            <BouncyClick>
              <TabsTrigger value="albums">Albums</TabsTrigger>
            </BouncyClick>
            <BouncyClick>
              <TabsTrigger value="comments">Site Cope</TabsTrigger>
            </BouncyClick>
            <BouncyClick>
              <TabsTrigger value="profile">Profile Cope</TabsTrigger>
            </BouncyClick>
          </TabsList>

          <AnimatePresence mode="wait">
            {tab === "posts" && (
              <motion.div
                key="posts"
                initial={fade_out}
                animate={normalize}
                exit={fade_out_scale_1}
                transition={transition_fast}
                className="space-y-4 my-4"
              >
                {user.posts.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground">No posts yet</p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {user.posts.map((file: any) => (
                      <Link key={file.id} href={`/file/${file.id}`}>
                        <Card className="overflow-hidden hover:border-primary transition-colors">
                          <div className="aspect-square relative bg-muted">
                            {file.thumbnailUrl ? (
                              <Image
                                src={file.thumbnailUrl}
                                alt={file.name || "Untitled"}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full">
                                <div className="text-4xl font-bold text-muted-foreground">
                                  {getFileExtension(file.mimeType)}
                                </div>
                              </div>
                            )}
                          </div>
                          <CardContent className="p-3">
                            <div className="font-medium truncate mb-2">
                              {file.name || "Untitled"}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                <Counter count={file.views} />
                              </div>
                              <div className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                <Counter count={file.commentCount} />
                              </div>
                              <div className="flex items-center gap-1">
                                <ArrowUp className="h-3 w-3" />
                                <Counter count={file.karma} />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
            {tab === "albums" && (
              <motion.div
                key="albums"
                initial={fade_out}
                animate={normalize}
                exit={fade_out_scale_1}
                transition={transition_fast}
                className="space-y-4 my-4"
              >
                {user.albums.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground">No albums yet</p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {user.albums.map((album: any) => (
                      <Link key={album.id} href={`/album/${album.id}`}>
                        <Card className="overflow-hidden hover:border-primary transition-colors">
                          <div className="aspect-square relative bg-muted">
                            {album.files[0]?.thumbnailUrl ? (
                              <Image
                                src={album.files[0].thumbnailUrl}
                                alt={album.name || "Untitled"}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full">
                                <FileText className="h-16 w-16 text-muted-foreground" />
                              </div>
                            )}
                            <div className="absolute top-2 right-2 bg-background/80 px-2 py-1 rounded text-xs font-medium">
                              {album.files.length} files
                            </div>
                          </div>
                          <CardContent className="p-3">
                            <div className="font-medium truncate mb-2">
                              {album.name || "Untitled"}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                <Counter count={album.views} />
                              </div>
                              <div className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                <Counter count={album.commentCount} />
                              </div>
                              <div className="flex items-center gap-1">
                                <ArrowUp className="h-3 w-3" />
                                <Counter count={album.karma} />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
            {tab === "comments" && (
              <motion.div
                key="comments"
                initial={fade_out}
                animate={normalize}
                exit={fade_out_scale_1}
                transition={transition_fast}
                className="space-y-4 my-4"
              >
                {user.comments.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground">No cope yet</p>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {user.comments.map((comment: any) => (
                      <Card key={comment.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="text-sm text-muted-foreground">
                              on{" "}
                              <Link
                                href={`/${comment.flavor}/${comment.contentId}`}
                                className="hover:underline"
                              >
                                {comment.flavor} #{comment.contentId}
                              </Link>{" "}
                              • {formatDate(comment.timestamp)}
                            </div>
                            <div className="text-sm font-medium">
                              <Counter count={comment.karma} /> clout
                            </div>
                          </div>
                          <p className="text-sm line-clamp-2">{comment.text}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
            {tab === "profile" && (
              <motion.div
                key="profile"
                initial={fade_out}
                animate={normalize}
                exit={fade_out_scale_1}
                transition={transition_fast}
                className="space-y-4 my-4"
              >
                <CopeSection flavor="user" contentId={user.id} />
              </motion.div>
            )}
          </AnimatePresence>
        </Tabs>
      </div>
    </motion.div>
  );
}

export const runtime = "edge";

export default function UserPage() {
  return <UserPageClient />;
}
