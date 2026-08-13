declare module 'ffbinaries' {
  export function downloadBinaries(
    components: string[],
    options: { destination: string },
    callback: (err: any, data: any) => void
  ): void;
  export function detectPlatform(): string;
  export function getBinaryFilename(component: string, platform: string): string;
}
