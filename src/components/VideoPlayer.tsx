import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Loader2,
  Gauge,
  PictureInPicture2
} from 'lucide-react'
import { clsx } from 'clsx'

const RATES = [1, 1.25, 1.5, 2, 0.5]

/** Memformat durasi menjadi mm:ss / hh:mm:ss. */
function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const s = Math.floor(seconds % 60)
  const m = Math.floor((seconds / 60) % 60)
  const h = Math.floor(seconds / 3600)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * VideoPlayer — pemutar video sinematik dengan kontrol kustom (bukan kontrol
 * bawaan browser): tombol play/pause besar, progress bar (played + buffered),
 * volume, kecepatan putar, PiP, fullscreen; kontrol auto-hide saat idle.
 * Sumber video: `file` (File lokal → blob URL) ATAU `src` (URL media langsung,
 * mis. hasil resolusi preview akun/halaman). `poster` = thumbnail pratinjau.
 */
export default function VideoPlayer({
  file,
  src,
  poster
}: {
  file?: File
  src?: string
  poster?: string
}): React.ReactElement {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hideTimer = useRef<number | undefined>(undefined)
  const [url, setUrl] = useState('')
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(1)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [rateOpen, setRateOpen] = useState(false)
  const [rate, setRate] = useState(1)
  const [fullscreenState, setFullscreenState] = useState(false)

  useEffect(() => {
    if (file) {
      const objectUrl = URL.createObjectURL(file)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUrl(objectUrl)
      setError(false)
      return () => URL.revokeObjectURL(objectUrl)
    }
    if (src) {
      setUrl(src)
      setError(false)
      return undefined
    }
    setUrl('')
  }, [file, src])

  // Munculkan kontrol saat interaksi, sembunyikan setelah idle (hanya saat putar).
  const poke = useCallback((): void => {
    setShowControls(true)
    window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setShowControls(false)
    }, 2500)
  }, [])

  const togglePlay = (): void => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      void v.play()
    } else {
      v.pause()
    }
    poke()
  }

  const toggleMute = (): void => {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
  }

  const seek = (clientX: number): void => {
    const v = videoRef.current
    const bar = containerRef.current?.querySelector('[data-seekbar]') as HTMLElement | null
    if (!v || !bar || !isFinite(duration)) return
    const rect = bar.getBoundingClientRect()
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    v.currentTime = pct * duration
    setCurrent(v.currentTime)
  }

  const toggleFullscreen = (): void => {
    const el = containerRef.current
    if (!el) return
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void el.requestFullscreen().catch(() => {})
    }
  }

  const togglePip = async (): Promise<void> => {
    const v = videoRef.current
    if (!v) return
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture().catch(() => {})
    } else {
      await v.requestPictureInPicture().catch(() => {})
    }
  }

  useEffect(() => {
    const onFs = (): void => setFullscreenState(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  if (!url) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-b-2xl bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
        Tidak ada preview video
      </div>
    )
  }

  const pct = duration > 0 ? (current / duration) * 100 : 0
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0
  const pipSupported = typeof document !== 'undefined' && 'pictureInPictureEnabled' in document

  return (
    <div
      ref={containerRef}
      onMouseMove={poke}
      onMouseLeave={() => {
        if (videoRef.current && !videoRef.current.paused) setShowControls(false)
      }}
      className={clsx(
        'group relative w-full overflow-hidden bg-black',
        fullscreenState ? 'h-full' : 'max-h-[70vh] rounded-b-2xl'
      )}
    >
      <video
        ref={videoRef}
        src={url}
        poster={poster}
        autoPlay
        onClick={togglePlay}
        onPlay={() => {
          setPlaying(true)
          poke()
        }}
        onPause={() => {
          setPlaying(false)
          setShowControls(true)
        }}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onProgress={(e) => {
          const v = e.currentTarget
          if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1))
        }}
        onWaiting={() => setLoading(true)}
        onPlaying={() => setLoading(false)}
        onCanPlay={() => setLoading(false)}
        onVolumeChange={(e) => {
          setVolume(e.currentTarget.volume)
          setMuted(e.currentTarget.muted)
        }}
        onError={() => setError(true)}
        className="h-full max-h-[70vh] w-full"
      />

      {/* Gradasi atas & bawah untuk kedalaman */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-linear-to-b from-black/50 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-black/70 to-transparent" />

      {/* Spinner loading */}
      {loading && !error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-white/90" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-white">
          <p className="text-sm font-medium">Gagal memuat video</p>
          <p className="text-xs text-white/60">File mungkin rusak atau tidak didukung.</p>
        </div>
      )}

      {/* Tombol play/pause besar tengah */}
      {showControls && !error && (
        <motion.button
          type="button"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={(e) => {
            e.stopPropagation()
            togglePlay()
          }}
          aria-label={playing ? 'Jeda' : 'Putar'}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/30 backdrop-blur-md transition-transform hover:scale-105 active:scale-95">
            {playing ? <Pause className="h-7 w-7" /> : <Play className="ml-1 h-7 w-7" />}
          </span>
        </motion.button>
      )}

      {/* Bar kontrol bawah */}
      <div
        className={clsx(
          'absolute inset-x-0 bottom-0 px-4 pb-3 pt-10 transition-opacity duration-300',
          showControls ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      >
        {/* Seekbar */}
        <div data-seekbar onClick={(e) => seek(e.clientX)} className="group/bar relative h-4 w-full cursor-pointer">
          <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-white/25">
            <div className="h-full bg-white/40" style={{ width: `${bufferedPct}%` }} />
          </div>
          <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-white/25">
            <div className="h-full bg-linear-to-r from-blue-500 to-blue-400" style={{ width: `${pct}%` }} />
          </div>
          <div
            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-md transition-transform group-hover/bar:scale-125"
            style={{ left: `${pct}%` }}
          />
        </div>

        {/* Kontrol */}
        <div className="mt-1 flex items-center gap-2 text-white">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? 'Jeda' : 'Putar'}
            className="rounded-full p-1.5 transition-colors hover:bg-white/10"
          >
            {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
          </button>

          <span className="text-xs tabular-nums text-white/80">
            {formatTime(current)} <span className="text-white/40">/ {formatTime(duration)}</span>
          </span>

          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? 'Nyalakan suara' : 'Bisukan'}
            className="rounded-full p-1.5 transition-colors hover:bg-white/10"
          >
            {muted || volume === 0 ? (
              <VolumeX className="h-5 w-5" />
            ) : (
              <Volume2 className="h-5 w-5" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            defaultValue={1}
            onChange={(e) => {
              const v = videoRef.current
              if (v) {
                v.volume = Number(e.target.value)
                v.muted = v.volume === 0
                setMuted(v.muted)
              }
            }}
            aria-label="Volume"
            className="h-1 w-16 cursor-pointer accent-blue-500"
          />

          <div className="relative ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => setRateOpen((v) => !v)}
              aria-label="Kecepatan putar"
              className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium transition-colors hover:bg-white/10"
            >
              <Gauge className="h-4 w-4" />
              {rate}×
            </button>
            {rateOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-9 right-0 rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-800"
              >
                {RATES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      if (videoRef.current) videoRef.current.playbackRate = r
                      setRate(r)
                      setRateOpen(false)
                    }}
                    className={clsx(
                      'block w-16 rounded-lg px-3 py-1.5 text-left text-xs transition-colors',
                      r === rate
                        ? 'bg-blue-50 font-semibold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700'
                    )}
                  >
                    {r}×
                  </button>
                ))}
              </motion.div>
            )}
            {pipSupported && (
              <button
                type="button"
                onClick={() => void togglePip()}
                aria-label="Gambar-dalam-gambar"
                className="rounded-full p-1.5 transition-colors hover:bg-white/10"
              >
                <PictureInPicture2 className="h-5 w-5" />
              </button>
            )}
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={fullscreenState ? 'Keluar layar penuh' : 'Layar penuh'}
              className="rounded-full p-1.5 transition-colors hover:bg-white/10"
            >
              {fullscreenState ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

