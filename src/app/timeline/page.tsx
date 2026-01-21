"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import BouncyClick from "@/components/ui/bouncy-click";
import { motion, AnimatePresence } from "framer-motion";
import {
  fade_out,
  normalize,
  fade_out_scale_1,
  transition,
  transition_fast,
} from "@/lib/transitions";
import Spinner from "@/components/ui/spinner";
import { AuthDialog } from '@/components/auth-dialog';
import { Plus, Edit, Trash2, Calendar, X, Save } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { useFileInput, useDragAndDropArea, usePaste } from "@/hooks/use-file-input";
import { FilePreview } from "@/components/file-preview";
import { Progress } from "@/components/ui/progress";

const TIMELINE_COLORS = [
  '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
  '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#0ea5e9', '#6366f1', '#a855f7', '#d946ef',
  '#f43f5e', '#fb923c', '#fbbf24', '#a3e635', '#4ade80', '#2dd4bf', '#38bdf8', '#818cf8',
  '#c084fc', '#e879f9', '#fb7185', '#dc2626', '#ea580c', '#ca8a04', '#65a30d', '#16a34a',
  '#0d9488', '#0284c7', '#4f46e5', '#9333ea',
];

interface TimelineItemDraftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: TimelineItemDraft | null;
  onSave: (item: any) => void;
}

