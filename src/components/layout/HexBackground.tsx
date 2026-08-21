import { HEX_TILE_WIDTH, HEX_TILE_HEIGHT, HEX_FILL_PATH, HEX_STROKE_PATH } from '../../assets/hexPatternData'

// Static, non-animated hex pattern (~40% of tiles filled, in clusters), tiled
// via an SVG <pattern> rendered directly in the DOM. An earlier canvas-based
// version regenerated a random pattern on every resize — on mobile, the
// address bar showing/hiding fires resize constantly, so the whole
// background reshuffled visibly while scrolling. An inline SVG <pattern> has
// no JS to run on resize, and the browser's vector renderer fills the whole
// surface in one pass, so it stays put across navigation and viewport
// changes alike. (Ported from tm-tournament-tool, which hit and fixed this
// same flicker first.)
export default function HexBackground() {
  return (
    <svg
      className="hex-background"
      style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' }}
      width="100%"
      height="100%"
      aria-hidden="true"
    >
      <defs>
        <pattern id="hex-bg" width={HEX_TILE_WIDTH} height={HEX_TILE_HEIGHT} patternUnits="userSpaceOnUse">
          <path d={HEX_FILL_PATH} fill="rgba(208,96,32,0.09)" />
          <path d={HEX_STROKE_PATH} fill="none" stroke="rgba(208,96,32,0.13)" strokeWidth={1} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hex-bg)" />
    </svg>
  )
}
