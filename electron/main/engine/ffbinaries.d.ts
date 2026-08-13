// Deklarasi tipe untuk modul ffbinaries (v1.1.x).
// API yang dipakai: detectPlatform, getBinaryFilename, downloadBinaries.

declare module 'ffbinaries' {
  export interface DownloadOptions {
    destination: string
    platform?: string
    quiet?: boolean
    ticker?: boolean
    progress?: (percent: number, component: string) => void
  }

  export function downloadBinaries(
    components: string[],
    options: DownloadOptions,
    callback: (error: Error | null, data?: unknown) => void
  ): void

  export function detectPlatform(): string

  export function getBinaryFilename(component: string, platform: string): string
}
