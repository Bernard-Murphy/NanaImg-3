import sharp from "sharp";
import Jimp from "jimp";
import ffmpeg from "fluent-ffmpeg";
import { uploadFile } from "./s3";
import fs from "fs";
import path from "path";
import os from "os";

const TARGET_SIZE = 250;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function generateThumbnail(
  buffer: Buffer,
  mimeType: string,
  hashedFileName: string
): Promise<string | null> {
  try {
    // Skip thumbnail generation for files over 50MB
    if (buffer.length > MAX_FILE_SIZE) {
      return null;
    }

    if (mimeType.startsWith("image/")) {
      return await generateImageThumbnail(buffer, mimeType, hashedFileName);
    } else if (mimeType.startsWith("video/")) {
      return await generateVideoThumbnail(buffer, hashedFileName);
    }
    return null;
  } catch (error) {
    console.error("Error generating thumbnail:", error);
    return null;
  }
}

async function generateImageThumbnail(
  buffer: Buffer,
  mimeType: string,
  hashedFileName: string
): Promise<string | null> {
  try {
    buffer = Buffer.from(buffer);
    let thumbnailKey: string;
    let thumbnailMimeType: string;
    let thumbnailBuffer: Buffer;

    if (mimeType === "image/gif") {
      // Use Sharp for GIFs - preserve animation
      const metadata = await sharp(buffer, { animated: true }).metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;
      const pageHeight = metadata.pageHeight || height;
      const pages = metadata.pages || 1;

      // Check if it's animated (has multiple pages/frames)
      const isAnimated = pages > 1;

      if (width > TARGET_SIZE || height > TARGET_SIZE) {
        if (isAnimated) {
          // For animated GIFs, resize while preserving animation
          thumbnailBuffer = await sharp(buffer, { animated: true })
            .resize(TARGET_SIZE, TARGET_SIZE, {
              fit: "cover",
              position: "center",
            })
            .gif()
            .toBuffer();
        } else {
          // For static GIFs, convert to PNG for better quality
          thumbnailBuffer = await sharp(buffer)
            .resize(TARGET_SIZE, TARGET_SIZE, {
              fit: "cover",
              position: "center",
            })
            .png()
            .toBuffer();
          thumbnailKey = `thumbnails/${hashedFileName.replace(
            /\.[^.]+$/,
            ".png"
          )}`;
          thumbnailMimeType = "image/png";
          // Skip to upload
          await uploadFile(thumbnailKey, thumbnailBuffer, thumbnailMimeType);
          return thumbnailKey;
        }
      } else {
        thumbnailBuffer = buffer;
      }
      thumbnailKey = `thumbnails/${hashedFileName.replace(/\.[^.]+$/, ".gif")}`;
      thumbnailMimeType = "image/gif";
    } else if (mimeType === "image/bmp" || mimeType === "image/x-ms-bmp") {
      // Use Jimp for BMPs
      const image = await Jimp.read(buffer);
      const width = image.getWidth();
      const height = image.getHeight();

      if (width > TARGET_SIZE || height > TARGET_SIZE) {
        image.cover(TARGET_SIZE, TARGET_SIZE);
      }

      thumbnailBuffer = await image.getBufferAsync(Jimp.MIME_PNG);
      thumbnailKey = `thumbnails/${hashedFileName.replace(/\.[^.]+$/, ".png")}`;
      thumbnailMimeType = "image/png";
    } else if (mimeType === "image/svg+xml") {
      // For SVGs, keep them as-is since they're vector graphics
      thumbnailBuffer = buffer;
      thumbnailKey = `thumbnails/${hashedFileName.replace(/\.[^.]+$/, ".svg")}`;
      thumbnailMimeType = "image/svg+xml";
    } else {
      // Use Sharp for everything else
      const metadata = await sharp(buffer).metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;

      if (width > TARGET_SIZE || height > TARGET_SIZE) {
        thumbnailBuffer = await sharp(buffer)
          .resize(TARGET_SIZE, TARGET_SIZE, {
            fit: "cover",
            position: "center",
          })
          .png()
          .toBuffer();
        thumbnailKey = `thumbnails/${hashedFileName.replace(
          /\.[^.]+$/,
          ".png"
        )}`;
        thumbnailMimeType = "image/png";
      } else {
        thumbnailBuffer = buffer;
        // Handle special mime type extensions
        let extension = mimeType.split("/")[1];
        if (mimeType === "image/svg+xml") {
          extension = "svg";
        }
        thumbnailKey = `thumbnails/${hashedFileName.replace(
          /\.[^.]+$/,
          `.${extension}`
        )}`;
        thumbnailMimeType = mimeType;
      }
    }

    // Upload thumbnail

    await uploadFile(thumbnailKey, thumbnailBuffer, thumbnailMimeType);

    return thumbnailKey;
  } catch (error) {
    console.error("Error generating image thumbnail:", error);
    return null;
  }
}

async function generateVideoThumbnail(
  buffer: Buffer,
  hashedFileName: string
): Promise<string | null> {
  return new Promise((resolve) => {
    const tempDir = os.tmpdir();
    const tempVideoPath = path.join(tempDir, `video-${Date.now()}.tmp`);
    const tempThumbnailPath = path.join(tempDir, `thumb-${Date.now()}.png`);

    // Write video buffer to temp file
    fs.writeFileSync(tempVideoPath, buffer);

    ffmpeg(tempVideoPath)
      .screenshots({
        timestamps: ["50%"],
        filename: path.basename(tempThumbnailPath),
        folder: path.dirname(tempThumbnailPath),
        size: `${TARGET_SIZE}x${TARGET_SIZE}`,
      })
      .on("end", async () => {
        try {
          const thumbnailBuffer = fs.readFileSync(tempThumbnailPath);
          const thumbnailKey = `thumbnails/${hashedFileName.replace(
            /\.[^.]+$/,
            ".png"
          )}`;
          await uploadFile(thumbnailKey, thumbnailBuffer, "image/png");

          // Clean up temp files
          fs.unlinkSync(tempVideoPath);
          fs.unlinkSync(tempThumbnailPath);

          resolve(thumbnailKey);
        } catch (error) {
          console.error("Error uploading video thumbnail:", error);
          fs.unlinkSync(tempVideoPath);
          if (fs.existsSync(tempThumbnailPath)) {
            fs.unlinkSync(tempThumbnailPath);
          }
          resolve(null);
        }
      })
      .on("error", (error) => {
        console.error("Error generating video thumbnail:", error);
        fs.unlinkSync(tempVideoPath);
        if (fs.existsSync(tempThumbnailPath)) {
          fs.unlinkSync(tempThumbnailPath);
        }
        resolve(null);
      });
  });
}