function TimelineItemDraftDialog({ open, onOpenChange, item, onSave }: TimelineItemDraftDialogProps) {
  const [title, setTitle] = useState(item?.title || "");
  const [description, setDescription] = useState(item?.description || "");
  const [startDate, setStartDate] = useState<Date | undefined>(item?.startDate);
  const [endDate, setEndDate] = useState<Date | undefined>(item?.endDate);
  const [fileIdsInput, setFileIdsInput] = useState("");
  const [albumIdsInput, setAlbumIdsInput] = useState("");
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);

  const { selectFiles } = useFileInput();
  const { isDragActive } = useDragAndDropArea(
    (droppedFiles) => {
      setUploadFiles((prev) => [...prev, ...droppedFiles]);
    },
    "timeline-draft-dropzone"
  );
  const { isPasting } = usePaste((pastedFiles) => {
    setUploadFiles((prev) => [...prev, ...pastedFiles]);
  });

  // Reset form when item changes or dialog opens
  useEffect(() => {
    if (open) {
      setTitle(item?.title || "");
      setDescription(item?.description || "");
      setStartDate(item?.startDate);
      setEndDate(item?.endDate);
      setFileIdsInput(item?.fileIds?.join(", ") || "");
      setAlbumIdsInput(item?.albumIds?.join(", ") || "");
      setUploadFiles(item?.uploadFiles || []);
    }
  }, [open, item]);

  const handleSelectFiles = async () => {
    try {
      const selectedFiles = await selectFiles({ multiple: true });
      setUploadFiles((prev) => [...prev, ...selectedFiles]);
    } catch (error) {
      console.error("File selection error:", error);
    }
  };

  const handleSave = () => {
    if (!startDate) {
      toast.warning("Start date is required");
      return;
    }

    // Parse file IDs
    const fileIds = fileIdsInput
      .split(",")
      .map((id) => parseInt(id.trim()))
      .filter((id) => !isNaN(id));

    // Parse album IDs
    const albumIds = albumIdsInput
      .split(",")
      .map((id) => parseInt(id.trim()))
      .filter((id) => !isNaN(id));

    const color = item?.color || TIMELINE_COLORS[Math.floor(Math.random() * TIMELINE_COLORS.length)];

    onSave({
      title,
      description,
      startDate,
      endDate,
      color,
      fileIds,
      albumIds,
      uploadFiles,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="[&>button]:hidden max-w-2xl">
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
              <Label htmlFor="item-title">Title</Label>
              <Input
                id="item-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="(Optional)"
              />
            </div>

            <div>
              <Label htmlFor="item-description">Description</Label>
              <Textarea
                id="item-description"
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

            <div>
              <Label htmlFor="fileIds">File IDs (comma-separated, optional)</Label>
              <Input
                id="fileIds"
                value={fileIdsInput}
                onChange={(e) => setFileIdsInput(e.target.value)}
                placeholder="e.g. 123, 456, 789"
              />
            </div>

            <div>
              <Label htmlFor="albumIds">Album IDs (comma-separated, optional)</Label>
              <Input
                id="albumIds"
                value={albumIdsInput}
                onChange={(e) => setAlbumIdsInput(e.target.value)}
                placeholder="e.g. 10, 20, 30"
              />
            </div>

            <div>
              <Label>Upload Files (optional)</Label>
              <BouncyClick>
                <div
                  id="timeline-draft-dropzone"
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
                  {uploadFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-2 border rounded"
                    >
                      <FilePreview
                        file={file}
                        fileId={`draft-${index}`}
                        filePath={URL.createObjectURL(file)}
                        className="w-10 h-10"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{file.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setUploadFiles((prev) =>
                            prev.filter((_, i) => i !== index)
                          )
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <BouncyClick>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
              </BouncyClick>
              <BouncyClick>
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </BouncyClick>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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

const CREATE_TIMELINE_ITEM_MUTATION = gql`
  mutation CreateTimelineItem(
    $timelineId: Int!
    $title: String
    $description: String
    $startDate: DateTime!
    $endDate: DateTime
    $color: String
    $fileIds: [Int!]
    $albumIds: [Int!]
  ) {
    createTimelineItem(
      timelineId: $timelineId
      title: $title
      description: $description
      startDate: $startDate
      endDate: $endDate
      color: $color
      fileIds: $fileIds
      albumIds: $albumIds
    ) {
      id
    }
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

interface FileWithProgress {
  file: File;
  id: string;
  progress: number;
}

interface TimelineItemDraft {
  id: string; // Temporary ID for draft items
  title?: string;
  description: string;
  startDate: Date;
  endDate?: Date;
  color: string;
  fileIds: number[];
  albumIds: number[];
  uploadFiles: File[]; // Files to be uploaded
}

function CreateTimelineContent() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [manifesto, setManifesto] = useState("");
  const [unlisted, setUnlisted] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [timelineItems, setTimelineItems] = useState<TimelineItemDraft[]>([]);
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<TimelineItemDraft | null>(null);
  const { data: meData, loading: meLoading, refetch: refetchMe } = useQuery(ME_QUERY);
  const [createTimeline] = useMutation(CREATE_TIMELINE_MUTATION);
  const [createTimelineItem] = useMutation(CREATE_TIMELINE_ITEM_MUTATION);
  const [initiateUpload] = useMutation(INITIATE_UPLOAD_MUTATION);
  const [completeUpload] = useMutation(COMPLETE_UPLOAD_MUTATION);

  const uploadFile = async (
    file: File,
    urls: string[],
    key: string,
    uploadId: string
  ) => {
    const chunkSize = 5 * 1024 * 1024;
    const chunks = Math.ceil(file.size / chunkSize);
    const parts: Array<{ ETag: string; PartNumber: number }> = [];

    for (let i = 0; i < chunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);
      const response = await fetch(urls[i], {
        method: "PUT",
        body: chunk,
      });

      const etag = response.headers.get("ETag");
      if (etag) {
        parts.push({ ETag: etag, PartNumber: i + 1 });
      }
    }

    return parts;
  };

  const handleSubmit = async () => {
    if (!meData?.me) {
      toast.warning("You must be logged in to create a timeline.");
      return;
    }

    setCreating(true);

    try {
      // Create the timeline first
      const { data } = await createTimeline({
        variables: {
          name: name || null,
          manifesto: manifesto || "",
          unlisted,
          anonymous,
        },
      });

      const timelineId = data.createTimeline.id;

      // Create all timeline items with file uploads
      if (timelineItems.length > 0) {
        for (const item of timelineItems) {
          let uploadedFileIds = [...item.fileIds];

          // Upload files for this item if any
          if (item.uploadFiles && item.uploadFiles.length > 0) {
            const { data: uploadData } = await initiateUpload({
              variables: {
                files: item.uploadFiles.map((f) => ({
                  fileName: f.name,
                  fileSize: f.size,
                  mimeType: f.type,
                })),
              },
            });

            const uploadUrls = uploadData.initiateUpload;

            // Upload all files
            const uploadPromises = item.uploadFiles.map(async (file, index) => {
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
                fileName: file.name,
                fileSize: file.size,
                mimeType: file.type,
                parts,
              };
            });

            const uploads = await Promise.all(uploadPromises);

            // Complete upload
            const { data: completeData } = await completeUpload({
              variables: {
                uploads,
                name: item.title || "Timeline Item File",
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

          // Create timeline item with all file IDs
          await createTimelineItem({
            variables: {
              timelineId,
              title: item.title || null,
              description: item.description,
              startDate: item.startDate.toISOString(),
              endDate: item.endDate?.toISOString() || null,
              color: item.color,
              fileIds: uploadedFileIds,
              albumIds: item.albumIds,
            },
          });
        }
      }

      toast.success("Timeline created successfully!");
      router.push(`/timeline/${timelineId}`);
    } catch (error: any) {
      setCreating(false);
      console.error("Create timeline error:", error);
      toast.warning(error.message || "An error occurred while creating timeline.");
    }
  };

  const handleAddItem = (itemData: any) => {
    const newItem: TimelineItemDraft = {
      id: Math.random().toString(36).substr(2, 9),
      title: itemData.title,
      description: itemData.description,
      startDate: itemData.startDate,
      endDate: itemData.endDate,
      color: itemData.color,
      fileIds: itemData.fileIds || [],
      albumIds: itemData.albumIds || [],
      uploadFiles: itemData.uploadFiles || [],
    };
    setTimelineItems([...timelineItems, newItem]);
  };

  const handleEditItem = (itemData: any) => {
    if (editingItem) {
      setTimelineItems(timelineItems.map(item =>
        item.id === editingItem.id
          ? { ...item, ...itemData }
          : item
      ));
    }
  };

  const handleDeleteItem = (itemId: string) => {
    setTimelineItems(timelineItems.filter(item => item.id !== itemId));
  };

  if (meLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center flex justify-center items-center">
          <Spinner size="lg" />
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
      <AnimatePresence mode="wait">
        {!meData?.me ? (
          <motion.div
            initial={fade_out}
            animate={normalize}
            exit={fade_out_scale_1}
            transition={transition_fast}
            key="logged-out" className="container mx-auto px-4 py-8">
            <div className="max-w-2xl mx-auto text-center">
              <Card className="p-8">
                <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
                <p className="text-muted-foreground mb-4">
                  You must be logged in to create a timeline.
                </p>
                <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} onSuccess={() => refetchMe()}>
                  <BouncyClick >
                    <Button onClick={() => setShowAuthDialog(true)}>
                      Login/Register
                    </Button>
                  </BouncyClick>
                </AuthDialog>
              </Card>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={fade_out}
            animate={normalize}
            exit={fade_out_scale_1}
            transition={transition_fast}
            key="logged-in" className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold text-center">Timeline</h1>
            <p className="text-center text-muted-foreground">
              Create timelines and timeline items with dates and times, and add files to associate with them.
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
            </Card>

            {/* Timeline Items Section */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Timeline Items</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add items to your timeline (optional - you can add them later)
                  </p>
                </div>
                <BouncyClick>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingItem(null);
                      setShowAddItemDialog(true);
                    }}
                    disabled={creating}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </BouncyClick>
              </div>

              {timelineItems.length > 0 ? (
                <div className="space-y-2">
                  {timelineItems.map((item) => (
                    <Card key={item.id} className="overflow-hidden">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {item.title || "Untitled"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {item.startDate.toLocaleDateString()}
                              {item.endDate && ` - ${item.endDate.toLocaleDateString()}`}
                            </div>
                            {(item.fileIds.length > 0 || item.albumIds.length > 0 || item.uploadFiles.length > 0) && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {item.fileIds.length + item.albumIds.length + item.uploadFiles.length} file(s)
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <BouncyClick>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  setEditingItem(item);
                                  setShowAddItemDialog(true);
                                }}
                                disabled={creating}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </BouncyClick>
                            <BouncyClick>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => handleDeleteItem(item.id)}
                                disabled={creating}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </BouncyClick>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No timeline items yet</p>
                </div>
              )}
            </Card>

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

            <p className="text-xs text-muted-foreground text-center">
              You can also add timeline items after creating the timeline.
            </p>

            {/* Timeline Item Draft Dialog */}
            <TimelineItemDraftDialog
              open={showAddItemDialog}
              onOpenChange={(open) => {
                if (!open) {
                  setShowAddItemDialog(false);
                  setEditingItem(null);
                }
              }}
              item={editingItem}
              onSave={(itemData) => {
                if (editingItem) {
                  handleEditItem(itemData);
                } else {
                  handleAddItem(itemData);
                }
                setShowAddItemDialog(false);
                setEditingItem(null);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}

export const runtime = "edge";

export default function CreateTimelinePage() {
  return <CreateTimelineContent />;
}
