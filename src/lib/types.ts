export type PresetType = 'metadata' | 'hd' | 'fullhd' | 'uhd' | 'archive' | 'whatsapp'
export type FileStatus = 'pending' | 'processing' | 'success' | 'failed'

export interface FileItem {
  /** Id unik item (dibuat di renderer, dipakai engine untuk mencocokkan progress). */
  id: string
  /** Jalur absolut berkas sumber video. */
  path: string
  /** Nama berkas (mis. video.mp4). */
  name: string
  /** Ukuran berkas dalam byte. */
  size: number
  status: FileStatus
  /** Kemajuan 0 - 100. */
  progress: number
  errorMessage?: string
  /** Referensi objek File asli untuk preview di renderer. */
  file?: File
}

export interface ProcessingPayload {
  files: FileItem[]
  preset: PresetType
}
