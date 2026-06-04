import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import PageHeader from '../components/ui/PageHeader'
import { SkeletonHeader } from '../components/ui/PageSkeleton'
import { Skeleton } from '@/components/ui/skeleton'
import { useNotes, addNote, updateNote, deleteNote } from '../lib/hooks'
import { useAuth } from '../context/useAuth'
import type { NoteCategory, SiteNote } from '../lib/queries'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
const SECTIONS: { key: NoteCategory; label: string }[] = [
  { key: 'in_progress', label: 'Under Development' },
  { key: 'todo',        label: 'Wishlist'          },
]

function NoteCard({ note, isAdmin, onSaved }: { note: SiteNote; isAdmin: boolean; onSaved: () => void }) {
  const [editing, setEditing]             = useState(false)
  const [content, setContent]             = useState(note.content)
  const [category, setCategory]           = useState<NoteCategory>(note.category)
  const [saving, setSaving]               = useState(false)
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
      <div className="bg-card border border-border rounded-[6px] p-3.5 flex flex-col gap-2">
        <Textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={3}
          className="text-[0.83rem] resize-y"
        />
        <div className="flex gap-2 items-center">
          <select
            value={category}
            onChange={e => setCategory(e.target.value as NoteCategory)}
            className="px-2 py-1 bg-input border border-border rounded text-foreground font-body text-[0.78rem] outline-none"
          >
            {SECTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <Button size="xs" onClick={save} disabled={saving} className="font-body">
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button size="xs" variant="ghost" onClick={() => { setEditing(false); setContent(note.content); setCategory(note.category) }}>
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-secondary border border-border rounded-[5px] p-3 flex justify-between items-start gap-3">
      <p className="m-0 font-body text-[0.85rem] text-secondary-foreground leading-[1.6] whitespace-pre-wrap flex-1">
        {note.content}
      </p>
      {isAdmin && (
        <div className="flex gap-1.5 shrink-0">
          {confirmDelete ? (
            <>
              <Button size="xs" variant="destructive" onClick={remove} className="font-body">Delete</Button>
              <Button size="xs" variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            </>
          ) : (
            <>
              <Button size="xs" variant="outline" onClick={() => setEditing(true)} className="text-violet-400 border-violet-400/30 bg-violet-400/8 hover:bg-violet-400/15">Edit</Button>
              <Button size="xs" variant="ghost" onClick={() => setConfirmDelete(true)} className="text-[var(--text-4)]">×</Button>
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
      <button
        onClick={() => setOpen(true)}
        className="w-full py-2 bg-transparent border border-dashed border-border rounded-[6px] text-[var(--text-4)] font-body text-[0.78rem] cursor-pointer text-left px-3 hover:border-border hover:text-muted-foreground transition-colors"
      >
        + Add note
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        autoFocus
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Note content…"
        rows={3}
        className="text-[0.83rem] resize-y"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} disabled={saving || !content.trim()} className="font-body">
          {saving ? 'Adding…' : 'Add'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setContent('') }}>
          Cancel
        </Button>
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

  if (isLoading) return (
    <div className="page-enter py-8 px-9">
      <SkeletonHeader />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-[6px] p-4 flex flex-col gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="page-enter py-8 px-9">
      <PageHeader title="Under Development" subtitle="What's being built and what's planned" />

      <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {SECTIONS.map(({ key, label }) => {
          const sectionNotes = notes.filter(n => n.category === key)
          return (
            <div key={key} className="bg-card border border-border rounded-[6px] p-4 flex flex-col gap-3">
              <div className="font-display font-bold text-[0.75rem] tracking-[0.1em] uppercase text-[var(--text-4)] border-b border-border pb-2.5">
                {label}
              </div>
              <div className="flex flex-col gap-2">
                {sectionNotes.length === 0 && (
                  <p className="m-0 font-body text-[0.83rem] text-[var(--text-4)] italic">Nothing here yet.</p>
                )}
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
