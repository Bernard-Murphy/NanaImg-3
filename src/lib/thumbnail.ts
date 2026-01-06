import sharp from 'sharp'
import Jimp from 'jimp'
import resizeGif from '@gumlet/gif-resize'
import ffmpeg from 'fluent-ffmpeg'
import { uploadFile } from './s3'
import fs from 'fs'
import path from 'path'
import os from 'os'

const TARGET_SIZE = 250

export async function generateThumbnail(
  buffer: Buffer,
  mimeType: string,
  hashedFileName: string
): Promise<string | null> {
  try {
    if (mimeType.startsWith('image/')) {
      return await generateImageThumbnail(buffer, mimeType, hashedFileName)
    } else if (mimeType.startsWith('video/')) {
      return await generateVideoThumbnail(buffer, hashedFileName)
    }
    return null
  } catch (error) {
    console.error('Error generating thumbnail:', error)
    return null
  }
}

async function generateImageThumbnail(
  buffer: Buffer,
  mimeType: string,
  hashedFileName: string
): Promise<string | null> {
  try {
    let thumbnailBuffer: Buffer

    if (mimeType === 'image/gif') {
      // Use gif-resize for GIFs
      const resized = await resizeGif(buffer, {
        width: TARGET_SIZE,
        height: TARGET_SIZE,
        fit: 'cover',
      })
      thumbnailBuffer = Buffer.from(resized)
    } else if (mimeType === 'image/bmp' || mimeType === 'image/x-ms-bmp') {
      // Use Jimp for BMPs
      const image = await Jimp.read(buffer)
      const width = image.getWidth()
      const height = image.getHeight()

      if (width > TARGET_SIZE || height > TARGET_SIZE) {
        image.cover(TARGET_SIZE, TARGET_SIZE)
      }

      thumbnailBuffer = await image.getBufferAsync(Jimp.MIME_PNG)
    } else {
      // Use Sharp for everything else
      const metadata = await sharp(buffer).metadata()
      const width = metadata.width || 0
      const height = metadata.height || 0

      if (width > TARGET_SIZE || height > TARGET_SIZE) {
        thumbnailBuffer = await sharp(buffer)
          .resize(TARGET_SIZE, TARGET_SIZE, {
            fit: 'cover',
            position: 'center',
          })
          .png()
          .toBuffer()
      } else {
        thumbnailBuffer = buffer
      }
    }

    // Upload thumbnail
    const thumbnailKey = `thumbnails/${hashedFileName.replace(/\.[^.]+$/, '.png')}`
    await uploadFile(thumbnailKey, thumbnailBuffer, 'image/png')

    return thumbnailKey
  } catch (error) {
    console.error('Error generating image thumbnail:', error)
    return null
  }
}

async function generateVideoThumbnail(
  buffer: Buffer,
  hashedFileName: string
): Promise<string | null> {
  return new Promise((resolve) => {
    const tempDir = os.tmpdir()
    const tempVideoPath = path.join(tempDir, `video-${Date.now()}.tmp`)
    const tempThumbnailPath = path.join(tempDir, `thumb-${Date.now()}.png`)

    // Write video buffer to temp file
    fs.writeFileSync(tempVideoPath, buffer)

    ffmpeg(tempVideoPath)
      .screenshots({
        timestamps: ['50%'],
        filename: path.basename(tempThumbnailPath),
        folder: path.dirname(tempThumbnailPath),
        size: `${TARGET_SIZE}x${TARGET_SIZE}`,
      })
      .on('end', async () => {
        try {
          const thumbnailBuffer = fs.readFileSync(tempThumbnailPath)
          const thumbnailKey = `thumbnails/${hashedFileName.replace(/\.[^.]+$/, '.png')}`
          await uploadFile(thumbnailKey, thumbnailBuffer, 'image/png')

          // Clean up temp files
          fs.unlinkSync(tempVideoPath)
          fs.unlinkSync(tempThumbnailPath)

          resolve(thumbnailKey)
        } catch (error) {
          console.error('Error uploading video thumbnail:', error)
          fs.unlinkSync(tempVideoPath)
          if (fs.existsSync(tempThumbnailPath)) {
            fs.unlinkSync(tempThumbnailPath)
          }
          resolve(null)
        }
      })
      .on('error', (error) => {
        console.error('Error generating video thumbnail:', error)
        fs.unlinkSync(tempVideoPath)
        if (fs.existsSync(tempThumbnailPath)) {
          fs.unlinkSync(tempThumbnailPath)
        }
        resolve(null)
      })
  })
}

