import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import PageHeader from '../components/ui/PageHeader'
import { useNotes, addNote, updateNote, deleteNote } from '../lib/hooks'
import { useAuth } from '../context/useAuth'
import type { NoteCategory, SiteNote } from '../lib/queries'

const SECTIONS: { key: NoteCategory; label: string; color: string; bg: string; border: string }[] = [
  { key: 'in_progress', label: 'In Progress', color: '#c9a030', bg: 'rgba(201,160,48,0.08)',  border: 'rgba(201,160,48,0.3)'  },
  { key: 'todo',        label: 'TODO',        color: '#5b8dd9', bg: 'rgba(91,141,217,0.08)',  border: 'rgba(91,141,217,0.3)'  },
  { key: 'done',        label: 'Done',        color: '#4a9e6b', bg: 'rgba(74,158,107,0.08)',  border: 'rgba(74,158,107,0.3)'  },
]

function NoteCard({ note, isAdmin, onSaved }: { note: SiteNote; isAdmin: boolean; onSaved: () => void }) {
  const [editing, setEditing]   = useState(false)
  const [content, setContent]   = useState(note.content)
  const [category, setCategory] = useState<NoteCategory>(note.category)
  const [saving, setSaving]     = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function save() {
    setSaving(true)
    await updateNote(note.id, { content, category })
    onSaved()
    setEditing(false)
    setSaving(false)
  }

  async function remove() {
    await deleteNote(note.id)
    onSaved()
  }

  if (editing) {
    return (
      <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--bd-panel)', borderRadius: '6px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={3}
          style={{ width: '100%', padding: '8px 10px', background: '#171228', border: '1px solid #3e325e', borderRadius: '4px', color: '#ece6ff', fontFamily: 'var(--font-body)', fontSize: '0.83rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select value={category} onChange={e => setCategory(e.target.value as NoteCategory)} style={{ padding: '4px 8px', background: '#171228', border: '1px solid #3e325e', borderRadius: '4px', color: '#ece6ff', fontFamily: 'var(--font-body)', fontSize: '0.78rem' }}>
            {SECTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <button onClick={save} disabled={saving} style={{ padding: '4px 14px', background: '#9b50f0', border: 'none', borderRadius: '4px', color: '#fff', fontFamily: 'var(--font-body)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={() => { setEditing(false); setContent(note.content); setCategory(note.category) }} style={{ padding: '4px 10px', background: 'transparent', border: '1px solid #3e325e', borderRadius: '4px', color: '#625c7c', fontFamily: 'var(--font-body)', fontSize: '0.78rem', cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--bd-panel)', borderRadius: '6px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
      <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--text-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap', flex: 1 }}>{note.content}</p>
      {isAdmin && (
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          {confirmDelete ? (
            <>
              <button onClick={remove} style={{ padding: '3px 10px', background: 'rgba(224,85,53,0.12)', border: '1px solid rgba(224,85,53,0.4)', borderRadius: '3px', color: '#e05535', fontFamily: 'var(--font-body)', fontSize: '0.72rem', cursor: 'pointer' }}>Delete</button>
              <button onClick={() => setConfirmDelete(false)} style={{ padding: '3px 8px', background: 'transparent', border: '1px solid #3e325e', borderRadius: '3px', color: '#625c7c', fontFamily: 'var(--font-body)', fontSize: '0.72rem', cursor: 'pointer' }}>Cancel</button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} style={{ padding: '3px 10px', background: 'rgba(155,80,240,0.08)', border: '1px solid rgba(155,80,240,0.3)', borderRadius: '3px', color: '#b87aff', fontFamily: 'var(--font-body)', fontSize: '0.72rem', cursor: 'pointer' }}>Edit</button>
              <button onClick={() => setConfirmDelete(true)} style={{ padding: '3px 8px', background: 'transparent', border: '1px solid #3e325e', borderRadius: '3px', color: '#625c7c', fontFamily: 'var(--font-body)', fontSize: '0.72rem', cursor: 'pointer' }}>×</button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function AddNoteForm({ category, onSaved }: { category: NoteCategory; onSaved: () => void }) {
  const [open, setOpen]       = useState(false)
  const [content, setContent] = useState('')
  const [saving, setSaving]   = useState(false)

  async function submit() {
    if (!content.trim()) return
    setSaving(true)
    await addNote(category, content.trim())
    setContent('')
    setOpen(false)
    setSaving(false)
    onSaved()
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{ width: '100%', padding: '8px', background: 'transparent', border: '1px dashed #3e325e', borderRadius: '6px', color: '#504270', fontFamily: 'var(--font-body)', fontSize: '0.78rem', cursor: 'pointer', textAlign: 'left' }}>
        + Add note
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <textarea
        autoFocus
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Note content…"
        rows={3}
        style={{ width: '100%', padding: '8px 10px', background: '#171228', border: '1px solid #3e325e', borderRadius: '4px', color: '#ece6ff', fontFamily: 'var(--font-body)', fontSize: '0.83rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
      />
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={submit} disabled={saving || !content.trim()} style={{ padding: '5px 16px', background: '#9b50f0', border: 'none', borderRadius: '4px', color: '#fff', fontFamily: 'var(--font-body)', fontSize: '0.78rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Adding…' : 'Add'}
        </button>
        <button onClick={() => { setOpen(false); setContent('') }} style={{ padding: '5px 10px', background: 'transparent', border: '1px solid #3e325e', borderRadius: '4px', color: '#625c7c', fontFamily: 'var(--font-body)', fontSize: '0.78rem', cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function Notes() {
  const { data: notes = [], isLoading } = useNotes()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const isAdmin = !!user

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['site-notes'] })
  }

  if (isLoading) return <div style={{ padding: '32px 36px', color: 'var(--text-4)', fontFamily: 'var(--font-body)' }}>Loading…</div>

  return (
    <div className="page-enter" style={{ padding: '32px 36px' }}>
      <PageHeader title="Notes" subtitle="Work in progress and TODO list" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
        {SECTIONS.map(({ key, label, color, bg, border }) => {
          const sectionNotes = notes.filter(n => n.category === key)
          return (
            <div key={key}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 14px', background: bg, border: `1px solid ${border}`, borderRadius: '6px', marginBottom: '10px' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', color }}>{label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color, opacity: 0.7 }}>{sectionNotes.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sectionNotes.map(note => (
                  <NoteCard key={note.id} note={note} isAdmin={isAdmin} onSaved={refresh} />
                ))}
                {isAdmin && <AddNoteForm category={key} onSaved={refresh} />}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
