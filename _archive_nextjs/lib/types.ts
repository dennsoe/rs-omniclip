export type PresetType = 'quick' | 'standard' | 'archive' | 'whatsapp';
export type FileStatus = 'pending' | 'processing' | 'success' | 'failed';

export interface FileItem {
  id: string; 
  path: string; // Absolute path of the source video
  name: string; // File name (e.g., video.mp4)
  size: number; // File size in bytes
  status: FileStatus;
  progress: number; // 0 to 100
  errorMessage?: string;
  file?: File; // Store actual file reference for frontend mocking
}

export interface ProcessingPayload {
  files: FileItem[];
  preset: PresetType;
}
