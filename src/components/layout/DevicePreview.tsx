import { useEffect, useState, type ReactNode } from 'react'
import { useDevicePreviewMode } from '@/lib/useDevicePreviewMode'

interface DevicePreviewProps {
  children: ReactNode
}

// Wraps the app so the Sidebar's Desktop/Mobile toggle can preview the site as it
// renders on a phone (a real 390x844 iframe, so the existing @media (max-width:768px)
// rules trigger correctly) or force the fixed-width desktop layout (useful for checking
// it from an actual phone browser). Doesn't affect the default — normal visitors get
// the responsive layout with neither toggle pressed.
export default function DevicePreview({ children }: DevicePreviewProps) {
  // The preview iframe below loads this same app at the same origin, so without this
  // guard it would read the same localStorage flag and recursively nest itself forever.
  const isInsideFrame = window.self !== window.top

  const { mode } = useDevicePreviewMode()
  const [previewUrl] = useState(() => location.pathname + location.search)

  useEffect(() => {
    if (isInsideFrame) return
    const meta = document.querySelector('meta[name="viewport"]')
    meta?.setAttribute(
      'content',
      mode === 'desktop' ? 'width=1280' : 'width=device-width, initial-scale=1.0'
    )
  }, [mode, isInsideFrame])

  if (isInsideFrame || mode !== 'mobile') return children

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center overflow-auto bg-black py-10">
      <div
        className="overflow-hidden rounded-[36px] border-[10px] border-[#222] shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
        style={{ width: 410, height: 864 }}
      >
        <iframe src={previewUrl} title="Mobile preview" className="h-full w-full border-0" />
      </div>
    </div>
  )
}
