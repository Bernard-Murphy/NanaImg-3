"use client";

import { useState, useEffect } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Copy,
  Edit,
  Save,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, canEmbed } from "@/lib/utils";
import BouncyClick from "@/components/ui/bouncy-click";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AnimatePresence, motion } from "framer-motion";
import {
  normalize,
  fade_out_left,
  fade_out_right,
  transition_fast,
} from "@/lib/transitions";
import Spinner from "@/components/ui/spinner";
import md5 from "md5";
import {
  useFileInput,
  useDragAndDropArea,
  usePaste,
} from "@/hooks/use-file-input";
import { FilePreview } from "@/components/file-preview";
import { Progress } from "@/components/ui/progress";
import { DateTimePicker } from "@/components/ui/date-time-picker";

const TIMELINE_ITEM_QUERY = gql`
  query GetTimelineItem($id: Int!) {
    timelineItem(id: $id) {
      id
      title
      description
      startDate
      endDate
      files {
        id
        name
        fileName
        mimeType
        fileUrl
        thumbnailUrl
        fileSize
      }
      albums {
        id
        name
        files {
          id
          name
          fileName
          mimeType
          fileUrl
          thumbnailUrl
          fileSize
        }
      }
    }
  }
`;

const CREATE_TIMELINE_ITEM_MUTATION = gql`
  mutation CreateTimelineItem(
    $timelineId: Int!
    $title: String
    $description: String
    $startDate: DateTime!
    $endDate: DateTime
    $fileIds: [Int!]
    $albumIds: [Int!]
  ) {
    createTimelineItem(
      timelineId: $timelineId
      title: $title
      description: $description
      startDate: $startDate
      endDate: $endDate
      fileIds: $fileIds
      albumIds: $albumIds
    ) {
      id
    }
  }
`;

const UPDATE_TIMELINE_ITEM_MUTATION = gql`
  mutation UpdateTimelineItem(
    $id: Int!
    $title: String
    $description: String
    $startDate: DateTime
    $endDate: DateTime
    $fileIds: [Int!]
    $albumIds: [Int!]
  ) {
    updateTimelineItem(
      id: $id
      title: $title
      description: $description
      startDate: $startDate
      endDate: $endDate
      fileIds: $fileIds
      albumIds: $albumIds
    ) {
      id
    }
  }
`;

const DELETE_TIMELINE_ITEM_MUTATION = gql`
  mutation DeleteTimelineItem($id: Int!) {
    deleteTimelineItem(id: $id)
  }
`;

const INITIATE_UPLOAD_MUTATION = gql`
  mutation InitiateUpload($files: [FileInput!]!) {
    initiateUpload(files: $files) {
      uploadId
      urls
      key
    }
  }
`;

const COMPLETE_UPLOAD_MUTATION = gql`
  mutation CompleteUpload(
    $uploads: [CompleteUploadInput!]!
    $name: String!
    $manifesto: String
    $unlisted: Boolean
    $anonymous: Boolean
  ) {
    completeUpload(
      uploads: $uploads
      name: $name
      manifesto: $manifesto
      unlisted: $unlisted
      anonymous: $anonymous
    ) {
      file {
        id
      }
      album {
        id
      }
    }
  }
`;

interface TimelineItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timelineId: number;
  item?: any;
  canEdit: boolean;
  onSuccess: () => void;
}

interface FileWithProgress {
  file: File;
  id: string;
  progress: number;
}

