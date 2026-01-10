"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { gql, useQuery, useMutation } from "@apollo/client";
import Link from "next/link";
import Image from "next/image";
import * as NextImage from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  ArrowUp,
  ArrowDown,
  Download,
  FileText,
  ExternalLink,
  X,
  Film,
  Camera,
  Volume2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, getFileExtension, canEmbed } from "@/lib/utils";
import { CopeSection } from "@/components/cope-section";
import { motion, AnimatePresence } from "framer-motion";
import {
  fade_out,
  normalize,
  fade_out_scale_1,
  transition,
  fade_out_left,
  fade_out_right,
  transition_fast,
} from "@/lib/transitions";
import BouncyClick from "@/components/ui/bouncy-click";
import Counter from "@/components/ui/counter";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const ALBUM_QUERY = gql`
  query GetAlbum($id: Int!) {
    album(id: $id) {
      id
      name
      manifesto
      timestamp
      removed
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
      files {
        id
        name
        fileName
        mimeType
        fileUrl
        thumbnailUrl
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

interface DialogMotion {
  enter: {
    opacity?: number;
    scale?: number;
    x?: number;
    y?: number;
  };
  exit: {
    opacity?: number;
    scale?: number;
    x?: number;
    y?: number;
  };
}

const startingDialogMotion: DialogMotion = {
  enter: {
    opacity: 0,
    scale: 1,
  },
  exit: {
    opacity: 0,
    scale: 1,
  },
};

export default function AlbumPageClient() {
  const params = useParams();
  const albumId = parseInt(params.id as string);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [dialogMotion, setDialogMotion] =
    useState<DialogMotion>(startingDialogMotion);

  const { data, loading, refetch } = useQuery(ALBUM_QUERY, {
    variables: { id: albumId },
  });
  const { data: meData } = useQuery(ME_QUERY);
  const [vote] = useMutation(VOTE_MUTATION);

  const album = data?.album;

  const handleVote = async (voteValue: number) => {
    if (!meData?.me) {
      toast.warning("You must be logged in to vote.");
      return;
    }

    try {
      await vote({
        variables: {
          flavor: "album",
          contentId: albumId,
          vote: album?.userVote === voteValue ? 0 : voteValue,
        },
      });
      refetch();
    } catch (error: any) {
      toast.warning(error.message);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/"))
      return <Camera className="h-12 w-12 text-muted-foreground" />;
    if (mimeType.startsWith("video/"))
      return <Film className="h-12 w-12 text-muted-foreground" />;
    if (mimeType.startsWith("audio/"))
      return <Volume2 className="h-12 w-12 text-muted-foreground" />;
    return <FileText className="h-12 w-12 text-muted-foreground" />;
  };

  const author = album?.user?.username || "Anon";
  const isAnon = !album?.user;

  const getCurrentFileIndex = () => {
    if (!selectedFile || !album?.files) return -1;
    return album.files.findIndex((file: any) => file.id === selectedFile.id);
  };

  const navigateToFile = (index: number) => {
    if (album?.files && index >= 0 && index < album.files.length) {
      setSelectedFile(album.files[index]);
    }
  };

  useEffect(() => {
    if (dialogMotion.enter?.x || 0 < 0)
      navigateToFile(getCurrentFileIndex() - 1);
    if (dialogMotion.enter?.x || 0 > 0)
      navigateToFile(getCurrentFileIndex() + 1);
  }, [JSON.stringify(dialogMotion)]);

  useEffect(() => {
    if (!selectedFile) setDialogMotion(startingDialogMotion);
  }, [selectedFile]);

  const goToPrevious = () => {
    const currentIndex = getCurrentFileIndex();
    if (currentIndex > 0) {
      if ((dialogMotion.enter?.x || 0) < 0) navigateToFile(currentIndex - 1);
      else {
        console.log("else");
        setDialogMotion({
          enter: {
            opacity: 0,
            scale: 1,
            x: -100,
          },
          exit: {
            opacity: 0,
            scale: 1,
            x: 100,
          },
        });
      }
    }
  };

  const goToNext = () => {
    const currentIndex = getCurrentFileIndex();
    if (currentIndex < (album?.files?.length || 0) - 1) {
      if ((dialogMotion.enter?.x || 0) > 0) navigateToFile(currentIndex + 1);
      else
        setDialogMotion({
          enter: {
            opacity: 0,
            scale: 1,
            x: 100,
          },
          exit: {
            opacity: 0,
            scale: 1,
            x: -100,
          },
        });
    }
  };

  const copyLink = (bb?: boolean, all?: boolean) => {
    if (all){
      let toCopy = album.files.filter(file => {
        if (bb) return file.mimeType.startsWith("image/");
        return true;
      }).map((file: any) => {
        if (bb) return `[IMG]${file.fileUrl}[/IMG]`;
        return file.fileUrl;
      }).join("\n");
      navigator.clipboard.writeText(toCopy);
      toast.success(`${bb ? "BBCode" : "Links"} copied to clipboard`);
    } else {
      let toCopy = selectedFile.fileUrl;
    if (bb) toCopy = `[IMG]${toCopy}[/IMG]`;
    navigator.clipboard.writeText(toCopy);
    toast.success(`${bb ? "BBCode" : "Link"} copied to clipboard`);
    }
  };

  return (
    <motion.div
      initial={fade_out}
      animate={normalize}
      exit={fade_out_scale_1}
      transition={transition}
      className="container mx-auto px-4 py-8"
    >
      {loading ? (
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <Card className="p-8">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-muted rounded w-1/4" />
                <div className="grid grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="aspect-square bg-muted rounded" />
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {!album || album.removed ? (
            <motion.div
              initial={fade_out}
              animate={normalize}
              exit={fade_out_scale_1}
              key="not-found"
              transition={transition}
              className="container mx-auto px-4 py-8"
            >
              <div className="max-w-6xl mx-auto text-center">
                <Card className="p-8">
                  <h1 className="text-2xl font-bold mb-4">Album Not Found</h1>
                  <p className="text-muted-foreground mb-4">
                    {album?.removed
                      ? "This album has been removed."
                      : "This album does not exist."}
                  </p>
                  <Button asChild>
                    <Link href="/browse">Browse Albums</Link>
                  </Button>
                </Card>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="exists"
              initial={fade_out}
              animate={normalize}
              exit={fade_out_scale_1}
              transition={transition}
              className="max-w-6xl mx-auto space-y-6"
            >
              {/* Album Header */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h1 className="text-3xl font-bold mb-2">
                        {album.name || "Untitled"}
                      </h1>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div>
                          {isAnon ? (
                            <>
                              {author + " "}
                              <span
                                className="px-2 py-1 rounded text-xs font-medium"
                                style={{
                                  color: album.anonTextColor,
                                  backgroundColor: album.anonTextBackground,
                                }}
                              >
                                {album.anonId}
                              </span>
                            </>
                          ) : (
                            <Link
                              href={`/u/${author}`}
                              className="hover:underline"
                            >
                              {author}
                            </Link>
                          )}
                        </div>
                        <div>{formatDate(album.timestamp)}</div>
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          <Counter count={album.views} />
                        </div>
                      </div>
                    </div>

                    {/* Voting */}
                    <div className="flex flex-col items-center gap-2">
                      <BouncyClick>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleVote(1)}
                          className={album.userVote === 1 ? "text-primary" : ""}
                        >
                          <ArrowUp className="h-5 w-5" />
                        </Button>
                      </BouncyClick>
                      <span className="text-xl font-bold">
                        <Counter count={album.karma} />
                      </span>
                      <BouncyClick>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleVote(-1)}
                          className={
                            album.userVote === -1 ? "text-primary" : ""
                          }
                        >
                          <ArrowDown className="h-5 w-5" />
                        </Button>
                      </BouncyClick>
                    </div>
                  </div>

                  {album.manifesto && (
                    <div className="text-muted-foreground prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {album.manifesto}
                      </ReactMarkdown>
                    </div>
                  )}
                </CardContent>
              </Card>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                Files ({album.files.length})
              </h2>
              <div className="flex items-center justify-between space-x-2">
                <BouncyClick>
                              <Button
                                variant="outline"
                                onClick={() => copyLink(false, true)}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copy Links
                              </Button>
                            </BouncyClick>
                            {Boolean(album.files.find(file => file.mimeType.startsWith("image/"))) && (
                              <BouncyClick>
                                <Button
                                  variant="outline"
                                  onClick={() => copyLink(true, true)}
                                >
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copy BBCodes
                                </Button>
                              </BouncyClick>
                            )}
              </div>
              </div>
              {/* File Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {album.files.map((file: any) => (
                  <BouncyClick key={file.id}>
                    <Card
                      className="overflow-hidden cursor-pointer hover:border-primary transition-colors"
                      onClick={() => setSelectedFile(file)}
                    >
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
                            {getFileIcon(file.mimeType)}
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <div className="text-xs font-medium truncate">
                          {file.name || "Untitled"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {getFileExtension(file.fileName)}
                        </div>
                      </div>
                    </Card>
                  </BouncyClick>
                ))}
              </div>

              {/* Comments */}
              <CopeSection flavor="album" contentId={albumId} />

              {/* File Modal */}
              {selectedFile && (
                <Dialog
                  open={!!selectedFile}
                  onOpenChange={() => setSelectedFile(null)}
                >
                  <DialogContent className="[&>button]:hidden max-w-4xl overflow-x-hidden">
                    <div className="flex items-center justify-center gap-2 w-full">
                      <BouncyClick
                        disabled={getCurrentFileIndex() <= 0}
                        className="mr-2"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToPrevious}
                          disabled={getCurrentFileIndex() <= 0}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                      </BouncyClick>
                      <p className="text-muted-foreground">
                        {getCurrentFileIndex() + 1} of{" "}
                        {album?.files?.length || 0}
                      </p>
                      <BouncyClick
                        disabled={
                          getCurrentFileIndex() >=
                          (album?.files?.length || 0) - 1
                        }
                        className="ml-2"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToNext}
                          disabled={
                            getCurrentFileIndex() >=
                            (album?.files?.length || 0) - 1
                          }
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </BouncyClick>
                    </div>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={selectedFile.id}
                        initial={dialogMotion.enter}
                        animate={normalize}
                        exit={dialogMotion.exit}
                        transition={transition_fast}
                        className="space-y-4 w-full overflow-x-hidden"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between w-100 sm:w-auto">
                          <div className="space-y-1">
                            <h2 className="text-xl font-bold">
                              {selectedFile.name || "Untitled"}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                              {selectedFile.fileName}
                            </p>
                          </div>
                          <div className="flex justify-between gap-2 mt-2 sm:mt-0 w-100 sm:w-auto">
                            <BouncyClick>
                              <Button
                                variant="outline"
                                onClick={() => copyLink()}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Link
                              </Button>
                            </BouncyClick>
                            {selectedFile.mimeType.startsWith("image/") && (
                              <BouncyClick>
                                <Button
                                  variant="outline"
                                  onClick={() => copyLink(true)}
                                >
                                  <Copy className="h-4 w-4 mr-2" />
                                  BBCode
                                </Button>
                              </BouncyClick>
                            )}

                            <BouncyClick>
                              <Button asChild size="sm">
                                <a
                                  href={selectedFile.fileUrl}
                                  download
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Download className="h-4 w-4 mr-0 sm:mr-2" />
                                  <span className="hidden sm:block">Download</span>
                                </a>
                              </Button>
                            </BouncyClick>
                            <BouncyClick>
                              <Button
                                onClick={() => setSelectedFile(null)}
                                variant="ghost"
                                size="sm"
                              >
                                <X className="h-4 w-4  mr-0 sm:mr-2" />
                                <span className="hidden sm:block">Close</span>
                              </Button>
                            </BouncyClick>
                          </div>
                        </div>

                        {/* File Preview */}
                        <div className="border rounded-lg overflow-hidden w-full bg-muted">
                          {canEmbed(selectedFile.mimeType) ? (
                            selectedFile.mimeType.startsWith("image/") ? (
                              <img
                                src={selectedFile.fileUrl}
                                alt={selectedFile.name}
                                className="w-full h-auto max-h-[500px] object-contain"
                              />
                            ) : selectedFile.mimeType.startsWith("video/") ? (
                              <video
                                src={selectedFile.fileUrl}
                                controls
                                className="w-full h-auto max-h-[500px]"
                              />
                            ) : selectedFile.mimeType.startsWith("audio/") ? (
                              <div className="p-8">
                                <audio
                                  src={selectedFile.fileUrl}
                                  controls
                                  className="w-full"
                                />
                              </div>
                            ) : null
                          ) : (
                            <div className="flex items-center justify-center p-12">
                              <div className="text-center">
                                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground">
                                  This file type cannot be previewed
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </DialogContent>
                </Dialog>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
}
