
import { Note } from '../types'

export default function NoteCard({ note, onEdit }:{ note: Note; onEdit:(n:Note)=>void }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(note.content)
    } catch (e) {
      alert('Copy failed.')
    }
  }
  return (
    <div className="card p-3 flex flex-col gap-2 h-full min-h-[140px] md:min-h-[180px]">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-sm line-clamp-2">{note.title}</h3>
      </div>
      <p className="text-xs text-slate-300 line-clamp-6 md:line-clamp-8 whitespace-pre-wrap flex-1">{note.content || 'No content'}</p>
      <div className="mt-auto pt-2 flex gap-2 justify-end">
        <button 
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" 
          onClick={copy}
          aria-label="Copy note"
          title="Copy note"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
          </svg>
        </button>
        <button 
          className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 transition-colors" 
          onClick={()=>onEdit(note)}
          aria-label="Edit note"
          title="Edit note"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
