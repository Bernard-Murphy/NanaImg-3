"use client";

import { useParams, useRouter } from "next/navigation";
import { gql, useQuery, useMutation } from "@apollo/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Copy,
  Eye,
  MessageSquare,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatFileSize, canEmbed } from "@/lib/utils";
import { CopeSection } from "@/components/cope-section";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import BouncyClick from "@/components/ui/bouncy-click";
import { motion } from "framer-motion";
import {
  fade_out,
  normalize,
  fade_out_scale_1,
  transition,
} from "@/lib/transitions";
import Counter from "@/components/ui/counter";

const FILE_QUERY = gql`
  query GetFile($id: Int!) {
    file(id: $id) {
      id
      name
      manifesto
      timestamp
      removed
      fileName
      fileSize
      mimeType
      fileUrl
      thumbnailUrl
      views
      karma
      userVote
      commentCount
      user {
        id
        username
      }
      anonId
      anonTextColor
      anonTextBackground
      album {
        id
        name
      }
    }
  }
`;

const NEXT_FILE_EXISTS_QUERY = gql`
  query NextFileExists($id: Int!) {
    file(id: $id) {
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

export default function FilePageClient() {
  const params = useParams();
  const router = useRouter();
  const fileId = parseInt(params.id as string);

  const { data, loading, error, refetch } = useQuery(FILE_QUERY, {
    variables: { id: fileId },
  });
  const { data: meData } = useQuery(ME_QUERY);
  const { data: nextFileData } = useQuery(NEXT_FILE_EXISTS_QUERY, {
    variables: { id: fileId + 1 },
    skip: loading, // Don't run until we know the current file exists
  });
  const [vote] = useMutation(VOTE_MUTATION);

  const file = data?.file;

  const handleVote = async (voteValue: number) => {
    if (!meData?.me) {
      toast.warning("You must be logged in to vote.");
      return;
    }

    try {
      await vote({
        variables: {
          flavor: "file",
          contentId: fileId,
          vote: voteValue,
        },
      });
      refetch();
      toast.success("Vote recorded");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const copyLink = (bb?: boolean) => {
    let toCopy = file.fileUrl;
    if (bb) toCopy = `[IMG]${toCopy}[/IMG]`;
    navigator.clipboard.writeText(toCopy);
    toast.success(`${bb ? "BBCode" : "Link"} copied to clipboard`);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <Card className="p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-1/4" />
              <div className="aspect-video bg-muted rounded" />
              <div className="h-4 bg-muted rounded w-3/4" />
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    console.error("File query error:", error);
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto text-center">
          <Card className="p-8">
            <h1 className="text-2xl font-bold mb-4">Error Loading File</h1>
            <p className="text-muted-foreground mb-4">{error.message}</p>
            <Button asChild>
              <Link href="/browse">Browse Files</Link>
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  if (!file || file.removed) {
    console.log("File not found or removed:", { file, fileId });
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto text-center">
          <Card className="p-8">
            <h1 className="text-2xl font-bold mb-4">File Not Found</h1>
            <p className="text-muted-foreground mb-4">
              {file?.removed
                ? "This file has been removed."
                : "This file does not exist."}
            </p>
            <Button asChild>
              <Link href="/browse">Browse Files</Link>
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const author = file.user?.username || "Anon";
  const isAnon = !file.user;

  return (
    <motion.div
      initial={fade_out}
      animate={normalize}
      exit={fade_out_scale_1}
      transition={transition}
      className="container mx-auto px-4 py-8"
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation */}
        <div className="flex justify-between items-center">
          <BouncyClick>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/file/${fileId + 1}`)}
              disabled={!nextFileData?.file}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Next
            </Button>
          </BouncyClick>

          <div className="text-lg font-medium">File #{fileId}</div>
          <BouncyClick>
            <Button
              variant="outline"
              size="sm"
              disabled={fileId <= 1}
              onClick={() => router.push(`/file/${fileId - 1}`)}
            >
              Previous
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </BouncyClick>
        </div>

        {/* File Display */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h1
                  style={{ maxWidth: "50vw" }}
                  className="text-3xl font-bold mb-2 truncate md:whitespace-normal"
                >
                  {file.name || file.fileName}
                </h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div>
                    {isAnon ? (
                      <>
                        {author + " "}
                        <span
                          className="px-2 py-1 rounded text-xs font-medium"
                          style={{
                            color: file.anonTextColor,
                            backgroundColor: file.anonTextBackground,
                          }}
                        >
                          {file.anonId}
                        </span>
                      </>
                    ) : (
                      <Link href={`/u/${author}`} className="hover:underline">
                        {author}
                      </Link>
                    )}
                  </div>
                  <div>{formatDate(file.timestamp)}</div>
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" /> <Counter count={file.views} />
                  </div>
                  {file.album && (
                    <Link
                      href={`/album/${file.album.id}`}
                      className="hover:underline"
                    >
                      Album: {file.album.name}
                    </Link>
                  )}
                </div>
              </div>

              {/* Voting */}
              <div className="flex flex-col items-center gap-2">
                <BouncyClick>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleVote(1)}
                    className={file.userVote === 1 ? "text-primary" : ""}
                  >
                    <ArrowUp className="h-5 w-5" />
                  </Button>
                </BouncyClick>
                <span className="text-xl font-bold">{file.karma}</span>
                <BouncyClick>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleVote(-1)}
                    className={file.userVote === -1 ? "text-primary" : ""}
                  >
                    <ArrowDown className="h-5 w-5" />
                  </Button>
                </BouncyClick>
              </div>
            </div>

            {file.manifesto && (
              <div className="text-muted-foreground prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {file.manifesto}
                </ReactMarkdown>
              </div>
            )}

            {/* File Embed */}
            <div className="border rounded-lg overflow-hidden bg-muted">
              {canEmbed(file.mimeType) ? (
                file.mimeType.startsWith("image/") ? (
                  <img
                    src={file.fileUrl}
                    alt={file.name || "Untitled"}
                    className="w-full h-auto max-h-[600px] object-contain"
                  />
                ) : file.mimeType.startsWith("video/") ? (
                  <video
                    src={file.fileUrl}
                    controls
                    className="w-full h-auto max-h-[600px]"
                  />
                ) : file.mimeType.startsWith("audio/") ? (
                  <div className="p-8">
                    <audio src={file.fileUrl} controls className="w-full" />
                  </div>
                ) : null
              ) : (
                <div className="flex items-center justify-center p-12">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-muted-foreground mb-4">
                      {file.fileName.split(".").pop()?.toUpperCase()}
                    </div>
                    <p className="text-muted-foreground">
                      This file type cannot be displayed in the browser
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* File Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
              <div>
                <div className="text-xs text-muted-foreground">File Name</div>
                <div className="font-medium truncate">{file.fileName}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Size</div>
                <div className="font-medium">
                  {formatFileSize(file.fileSize)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Type</div>
                <div className="font-medium">{file.mimeType}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Cope</div>
                <div className="font-medium">
                  <Counter count={file.commentCount} />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <BouncyClick>
                <Button asChild>
                  <a
                    href={file.fileUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="h-4 w-4 mr-0 md:mr-2" />
                    <span className="hidden md:inline">Download</span>
                  </a>
                </Button>
              </BouncyClick>

              <BouncyClick>
                <Button variant="outline" onClick={() => copyLink()}>
                  <Copy className="h-4 w-4 mr-2" />
                  Link
                </Button>
              </BouncyClick>
              <BouncyClick>
                <Button variant="outline" onClick={() => copyLink(true)}>
                  <Copy className="h-4 w-4 mr-2" />
                  BBCode
                </Button>
              </BouncyClick>
            </div>
          </CardContent>
        </Card>

        {/* Comments */}
        <CopeSection flavor="file" contentId={fileId} />
      </div>
    </motion.div>
  );
}
