import { useEffect, useState } from 'react'

export type DevicePreviewMode = 'desktop' | 'mobile' | null

const STORAGE_KEY = 'devicePreviewMode'
const CHANGE_EVENT = 'device-preview-mode-change'

function readMode(): DevicePreviewMode {
  const saved = localStorage.getItem(STORAGE_KEY)
  return saved === 'desktop' || saved === 'mobile' ? saved : null
}

// Shared between the Sidebar toggle and the top-level DevicePreview wrapper (which may
// be running inside the preview iframe itself). Two separate hook instances in the same
// window don't see each other's localStorage writes as a 'storage' event — that only
// fires in *other* windows — so a custom event covers the same-window case, and the
// 'storage' event covers the cross-frame case (iframe <-> parent).
export function useDevicePreviewMode() {
  const [mode, setMode] = useState<DevicePreviewMode>(readMode)

  useEffect(() => {
    function sync() { setMode(readMode()) }
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) sync()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener(CHANGE_EVENT, sync)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(CHANGE_EVENT, sync)
    }
  }, [])

  function toggle(next: 'desktop' | 'mobile') {
    const nextMode = mode === next ? null : next
    if (nextMode) localStorage.setItem(STORAGE_KEY, nextMode)
    else localStorage.removeItem(STORAGE_KEY)
    setMode(nextMode)
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }

  return { mode, toggle }
}