export default function TimelineItemDialog({
  open,
  onOpenChange,
  timelineId,
  item,
  canEdit,
  onSuccess,
}: TimelineItemDialogProps) {
  const [isEditMode, setIsEditMode] = useState(!item);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [dialogMotion, setDialogMotion] = useState({ enter: { x: 0 }, exit: { x: 0 } });

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [selectedFileIds, setSelectedFileIds] = useState<number[]>([]);
  const [selectedAlbumIds, setSelectedAlbumIds] = useState<number[]>([]);
  const [newFileIdsInput, setNewFileIdsInput] = useState("");
  const [newAlbumIdsInput, setNewAlbumIdsInput] = useState("");
  const [uploadFiles, setUploadFiles] = useState<FileWithProgress[]>([]);
  const [uploading, setUploading] = useState(false);

  const { data: itemData, loading: itemLoading } = useQuery(TIMELINE_ITEM_QUERY, {
    variables: { id: item?.id },
    skip: !item,
  });

  const [createTimelineItem, { loading: creating }] = useMutation(
    CREATE_TIMELINE_ITEM_MUTATION
  );
  const [updateTimelineItem, { loading: updating }] = useMutation(
    UPDATE_TIMELINE_ITEM_MUTATION
  );
  const [deleteTimelineItem, { loading: deleting }] = useMutation(
    DELETE_TIMELINE_ITEM_MUTATION
  );
  const [initiateUpload] = useMutation(INITIATE_UPLOAD_MUTATION);
  const [completeUpload] = useMutation(COMPLETE_UPLOAD_MUTATION);

  // File upload hooks
  const { selectFiles } = useFileInput();
  const { isDragActive } = useDragAndDropArea(
    (droppedFiles) => {
      const newFiles: FileWithProgress[] = droppedFiles.map((file) => ({
        file,
        id: Math.random().toString(36).substr(2, 9),
        progress: 0,
      }));
      setUploadFiles((prev) => [...prev, ...newFiles]);
    },
    "timeline-item-dropzone"
  );
  const { isPasting } = usePaste((pastedFiles) => {
    const newFiles: FileWithProgress[] = pastedFiles.map((file) => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      progress: 0,
    }));
    setUploadFiles((prev) => [...prev, ...newFiles]);
  });

  // Initialize form when item data loads
  useEffect(() => {
    if (itemData?.timelineItem) {
      const item = itemData.timelineItem;
      setTitle(item.title || "");
      setDescription(item.description || "");
      setStartDate(new Date(item.startDate));
      setEndDate(item.endDate ? new Date(item.endDate) : undefined);
      setSelectedFileIds(item.files.map((f: any) => f.id));
      setSelectedAlbumIds(item.albums.map((a: any) => a.id));
    }
  }, [itemData]);

  const currentItem = itemData?.timelineItem || item;
  const allFiles = currentItem
    ? [
      ...currentItem.files,
      ...currentItem.albums.flatMap((album: any) => album.files),
    ]
    : [];

  const handleSelectFiles = async () => {
    try {
      const selectedFiles = await selectFiles({ multiple: true });
      const newFiles: FileWithProgress[] = selectedFiles.map((file) => ({
        file,
        id: Math.random().toString(36).substr(2, 9),
        progress: 0,
      }));
      setUploadFiles((prev) => [...prev, ...newFiles]);
    } catch (error) {
      console.error("File selection error:", error);
    }
  };

  const uploadFile = async (
    file: FileWithProgress,
    urls: string[],
    key: string,
    uploadId: string
  ) => {
    const chunkSize = 5 * 1024 * 1024;
    const chunks = Math.ceil(file.file.size / chunkSize);
    const parts: Array<{ ETag: string; PartNumber: number }> = [];

    for (let i = 0; i < chunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.file.size);
      const chunk = file.file.slice(start, end);
      const response = await fetch(urls[i], {
        method: "PUT",
        body: chunk,
      });

      const etag = response.headers.get("ETag");
      if (etag) {
        parts.push({ ETag: etag, PartNumber: i + 1 });
      }

      const progress = ((i + 1) / chunks) * 100;
      setUploadFiles((prev) =>
        prev.map((f) => (f.id === file.id ? { ...f, progress } : f))
      );
    }

    return parts;
  };

  const handleSave = async () => {
    if (!startDate) {
      toast.warning("Start date is required");
      return;
    }

    setUploading(true);

    try {
      let uploadedFileIds = [...selectedFileIds];
      let uploadedAlbumIds = [...selectedAlbumIds];

      // Parse new file IDs from input
      if (newFileIdsInput.trim()) {
        const newIds = newFileIdsInput
          .split(",")
          .map((id) => parseInt(id.trim()))
          .filter((id) => !isNaN(id));
        uploadedFileIds.push(...newIds);
      }

      // Parse new album IDs from input
      if (newAlbumIdsInput.trim()) {
        const newIds = newAlbumIdsInput
          .split(",")
          .map((id) => parseInt(id.trim()))
          .filter((id) => !isNaN(id));
        uploadedAlbumIds.push(...newIds);
      }

      // Upload new files if any
      if (uploadFiles.length > 0) {
        const { data: uploadData } = await initiateUpload({
          variables: {
            files: uploadFiles.map((f) => ({
              fileName: f.file.name,
              fileSize: f.file.size,
              mimeType: f.file.type,
            })),
          },
        });

        const uploadUrls = uploadData.initiateUpload;

        // Upload all files
        const uploadPromises = uploadFiles.map(async (file, index) => {
          const uploadInfo = uploadUrls[index];
          const parts = await uploadFile(
            file,
            uploadInfo.urls,
            uploadInfo.key,
            uploadInfo.uploadId
          );
          return {
            key: uploadInfo.key,
            uploadId: uploadInfo.uploadId,
            fileName: file.file.name,
            fileSize: file.file.size,
            mimeType: file.file.type,
            parts,
          };
        });

        const uploads = await Promise.all(uploadPromises);

        // Complete upload
        const { data: completeData } = await completeUpload({
          variables: {
            uploads,
            name: title || "Timeline Item File",
            manifesto: "",
            unlisted: false,
            anonymous: false,
          },
        });

        // Add uploaded file IDs
        if (completeData.completeUpload.file) {
          uploadedFileIds.push(completeData.completeUpload.file.id);
        } else if (completeData.completeUpload.album) {
          uploadedFileIds.push(completeData.completeUpload.album.id);
        }
      }

      if (item) {
        await updateTimelineItem({
          variables: {
            id: item.id,
            title: title || null,
            description,
            startDate: startDate.toISOString(),
            endDate: endDate?.toISOString() || null,
            fileIds: uploadedFileIds,
            albumIds: uploadedAlbumIds,
          },
        });
        toast.success("Timeline item updated!");
      } else {
        await createTimelineItem({
          variables: {
            timelineId,
            title: title || null,
            description,
            startDate: startDate.toISOString(),
            endDate: endDate?.toISOString() || null,
            fileIds: uploadedFileIds,
            albumIds: uploadedAlbumIds,
          },
        });
        toast.success("Timeline item created!");
      }

      onSuccess();
    } catch (error: any) {
      console.error("Save error:", error);
      toast.warning(error.message || "An error occurred");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this timeline item?")) {
      return;
    }

    try {
      await deleteTimelineItem({
        variables: { id: item.id },
      });
      toast.success("Timeline item deleted!");
      onSuccess();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.warning(error.message || "An error occurred");
    }
  };

  const copyLink = (file: any) => {
    navigator.clipboard.writeText(file.fileUrl);
    toast.success("Link copied to clipboard");
  };

  const goToPrevious = () => {
    if (selectedFileIndex > 0) {
      setDialogMotion({
        enter: { x: -100 },
        exit: { x: 100 },
      });
      setTimeout(() => {
        setSelectedFileIndex(selectedFileIndex - 1);
        setDialogMotion({ enter: { x: 0 }, exit: { x: 0 } });
      }, 150);
    }
  };

  const goToNext = () => {
    if (selectedFileIndex < allFiles.length - 1) {
      setDialogMotion({
        enter: { x: 100 },
        exit: { x: -100 },
      });
      setTimeout(() => {
        setSelectedFileIndex(selectedFileIndex + 1);
        setDialogMotion({ enter: { x: 0 }, exit: { x: 0 } });
      }, 150);
    }
  };

  const selectedFile = allFiles[selectedFileIndex];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="[&>button]:hidden max-w-4xl max-h-[90vh] overflow-y-auto">
        {itemLoading ? (
          <div className="flex justify-center p-8">
            <Spinner size="lg" />
          </div>
        ) : isEditMode ? (
          // Edit Mode
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {item ? "Edit Timeline Item" : "Add Timeline Item"}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="(Optional)"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="(Optional - Markdown supported)"
                  rows={4}
                />
              </div>

              <div>
                <Label>Start Date & Time *</Label>
                <DateTimePicker
                  date={startDate}
                  onDateChange={setStartDate}
                  placeholder="Select date"
                  showTime
                />
              </div>

              <div>
                <Label>End Date & Time (Optional)</Label>
                <DateTimePicker
                  date={endDate}
                  onDateChange={setEndDate}
                  placeholder="Select date"
                  showTime
                />
              </div>

              {/* Existing Files/Albums (Edit Mode) */}
              {item && (
                <div>
                  <Label>Associated Files & Albums</Label>
                  <div className="space-y-2 mt-2">
                    {currentItem?.files?.map((file: any) => (
                      <div
                        key={`file-${file.id}`}
                        className="flex items-center gap-3 p-2 border rounded"
                      >
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">
                            File #{file.id}: {file.name || file.fileName}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setSelectedFileIds((prev) =>
                              prev.filter((id) => id !== file.id)
                            )
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {currentItem?.albums?.map((album: any) => (
                      <div
                        key={`album-${album.id}`}
                        className="flex items-center gap-3 p-2 border rounded"
                      >
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">
                            Album #{album.id}: {album.name || "Untitled"} ({album.files.length} files)
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setSelectedAlbumIds((prev) =>
                              prev.filter((id) => id !== album.id)
                            )
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Files/Albums by ID */}
              <div>
                <Label htmlFor="fileIds">Add File IDs (comma-separated)</Label>
                <Input
                  id="fileIds"
                  value={newFileIdsInput}
                  onChange={(e) => setNewFileIdsInput(e.target.value)}
                  placeholder="e.g. 123, 456, 789"
                />
              </div>

              <div>
                <Label htmlFor="albumIds">Add Album IDs (comma-separated)</Label>
                <Input
                  id="albumIds"
                  value={newAlbumIdsInput}
                  onChange={(e) => setNewAlbumIdsInput(e.target.value)}
                  placeholder="e.g. 10, 20, 30"
                />
              </div>

              {/* File upload section */}
              <div>
                <Label>Upload New Files</Label>
                <BouncyClick>
                  <div
                    id="timeline-item-dropzone"
                    onClick={handleSelectFiles}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragActive
                        ? "border-primary bg-primary/10"
                        : "border-muted-foreground/25"
                      }`}
                  >
                    <p className="text-sm text-muted-foreground">
                      {isDragActive
                        ? "Drop files here"
                        : "Click, paste, or drag to add files"}
                    </p>
                  </div>
                </BouncyClick>

                {uploadFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {uploadFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center gap-3 p-2 border rounded"
                      >
                        <FilePreview
                          file={file.file}
                          fileId={file.id}
                          filePath={URL.createObjectURL(file.file)}
                          className="w-10 h-10"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">{file.file.name}</div>
                          {uploading && <Progress value={file.progress} className="mt-1" />}
                        </div>
                        {!uploading && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setUploadFiles((prev) =>
                                prev.filter((f) => f.id !== file.id)
                              )
                            }
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end">
                {item && (
                  <BouncyClick disabled={deleting || uploading}>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={deleting || uploading}
                    >
                      {deleting ? <Spinner size="sm" /> : "Delete"}
                    </Button>
                  </BouncyClick>
                )}
                <BouncyClick disabled={uploading}>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (item) {
                        setIsEditMode(false);
                      } else {
                        onOpenChange(false);
                      }
                    }}
                    disabled={uploading}
                  >
                    Cancel
                  </Button>
                </BouncyClick>
                <BouncyClick disabled={creating || updating || uploading}>
                  <Button
                    onClick={handleSave}
                    disabled={creating || updating || uploading}
                  >
                    {creating || updating || uploading ? (
                      <Spinner size="sm" />
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </>
                    )}
                  </Button>
                </BouncyClick>
              </div>
            </div>
          </div>
        ) : (
          // View Mode
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h2 className="text-xl font-bold">
                  {currentItem?.title || "Untitled"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {formatDate(currentItem?.startDate)}
                  {currentItem?.endDate && ` - ${formatDate(currentItem.endDate)}`}
                </p>
              </div>
              <div className="flex gap-2">
                {canEdit && (
                  <BouncyClick>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditMode(true)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </BouncyClick>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {currentItem?.description && (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {currentItem.description}
                </ReactMarkdown>
              </div>
            )}

            {allFiles.length > 0 && (
              <>
                <div className="flex items-center justify-center gap-2">
                  <BouncyClick disabled={selectedFileIndex <= 0}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPrevious}
                      disabled={selectedFileIndex <= 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </BouncyClick>
                  <p className="text-sm text-muted-foreground">
                    {selectedFileIndex + 1} of {allFiles.length}
                  </p>
                  <BouncyClick disabled={selectedFileIndex >= allFiles.length - 1}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToNext}
                      disabled={selectedFileIndex >= allFiles.length - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </BouncyClick>
                </div>

                <AnimatePresence mode="wait">
                  {selectedFile && (
                    <motion.div
                      key={selectedFile.id}
                      initial={dialogMotion.enter}
                      animate={normalize}
                      exit={dialogMotion.exit}
                      transition={transition_fast}
                      className="space-y-4"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium">
                            {selectedFile.name || "Untitled"}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {selectedFile.fileName}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <BouncyClick>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyLink(selectedFile)}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Link
                            </Button>
                          </BouncyClick>
                          <BouncyClick>
                            <Button asChild size="sm">
                              <a
                                href={selectedFile.fileUrl}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </a>
                            </Button>
                          </BouncyClick>
                        </div>
                      </div>

                      <div className="border rounded-lg overflow-hidden bg-muted">
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
                  )}
                </AnimatePresence>
              </>
            )}

            {allFiles.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No files associated with this timeline item.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

