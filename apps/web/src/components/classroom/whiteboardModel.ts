/**
 * Whiteboard data model + pure canvas helpers. The board's internal drawing
 * surface is a fixed logical size (WB_WIDTH x WB_HEIGHT) regardless of any
 * one client's actual window size -- every participant's canvas is CSS-scaled
 * to fit its panel, but stroke coordinates are always in this same logical
 * space, so a point recorded on one screen lands in the same place on every
 * other screen without per-viewport normalization math.
 */

export const WB_WIDTH = 1280;
export const WB_HEIGHT = 720;

export type WhiteboardTool = 'pen' | 'highlighter' | 'eraser' | 'line' | 'rect' | 'ellipse' | 'text';

export interface WhiteboardPoint {
  x: number;
  y: number;
}

export interface WhiteboardStroke {
  id: string;
  tool: Exclude<WhiteboardTool, 'eraser'>;
  color: string;
  /** Line width in logical px (see WB_WIDTH/WB_HEIGHT). */
  width: number;
  /** Freehand path for pen/highlighter; exactly [start, end] for line/rect/ellipse/text. */
  points: WhiteboardPoint[];
  text?: string;
}

export interface WhiteboardBackground {
  dataUrl: string;
  width: number;
  height: number;
}

export interface WhiteboardState {
  v: 1;
  strokes: WhiteboardStroke[];
  background: WhiteboardBackground | null;
  /** Learner identities (besides the host, who can always draw) currently holding the pen. */
  drawerIds: string[];
}

export const EMPTY_WHITEBOARD: WhiteboardState = { v: 1, strokes: [], background: null, drawerIds: [] };

export function newStrokeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Loosely validates whatever the API handed back -- an unrecognised shape (or null, from a never-saved board) falls back to empty rather than throwing. */
export function parseWhiteboardState(raw: unknown): WhiteboardState {
  if (
    raw &&
    typeof raw === 'object' &&
    Array.isArray((raw as WhiteboardState).strokes) &&
    Array.isArray((raw as WhiteboardState).drawerIds)
  ) {
    return raw as WhiteboardState;
  }
  return EMPTY_WHITEBOARD;
}

export function renderWhiteboard(
  ctx: CanvasRenderingContext2D,
  state: WhiteboardState,
  liveStroke?: WhiteboardStroke | null,
): void {
  ctx.clearRect(0, 0, WB_WIDTH, WB_HEIGHT);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, WB_WIDTH, WB_HEIGHT);

  if (state.background) {
    // Drawn from an already-decoded <img> cached by the caller; see Whiteboard.tsx.
    const img = backgroundImageCache.get(state.background.dataUrl);
    if (img) ctx.drawImage(img, 0, 0, WB_WIDTH, WB_HEIGHT);
  }

  for (const stroke of state.strokes) drawStroke(ctx, stroke);
  if (liveStroke) drawStroke(ctx, liveStroke);
}

const backgroundImageCache = new Map<string, HTMLImageElement>();

/** Decodes (and caches) a background's data URL so renderWhiteboard() can draw it synchronously. Call once per new background, then re-render. */
export function loadBackgroundImage(dataUrl: string, onReady: () => void): void {
  if (backgroundImageCache.has(dataUrl)) {
    onReady();
    return;
  }
  const img = new Image();
  img.onload = () => {
    backgroundImageCache.set(dataUrl, img);
    onReady();
  };
  img.src = dataUrl;
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: WhiteboardStroke): void {
  const { tool, color, width, points } = stroke;
  if (points.length === 0) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = tool === 'highlighter' ? 0.35 : 1;

  if (tool === 'pen' || tool === 'highlighter') {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (const p of points.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  } else if (tool === 'line' && points.length >= 2) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    ctx.lineTo(points[1].x, points[1].y);
    ctx.stroke();
  } else if (tool === 'rect' && points.length >= 2) {
    const [a, b] = points;
    ctx.strokeRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
  } else if (tool === 'ellipse' && points.length >= 2) {
    const [a, b] = points;
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.abs(b.x - a.x) / 2, Math.abs(b.y - a.y) / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (tool === 'text' && stroke.text) {
    ctx.font = `${Math.max(16, width * 6)}px "Yu Mincho", serif`;
    ctx.textBaseline = 'top';
    ctx.fillText(stroke.text, points[0].x, points[0].y);
  }
  ctx.restore();
}

/** Distance from a point to a stroke, for the eraser's hit-test. Freehand paths check each segment; shapes check their outline. */
export function strokeHitDistance(stroke: WhiteboardStroke, x: number, y: number): number {
  const pts = stroke.points;
  if (pts.length === 0) return Infinity;
  if (pts.length === 1) return Math.hypot(pts[0].x - x, pts[0].y - y);

  if (stroke.tool === 'rect' || stroke.tool === 'ellipse') {
    const [a, b] = pts;
    const cx = Math.min(a.x, b.x);
    const cy = Math.min(a.y, b.y);
    const w = Math.abs(b.x - a.x);
    const h = Math.abs(b.y - a.y);
    const dx = Math.max(cx - x, 0, x - (cx + w));
    const dy = Math.max(cy - y, 0, y - (cy + h));
    return Math.hypot(dx, dy);
  }

  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i += 1) {
    best = Math.min(best, distanceToSegment(x, y, pts[i], pts[i + 1]));
  }
  return best;
}

function distanceToSegment(x: number, y: number, a: WhiteboardPoint, b: WhiteboardPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / lengthSq));
  return Math.hypot(a.x + t * dx - x, a.y + t * dy - y);
}
