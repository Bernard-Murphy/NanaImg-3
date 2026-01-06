import React, { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { v4 as uuid } from "uuid";

interface FilePreviewProps {
  file: File;
  className?: string;
  fileId: string;
  filePath: string;
}

export function FilePreview({
  file,
  fileId,
  filePath,
  className,
}: FilePreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPauseButton, setShowPauseButton] = useState(false);
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const fileType = file.type.split("/")[0];
  const fileExtension =
    file.name.split(".").pop()?.toUpperCase().slice(0, 5) || "";

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    const handleEnded = () => {
      setIsPlaying(false);
      media.currentTime = 0;
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    media.addEventListener("ended", handleEnded);
    media.addEventListener("play", handlePlay);
    media.addEventListener("pause", handlePause);

    return () => {
      media.removeEventListener("ended", handleEnded);
      media.removeEventListener("play", handlePlay);
      media.removeEventListener("pause", handlePause);
    };
  }, []);

  const handlePlayPause = () => {
    // const media = mediaRef.current;
    const media = document.getElementById(fileId + "-preview") as
      | HTMLVideoElement
      | HTMLAudioElement;
    console.log("media", media);
    if (!media) return;

    if (isPlaying) {
      media.pause();
    } else {
      media.play();
    }
  };

  const handleMouseEnter = () => {
    if (isPlaying && (fileType === "video" || fileType === "audio")) {
      setShowPauseButton(true);
    }
  };

  const handleMouseLeave = () => {
    setShowPauseButton(false);
  };

  // For images
  if (fileType === "image") {
    return (
      <div
        className={`w-12 h-12 flex-shrink-0 rounded overflow-hidden ${className}`}
      >
        <img
          src={URL.createObjectURL(file)}
          alt={file.name}
          className="w-full h-full object-cover"
          onLoad={(e) => {
            // Clean up the object URL after the image loads
            const img = e.target as HTMLImageElement;
            setTimeout(() => URL.revokeObjectURL(img.src), 1000);
          }}
        />
      </div>
    );
  }

  // For videos
  if (fileType === "video") {
    return (
      <div
        className={`relative w-12 h-12 flex-shrink-0 rounded overflow-hidden bg-black ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <video
          ref={mediaRef as React.RefObject<HTMLVideoElement>}
          src={filePath}
          className="w-full h-full object-cover"
          onLoad={(e) => {
            // Clean up the object URL after the video loads
            const video = e.target as HTMLVideoElement;
            setTimeout(() => URL.revokeObjectURL(video.src), 1000);
          }}
          id={fileId + "-preview"}
        />
        {!isPlaying && (
          <button
            onClick={handlePlayPause}
            className="absolute inset-0 flex items-center justify-center bg-black/50 hover:bg-black/70 transition-colors"
          >
            <Play className="w-4 h-4 text-white fill-white" />
          </button>
        )}
        {showPauseButton && (
          <button
            onClick={handlePlayPause}
            className="absolute inset-0 flex items-center justify-center bg-black/50 hover:bg-black/70 transition-colors"
          >
            <Pause className="w-4 h-4 text-white fill-white" />
          </button>
        )}
      </div>
    );
  }

  // For audio
  if (fileType === "audio") {
    return (
      <div
        className={`w-12 h-12 flex-shrink-0 rounded overflow-hidden bg-muted flex items-center justify-center ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <audio
          ref={mediaRef as React.RefObject<HTMLAudioElement>}
          src={filePath}
          onLoad={(e) => {
            // Clean up the object URL after the audio loads
            const audio = e.target as HTMLAudioElement;
            setTimeout(() => URL.revokeObjectURL(audio.src), 1000);
          }}
          id={fileId + "-preview"}
        />
        <button
          onClick={handlePlayPause}
          className="flex items-center justify-center w-full h-full hover:bg-muted-foreground/20 transition-colors"
        >
          {isPlaying ? (
            showPauseButton ? (
              <Pause className="w-5 h-5 text-muted-foreground" />
            ) : (
              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse" />
            )
          ) : (
            <Play className="w-5 h-5 text-muted-foreground" />
          )}
        </button>
      </div>
    );
  }

  // For other file types
  return (
    <div
      className={`w-12 h-12 flex-shrink-0 rounded bg-muted flex items-center justify-center ${className}`}
    >
      <span className="text-xs font-bold text-muted-foreground">
        {fileExtension}
      </span>
    </div>
  );
}
