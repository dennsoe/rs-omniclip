import { NextResponse } from 'next/server';
import ffbinaries from 'ffbinaries';
import path from 'path';
import fs from 'fs';

export async function GET() {
  try {
    const dest = path.join(process.cwd(), 'bin');
    
    // Ensure destination directory exists
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const platform = ffbinaries.detectPlatform();
    const ffmpegFileName = ffbinaries.getBinaryFilename('ffmpeg', platform);
    const ffprobeFileName = ffbinaries.getBinaryFilename('ffprobe', platform);
    
    const ffmpegPath = path.join(dest, ffmpegFileName);
    const ffprobePath = path.join(dest, ffprobeFileName);

    if (fs.existsSync(ffmpegPath) && fs.existsSync(ffprobePath)) {
      return NextResponse.json({ status: 'ready', message: 'FFmpeg is already installed', path: dest });
    }

    return new Promise<NextResponse>((resolve) => {
      ffbinaries.downloadBinaries(['ffmpeg', 'ffprobe'], { destination: dest }, function (err: any, data: any) {
        if (err) {
          console.error('Failed to download ffbinaries:', err);
          resolve(NextResponse.json({ status: 'error', message: 'Failed to download FFmpeg' }, { status: 500 }));
        } else {
          resolve(NextResponse.json({ status: 'downloaded', message: 'FFmpeg downloaded successfully', path: dest, data }));
        }
      });
    });
  } catch (error) {
    console.error('Init FFmpeg Error:', error);
    return NextResponse.json({ status: 'error', message: 'Internal server error' }, { status: 500 });
  }
}
