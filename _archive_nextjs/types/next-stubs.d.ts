// Stub minimal untuk modul Next.js pada kode arsip (tidak dipakai runtime).
// Hanya agar berkas arsip tetap terbaca tanpa error di editor.
declare module 'next/server' {
  export class NextResponse {
    static json(body: unknown, init?: { status?: number }): NextResponse;
    status: number;
  }
}

declare module 'next' {
  export type Metadata = Record<string, unknown>;
}
