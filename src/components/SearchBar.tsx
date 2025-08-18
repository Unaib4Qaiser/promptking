
import { useState, useEffect } from 'react'

export default function SearchBar({ value, onChange }:{ value:string; onChange:(v:string)=>void }) {
  const [v, setV] = useState(value)
  useEffect(() => setV(value), [value])
  return (
    <div className="px-4 pt-3 pb-2 header">
      <input
        className="input"
        placeholder="Search notes by title..."
        value={v}
        onChange={(e)=>{ setV(e.target.value); onChange(e.target.value) }}
      />
    </div>
  )
}
