declare global {
  interface Window {
    api?: {
      startDownload: (payload: { url: string }) => void;
      onDownloadProgress: (cb: (data: { id: string, url: string, percent: number, status: 'downloading' | 'success' | 'failed' }) => void) => void;
    };
  }
}

export {};
