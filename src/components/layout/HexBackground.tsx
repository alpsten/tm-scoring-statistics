import { useEffect, useRef } from 'react'

const R = 28                        // hex radius (center to vertex)
const COL_W = Math.sqrt(3) * R     // column width  (~48.5px)
const ROW_H = R * 1.5              // row height spacing (42px)

function hexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6  // pointy-top
    const x = cx + R * Math.cos(a)
    const y = cy + R * Math.sin(a)
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.closePath()
}

function render(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const vw = window.innerWidth
  const vh = window.innerHeight
  canvas.width = vw
  canvas.height = vh
  ctx.clearRect(0, 0, vw, vh)

  const cols = Math.ceil(vw / COL_W) + 4
  const rows = Math.ceil(vh / ROW_H) + 4

  // Step 1 — random noise per cell
  const noise: number[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => Math.random())
  )

  // Step 2 — smooth 3× to create organic blobs/clusters
  for (let pass = 0; pass < 3; pass++) {
    const next = noise.map(r => [...r])
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const odd = row % 2 === 1
        const dirs: [number, number][] = odd
          ? [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]]
          : [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]]
        const nbrs = dirs
          .map(([dr, dc]) => [row + dr, col + dc] as [number, number])
          .filter(([r, c]) => r >= 0 && r < rows && c >= 0 && c < cols)
        const sum = noise[row][col] + nbrs.reduce((s, [r, c]) => s + noise[r][c], 0)
        next[row][col] = sum / (1 + nbrs.length)
      }
    }
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        noise[r][c] = next[r][c]
  }

  // Step 3 — draw outlines then fills
  ctx.lineWidth = 1

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const odd = row % 2 === 1
      const cx = (col - 1) * COL_W + (odd ? COL_W / 2 : 0)
      const cy = (row - 1) * ROW_H + R

      hexPath(ctx, cx, cy)
      ctx.strokeStyle = 'rgba(208, 96, 32, 0.13)'
      ctx.stroke()

      if (noise[row][col] > 0.61) {
        hexPath(ctx, cx, cy)
        ctx.fillStyle = 'rgba(208, 96, 32, 0.09)'
        ctx.fill()
      }
    }
  }
}

export default function HexBackground() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    render(canvas)

    let timer: ReturnType<typeof setTimeout>
    const onResize = () => {
      clearTimeout(timer)
      timer = setTimeout(() => render(canvas), 200)
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      clearTimeout(timer)
    }
  }, [])

  return (
    <canvas
      ref={ref}
      style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' }}
    />
  )
}
