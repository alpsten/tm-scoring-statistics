import {
  HEX_TILE_WIDTH,
  HEX_TILE_HEIGHT,
  HEX_STROKE_PATH,
  HEX_OCEAN_FILL_PATH,
  HEX_VOLCANIC_FILL_PATH,
  HEX_BORDER_PATH,
  HEX_BACKGROUND_STROKE_PATH,
} from '../../assets/hexPatternData'
import { HEX_TILE_PLACEMENTS, type HexTileKind } from '../../assets/hexTilePositions'
import { HEX_RESOURCE_PLACEMENTS, type HexResourceKind } from '../../assets/hexResourcePositions'
import tileCity from '../../assets/tiles/tile-city.webp'
import tileOcean from '../../assets/tiles/tile-ocean.webp'
import tileGreenery from '../../assets/tiles/tile-greenery.webp'
import resourceSteel from '../../assets/resources/resource-steel.webp'
import resourceTitanium from '../../assets/resources/resource-titanium.webp'
import resourcePower from '../../assets/resources/resource-power.webp'
import resourceHeat from '../../assets/resources/resource-heat.webp'
import resourcePlant from '../../assets/resources/resource-plant.webp'
import resourceCard from '../../assets/resources/resource-card.webp'

const TILE_HREF: Record<HexTileKind, string> = {
  city: tileCity,
  ocean: tileOcean,
  greenery: tileGreenery,
}

const RESOURCE_HREF: Record<HexResourceKind, string> = {
  steel: resourceSteel,
  titanium: resourceTitanium,
  power: resourcePower,
  heat: resourceHeat,
  plant: resourcePlant,
  card: resourceCard,
}

// Resource icons are square (portrait for 'card'), not hex-shaped, so they're inset
// and centered within each empty hex's bounding box rather than filling it. Base size
// for a hex showing a single icon — hexes showing 2 or 3 (see RESOURCE_LAYOUT below)
// scale this down so the group still fits inside the hex.
const RESOURCE_SIZE: Record<HexResourceKind, { width: number; height: number }> = {
  steel: { width: 16, height: 16 },
  titanium: { width: 16, height: 16 },
  power: { width: 16, height: 16 },
  heat: { width: 16, height: 16 },
  plant: { width: 16, height: 16 },
  card: { width: 12.3, height: 17.6 },
}

// Per-icon scale and center offsets for a hex holding 1, 2, or 3 resources. Two icons
// sit side by side; three form a small apex-up pyramid (one on top, two on the bottom).
const RESOURCE_LAYOUT: Record<number, { scale: number; offsets: { dx: number; dy: number }[] }> = {
  1: { scale: 1, offsets: [{ dx: 0, dy: 0 }] },
  2: { scale: 0.72, offsets: [{ dx: -7, dy: 0 }, { dx: 7, dy: 0 }] },
  3: { scale: 0.6, offsets: [{ dx: 0, dy: -7 }, { dx: -6.5, dy: 6 }, { dx: 6.5, dy: 6 }] },
}

// Static, non-animated hex pattern, tiled via an SVG <pattern> rendered directly in the DOM.
// Lays out the real Tharsis/Hellas/Elysium board layouts from the actual (open-source)
// Terraforming Mars game — see hexPatternData.ts for the data source — as a 2x3 grid of board
// instances, one map per cell chosen so no two adjacent boards (including across the tile's own
// repeat boundary) ever share a map. A plain connecting hex grid (HEX_BACKGROUND_STROKE_PATH —
// no tiles, no resource icons) fills the space between/around the boards, styled identically to
// the boards' own grid lines so it reads as one continuous fabric rather than a separate
// backdrop layer. The SVG covers the page's full height and moves and zooms with the content;
// the pattern needs no JavaScript updates during scrolling or zooming.
//
// Ocean tiles only ever sit on a map's real ocean-eligible spaces (9 of the 12 available per
// board instance — 9 matches the real game's ocean tile supply limit, not the space count).
// City/greenery cover ~40% of each map's real land spaces, city never adjacent to city. Every
// space that doesn't get a tile shows its actual placement-bonus icons from the real map data
// instead of a synthetic/randomized placement. Ocean-eligible spaces get a solid blue hex fill
// and volcanic spaces a solid brown one (matching the real board's own coloring), painted
// before the tile-image layer so an actual tile there draws over it.
//
// position: absolute (not fixed) — fixed positioning combined with a height-watermark hack was
// an earlier mobile-Safari zoom-jump trigger in tm-tournament-tool; this SVG instead scrolls and
// zooms with the page, anchored to a `position: relative; isolation: isolate` #root (see
// index.css) so it still stays behind all page content.
export default function HexBackground() {
  return (
    <svg
      className="hex-background"
      style={{ position: 'absolute', inset: 0, zIndex: -1, pointerEvents: 'none' }}
      width="100%"
      height="100%"
      aria-hidden="true"
    >
      <defs>
        <pattern id="hex-bg" width={HEX_TILE_WIDTH} height={HEX_TILE_HEIGHT} patternUnits="userSpaceOnUse">
          {/* Plain connecting grid + the real boards' own grid, same style — one continuous
              hex fabric, not a separate backdrop layer. */}
          <path d={HEX_BACKGROUND_STROKE_PATH} fill="none" stroke="rgba(208,96,32,0.13)" strokeWidth={1} />
          <path d={HEX_STROKE_PATH} fill="none" stroke="rgba(208,96,32,0.13)" strokeWidth={1} />
          {/* Ocean-eligible / volcanic spaces get a solid color fill, painted before the tile
              images below so an actual tile placed there draws over it. */}
          <g opacity={0.22}>
            <path d={HEX_OCEAN_FILL_PATH} fill="#5b8dd9" stroke="none" />
            <path d={HEX_VOLCANIC_FILL_PATH} fill="#8b5a2b" stroke="none" />
          </g>
          <g opacity={0.16}>
            {HEX_TILE_PLACEMENTS.map((p, i) => (
              <image key={i} href={TILE_HREF[p.tile]} x={p.x} y={p.y} width={p.width} height={p.height} />
            ))}
          </g>
          <g opacity={0.16}>
            {HEX_RESOURCE_PLACEMENTS.map((p, i) => {
              const hexCx = p.x + p.width / 2
              const hexCy = p.y + p.height / 2
              const layout = RESOURCE_LAYOUT[p.resources.length]
              return p.resources.map((resource, j) => {
                const base = RESOURCE_SIZE[resource]
                const width = base.width * layout.scale
                const height = base.height * layout.scale
                const { dx, dy } = layout.offsets[j]
                return (
                  <image
                    key={`${i}-${j}`}
                    href={RESOURCE_HREF[resource]}
                    x={hexCx + dx - width / 2}
                    y={hexCy + dy - height / 2}
                    width={width}
                    height={height}
                  />
                )
              })
            })}
          </g>
          {/* Each board instance's own outer silhouette, stroked heavier than the per-hex grid
              lines so adjacent boards clearly read as separate maps rather than one continuous
              mesh — see hexPatternData.ts's HEX_BORDER_PATH comment for how it's derived. */}
          <path d={HEX_BORDER_PATH} fill="none" stroke="rgba(208,96,32,0.32)" strokeWidth={3} strokeLinejoin="round" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hex-bg)" />
    </svg>
  )
}
