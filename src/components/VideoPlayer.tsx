import { useEffect, useState } from 'react'

export default function VideoPlayer({ file }: { file?: File }): React.ReactElement {
  const [url, setUrl] = useState<string>('')

  useEffect(() => {
    if (file) {
      const objectUrl = URL.createObjectURL(file)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUrl(objectUrl)
      return () => URL.revokeObjectURL(objectUrl)
    }
    setUrl('')
  }, [file])

  if (!url) {
    return (
      <div className="text-slate-500 dark:text-slate-400 h-64 flex items-center justify-center bg-slate-50 dark:bg-slate-900 w-full rounded-b-2xl transition-colors">
        Tidak ada preview video
      </div>
    )
  }

  return <video src={url} controls autoPlay className="max-h-[70vh] w-full rounded-b-2xl" />
}
