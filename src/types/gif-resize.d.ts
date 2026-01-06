declare module '@gumlet/gif-resize' {
  interface ResizeOptions {
    width?: number
    height?: number
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
  }

  function resizeGif(buffer: Buffer, options: ResizeOptions): Promise<Buffer>
  export = resizeGif
}
