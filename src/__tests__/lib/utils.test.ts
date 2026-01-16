import {
  cn,
  formatFileSize,
  formatDate,
  getFileExtension,
  isImageFile,
  isVideoFile,
  isAudioFile,
  canEmbed,
} from '@/lib/utils'

describe('cn (className utility)', () => {
  it('merges class names correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
    expect(cn('foo', true && 'bar', 'baz')).toBe('foo bar baz')
  })

  it('handles undefined and null values', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar')
  })

  it('merges tailwind classes correctly', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('handles arrays of classes', () => {
    expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz')
  })

  it('handles objects for conditional classes', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz')
  })
})

describe('formatFileSize', () => {
  it('formats 0 bytes', () => {
    expect(formatFileSize(0)).toBe('0 Bytes')
  })

  it('formats bytes correctly', () => {
    expect(formatFileSize(500)).toBe('500 Bytes')
  })

  it('formats kilobytes correctly', () => {
    expect(formatFileSize(1024)).toBe('1 KB')
    expect(formatFileSize(1536)).toBe('1.5 KB')
  })

  it('formats megabytes correctly', () => {
    expect(formatFileSize(1048576)).toBe('1 MB')
    expect(formatFileSize(1572864)).toBe('1.5 MB')
  })

  it('formats gigabytes correctly', () => {
    expect(formatFileSize(1073741824)).toBe('1 GB')
  })

  it('formats terabytes correctly', () => {
    expect(formatFileSize(1099511627776)).toBe('1 TB')
  })
})

describe('formatDate', () => {
  it('formats Date objects', () => {
    const date = new Date('2024-01-15T10:30:00')
    const result = formatDate(date)
    expect(result).toContain('2024')
    expect(result).toContain('10:30')
  })

  it('formats date strings', () => {
    const result = formatDate('2024-06-20T14:45:00')
    expect(result).toContain('2024')
  })

  it('handles ISO date strings', () => {
    const result = formatDate('2024-12-25T00:00:00.000Z')
    expect(result).toContain('2024')
  })
})

describe('getFileExtension', () => {
  it('returns extension in uppercase', () => {
    expect(getFileExtension('document.pdf')).toBe('PDF')
    expect(getFileExtension('image.png')).toBe('PNG')
    expect(getFileExtension('video.mp4')).toBe('MP4')
  })

  it('handles multiple dots in filename', () => {
    expect(getFileExtension('my.file.name.txt')).toBe('TXT')
  })

  it('returns the filename uppercased for files without extension', () => {
    // When there's no dot, the whole filename becomes the "extension"
    expect(getFileExtension('noextension')).toBe('NOEXTENSION')
  })

  it('handles empty extension', () => {
    // When filename ends with dot, pop() returns empty string which is falsy
    expect(getFileExtension('file.')).toBe('FILE')
  })
})

describe('isImageFile', () => {
  it('returns true for image mime types', () => {
    expect(isImageFile('image/png')).toBe(true)
    expect(isImageFile('image/jpeg')).toBe(true)
    expect(isImageFile('image/gif')).toBe(true)
    expect(isImageFile('image/webp')).toBe(true)
    expect(isImageFile('image/svg+xml')).toBe(true)
  })

  it('returns false for non-image mime types', () => {
    expect(isImageFile('video/mp4')).toBe(false)
    expect(isImageFile('audio/mpeg')).toBe(false)
    expect(isImageFile('application/pdf')).toBe(false)
    expect(isImageFile('text/plain')).toBe(false)
  })
})

describe('isVideoFile', () => {
  it('returns true for video mime types', () => {
    expect(isVideoFile('video/mp4')).toBe(true)
    expect(isVideoFile('video/webm')).toBe(true)
    expect(isVideoFile('video/quicktime')).toBe(true)
  })

  it('returns false for non-video mime types', () => {
    expect(isVideoFile('image/png')).toBe(false)
    expect(isVideoFile('audio/mpeg')).toBe(false)
    expect(isVideoFile('application/pdf')).toBe(false)
  })
})

describe('isAudioFile', () => {
  it('returns true for audio mime types', () => {
    expect(isAudioFile('audio/mpeg')).toBe(true)
    expect(isAudioFile('audio/wav')).toBe(true)
    expect(isAudioFile('audio/ogg')).toBe(true)
  })

  it('returns false for non-audio mime types', () => {
    expect(isAudioFile('image/png')).toBe(false)
    expect(isAudioFile('video/mp4')).toBe(false)
    expect(isAudioFile('application/pdf')).toBe(false)
  })
})

describe('canEmbed', () => {
  it('returns true for embeddable file types', () => {
    expect(canEmbed('image/png')).toBe(true)
    expect(canEmbed('image/jpeg')).toBe(true)
    expect(canEmbed('video/mp4')).toBe(true)
    expect(canEmbed('audio/mpeg')).toBe(true)
  })

  it('returns false for non-embeddable file types', () => {
    expect(canEmbed('application/pdf')).toBe(false)
    expect(canEmbed('text/plain')).toBe(false)
    expect(canEmbed('application/zip')).toBe(false)
  })
})

