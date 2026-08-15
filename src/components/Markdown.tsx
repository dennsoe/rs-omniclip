import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Render teks Markdown (catatan rilis / changelog) dengan gaya konsisten aplikasi.
 * Memakai react-markdown + remark-gfm agar render KETAT & AKURAT: heading,
 * list berurutan/tidak, bold/italic, kode inline & blok, link, kutipan, tabel,
 * task list, dsb. Semua class Tailwind mengikuti tema (light/dark).
 */
const mdComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mt-3 mb-1.5 text-sm font-bold text-slate-800 first:mt-0 dark:text-slate-100">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-3 mb-1.5 text-[13px] font-bold text-slate-800 first:mt-0 dark:text-slate-100">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-2.5 mb-1 text-xs font-bold text-slate-700 first:mt-0 dark:text-slate-200">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-2 mb-1 text-xs font-semibold text-slate-700 first:mt-0 dark:text-slate-200">{children}</h4>
  ),
  h5: ({ children }) => (
    <h5 className="mt-2 mb-1 text-xs font-semibold text-slate-600 first:mt-0 dark:text-slate-300">{children}</h5>
  ),
  h6: ({ children }) => (
    <h6 className="mt-2 mb-1 text-xs font-semibold text-slate-600 first:mt-0 dark:text-slate-300">{children}</h6>
  ),
  p: ({ children }) => (
    <p className="my-1.5 text-xs leading-relaxed text-slate-600 first:mt-0 last:mb-0 dark:text-slate-300">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="my-1.5 list-disc space-y-1 pl-4 text-xs text-slate-600 dark:text-slate-300">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-1.5 list-decimal space-y-1 pl-4 text-xs text-slate-600 dark:text-slate-300">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-slate-800 dark:text-slate-100">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  del: ({ children }) => <del className="line-through opacity-70">{children}</del>,
  blockquote: ({ children }) => (
    <blockquote className="my-1.5 border-l-2 border-blue-500/40 pl-3 text-xs italic text-slate-500 dark:text-slate-400">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
    >
      {children}
    </a>
  ),
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-lg border border-slate-200 bg-slate-100 p-2.5 text-[11px] leading-relaxed text-slate-700 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-200">
      {children}
    </pre>
  ),
  code: ({ children }) => (
    <code className="font-mono text-[11px] text-slate-700 dark:text-slate-200">{children}</code>
  ),
  hr: () => <hr className="my-2.5 border-t border-slate-200 dark:border-slate-700/60" />,
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700/60">
      <table className="w-full text-left text-[11px] text-slate-600 dark:text-slate-300">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50">
      {children}
    </thead>
  ),
  th: ({ children }) => (
    <th className="px-2.5 py-1.5 font-semibold text-slate-700 dark:text-slate-200">{children}</th>
  ),
  td: ({ children }) => <td className="px-2.5 py-1.5 align-top">{children}</td>,
  tr: ({ children }) => (
    <tr className="border-b border-slate-100 last:border-0 dark:border-slate-700/50">{children}</tr>
  ),
  input: ({ checked, disabled }) => (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      readOnly
      className="mr-1.5 h-3.5 w-3.5 shrink-0 align-middle accent-blue-600"
    />
  )
}

export default function Markdown({ children }: { children: string }): React.ReactElement {
  return (
    <div className="text-xs">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
