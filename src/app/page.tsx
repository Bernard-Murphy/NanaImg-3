"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { gql, useQuery, useMutation, useSubscription } from "@apollo/client";
import {
  useFileInput,
  useDragAndDropArea,
  usePaste,
} from "@/hooks/use-file-input";
import { Upload, X, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import md5 from "md5";
import { useDragAndDrop } from "@/hooks/use-drag-and-drop";
import { DragDropContainer, DraggableItem } from "@/components/drag-and-drop";
import { FilePreview } from "@/components/file-preview";
import BouncyClick from "@/components/ui/bouncy-click";

// const FILE_COUNT_QUERY = gql`
//   query TotalFileCount {
//     totalFileCount
//   }
// `;

// const FILE_COUNT_SUBSCRIPTION = gql`
//   subscription FileCountUpdated {
//     fileCountUpdated
//   }
// `;

const ME_QUERY = gql`
  query Me {
    me {
      id
    }
  }
`;

const INITIATE_UPLOAD_MUTATION = gql`
  mutation InitiateUpload($files: [FileInput!]!, $recaptchaToken: String) {
    initiateUpload(files: $files, recaptchaToken: $recaptchaToken) {
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
    $disableComments: Boolean
    $unlisted: Boolean
    $anonymous: Boolean
  ) {
    completeUpload(
      uploads: $uploads
      name: $name
      manifesto: $manifesto
      disableComments: $disableComments
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
  uploadId?: string;
  key?: string;
}

function UploadPageContent() {
  const router = useRouter();
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [name, setName] = useState("");
  const [manifesto, setManifesto] = useState("");
  const [disableComments, setDisableComments] = useState(false);
  const [unlisted, setUnlisted] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [uploading, setUploading] = useState(false);

  // const { data: countData } = useQuery(FILE_COUNT_QUERY);
  // const { data: subscriptionData } = useSubscription(FILE_COUNT_SUBSCRIPTION);
  const { data: meData } = useQuery(ME_QUERY);
  const [initiateUpload] = useMutation(INITIATE_UPLOAD_MUTATION);
  const [completeUpload] = useMutation(COMPLETE_UPLOAD_MUTATION);

  // Custom file input hooks
  const {
    selectFiles,
    isSelecting: isFileSelecting,
    setIsSelecting: setIsFileSelecting,
  } = useFileInput();
  const { isDragActive } = useDragAndDropArea(
    (droppedFiles) => {
      const newFiles: FileWithProgress[] = droppedFiles.map((file) => ({
        file,
        id: Math.random().toString(36).substr(2, 9),
        progress: 0,
      }));
      setFiles((prev) => [...prev, ...newFiles]);
    },
    files.length === 0 ? "upload-dropzone" : "upload-dropzone-files"
  );
  const { isPasting } = usePaste((pastedFiles) => {
    const newFiles: FileWithProgress[] = pastedFiles.map((file) => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  });

  // const totalFileCount =
  //   subscriptionData?.fileCountUpdated ?? countData?.totalFileCount ?? 0;

  const handleSelectFiles = useCallback(async () => {
    // console.log("handleSelectFiles", isFileSelecting);
    // if (isFileSelecting) return;

    try {
      const selectedFiles = await selectFiles({ multiple: true });
      const newFiles: FileWithProgress[] = selectedFiles.map((file) => ({
        file,
        id: Math.random().toString(36).substr(2, 9),
        progress: 0,
      }));
      setFiles((prev) => [...prev, ...newFiles]);
    } catch (error) {
      console.error("File selection error:", error);
    }
  }, [selectFiles, isFileSelecting]);

  const handleSelectFolder = useCallback(async () => {
    // if (isFileSelecting) return;

    try {
      const selectedFiles = await selectFiles({
        multiple: true,
        directory: true,
      });
      const newFiles: FileWithProgress[] = selectedFiles.map((file) => ({
        file,
        id: Math.random().toString(36).substr(2, 9),
        progress: 0,
      }));
      setFiles((prev) => [...prev, ...newFiles]);
    } catch (error) {
      console.error("Folder selection error:", error);
    }
  }, [selectFiles, isFileSelecting]);

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const {
    draggedItem,
    draggedOverIndex,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDrop,
    isDragging,
  } = useDragAndDrop(files, setFiles);

  const uploadFile = async (
    file: FileWithProgress,
    urls: string[],
    key: string,
    uploadId: string
  ) => {
    const chunkSize = 5 * 1024 * 1024; // 5MB
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
      setFiles((prev) =>
        prev.map((f) => (f.id === file.id ? { ...f, progress } : f))
      );
    }

    return parts;
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      toast.warning("Please select at least one file to upload.");
      return;
    }

    setUploading(true);

    try {
      // Get reCAPTCHA token if available
      let recaptchaToken = "";
      if (typeof window !== "undefined" && (window as any).grecaptcha) {
        try {
          recaptchaToken = await (window as any).grecaptcha.execute(
            process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
            { action: "upload" }
          );
        } catch (e) {
          console.error("reCAPTCHA error:", e);
        }
      }
      console.log("recaptchaToken", recaptchaToken, (window as any).grecaptcha);
      // Initiate uploads (reCAPTCHA validation happens here)
      const { data } = await initiateUpload({
        variables: {
          files: files.map((f) => ({
            name,
            fileName: f.file.name,
            fileSize: f.file.size,
            mimeType: f.file.type,
          })),
          recaptchaToken,
        },
      });

      const uploadUrls = data.initiateUpload;

      // Upload all files
      const uploadPromises = files.map(async (file, index) => {
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
          name,
          parts,
        };
      });

      const uploads = await Promise.all(uploadPromises);

      // Complete upload
      const { data: completeData } = await completeUpload({
        variables: {
          uploads,
          name,
          manifesto: manifesto || "",
          disableComments,
          unlisted,
          anonymous: meData?.me ? anonymous : true,
        },
      });

      // Redirect to file or album page
      if (completeData.completeUpload.album) {
        router.push(`/album/${completeData.completeUpload.album.id}`);
      } else if (completeData.completeUpload.file) {
        router.push(`/file/${completeData.completeUpload.file.id}`);
      }

      toast.success("Files uploaded successfully!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.warning(error.message || "An error occurred during upload.");
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    // Load reCAPTCHA if site key is available
    if (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
      const script = document.createElement("script");
      script.src = `https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`;
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (files.length > 0) {
      setIsFileSelecting(false);
    }
  }, [files.length, setIsFileSelecting]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* <div className="absolute bottom-20 right-4 bg-card p-4 rounded-lg border">
        <div className="text-2xl font-bold text-center">
          {totalFileCount.toLocaleString()}
        </div>
        <div className="text-sm text-muted-foreground">Files Uploaded</div>
      </div> */}

      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Upload</h1>
          <div className="flex gap-2">
            <BouncyClick>
              <Button
                variant="outline"
                onClick={handleSelectFolder}
                // disabled={isFileSelecting}
              >
                <Upload className="h-4 w-4 mr-2" />
                Select Folder
              </Button>
            </BouncyClick>
          </div>
        </div>

        {files.length === 0 ? (
          <BouncyClick>
            <div
              id="upload-dropzone"
              onClick={handleSelectFiles}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? "border-primary bg-primary/10"
                  : "border-muted-foreground/25"
              }`}
            >
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">
                {isDragActive
                  ? "Drop files here"
                  : "Drag and drop, paste, or click to add files or folders"}
              </p>
              <p className="text-sm text-muted-foreground">
                Max file size: 1.5GB
              </p>
            </div>
          </BouncyClick>
        ) : (
          <>
            <DragDropContainer>
              {files.map((file, index) => (
                <DraggableItem
                  key={file.id}
                  id={file.id}
                  index={index}
                  isDragging={isDragging && draggedItem?.id === file.id}
                  isDraggedOver={draggedOverIndex === index}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  onDrop={handleDrop}
                  className="p-4 border rounded-lg bg-card"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <FilePreview
                      file={file.file}
                      fileId={file.id}
                      filePath={URL.createObjectURL(file.file)}
                      className="w-12 h-12"
                    />
                    <div className="flex-1 min-w-0 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {file.file.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {(file.file.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                        {uploading && (
                          <Progress value={file.progress} className="mt-2" />
                        )}
                      </div>
                      {!uploading && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFile(file.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </DraggableItem>
              ))}
            </DragDropContainer>

            <BouncyClick>
              <div
                id="upload-dropzone-files"
                onClick={handleSelectFiles}
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer"
              >
                <p className="text-sm text-muted-foreground">
                  Click, paste, or drag to add more files
                </p>
              </div>
            </BouncyClick>

            <BouncyClick>
              <Button
                onClick={handleSubmit}
                disabled={uploading}
                className="w-full"
                size="lg"
              >
                {uploading
                  ? "Uploading..."
                  : `Upload ${files.length} file${files.length > 1 ? "s" : ""}`}
              </Button>
            </BouncyClick>
          </>
        )}

        <Card className="p-6 space-y-4">
          <div>
            <Label htmlFor="name">Title</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="(Optional)"
              disabled={uploading}
            />
          </div>

          <div>
            <Label htmlFor="manifesto">Manifesto</Label>
            <Textarea
              id="manifesto"
              value={manifesto}
              onChange={(e) => setManifesto(e.target.value)}
              placeholder="(Optional)"
              disabled={uploading}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="disableComments"
                checked={disableComments}
                onCheckedChange={(checked) =>
                  setDisableComments(checked as boolean)
                }
                disabled={uploading}
              />
              <Label htmlFor="disableComments">Disable comments</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="unlisted"
                checked={unlisted}
                onCheckedChange={(checked) => setUnlisted(checked as boolean)}
                disabled={uploading}
              />
              <Label htmlFor="unlisted">Keep unlisted</Label>
            </div>

            {meData?.me && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="anonymous"
                  checked={anonymous}
                  onCheckedChange={(checked) =>
                    setAnonymous(checked as boolean)
                  }
                  disabled={uploading}
                />
                <Label htmlFor="anonymous">Post anonymously</Label>
              </div>
            )}
          </div>
        </Card>

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
    </div>
  );
}

export const runtime = "edge";

export default function UploadPage() {
  return <UploadPageContent />;
}
