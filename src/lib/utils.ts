import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString()
}

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toUpperCase() || 'FILE'
}

export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

export function isVideoFile(mimeType: string): boolean {
  return mimeType.startsWith('video/')
}

export function isAudioFile(mimeType: string): boolean {
  return mimeType.startsWith('audio/')
}

export function canEmbed(mimeType: string): boolean {
  return isImageFile(mimeType) || isVideoFile(mimeType) || isAudioFile(mimeType)
}

