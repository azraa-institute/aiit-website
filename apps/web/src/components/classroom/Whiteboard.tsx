import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useDataChannel, useLocalParticipant, useParticipants } from '@livekit/components-react';
import type { LiveClassJoin } from '@aiit/shared';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import {
  EMPTY_WHITEBOARD,
  WB_HEIGHT,
  WB_WIDTH,
  loadBackgroundImage,
  newStrokeId,
  parseWhiteboardState,
  renderWhiteboard,
  strokeHitDistance,
  type WhiteboardBackground,
  type WhiteboardPoint,
  type WhiteboardState,
  type WhiteboardStroke,
  type WhiteboardTool,
} from './whiteboardModel';
import { displayName, participantRole } from './participant';

const COLORS = ['#1a1a1a', '#c0392b', '#2563eb', '#15803d', '#d97706', '#ffffff'];
const WIDTHS = [3, 6, 12];
const ERASE_RADIUS = 18;
const SAVE_DEBOUNCE_MS = 4000;
const TOOLS: { id: WhiteboardTool; label: string }[] = [
  { id: 'pen', label: 'Pen' },
  { id: 'highlighter', label: 'Marker' },
  { id: 'eraser', label: 'Erase' },
  { id: 'line', label: 'Line' },
  { id: 'rect', label: 'Rect' },
  { id: 'ellipse', label: 'Oval' },
  { id: 'text', label: 'Text' },
];

type WbMessage =
  | { t: 'stroke'; stroke: WhiteboardStroke }
  | { t: 'erase'; ids: string[] }
  | { t: 'undo' }
  | { t: 'clear' }
  | { t: 'bg'; background: WhiteboardBackground | null }
  | { t: 'grant'; identity: string }
  | { t: 'revoke'; identity: string };

function encode(msg: WbMessage): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(msg));
}

function applyRemote(prev: WhiteboardState, msg: WbMessage): WhiteboardState {
  switch (msg.t) {
    case 'stroke':
      return { ...prev, strokes: [...prev.strokes, msg.stroke] };
    case 'erase':
      return { ...prev, strokes: prev.strokes.filter((s) => !msg.ids.includes(s.id)) };
    case 'undo':
      return { ...prev, strokes: prev.strokes.slice(0, -1) };
    case 'clear':
      return { ...prev, strokes: [] };
    case 'bg':
      return { ...prev, background: msg.background };
    case 'grant':
      return { ...prev, drawerIds: Array.from(new Set([...prev.drawerIds, msg.identity])) };
    case 'revoke':
      return { ...prev, drawerIds: prev.drawerIds.filter((id) => id !== msg.identity) };
    default:
      return prev;
  }
}

/** Captures whatever's currently showing on the main stage (screen share or camera) as a still image, for annotating over. */
function captureStageFrame(): WhiteboardBackground | null {
  const video = document.querySelector<HTMLVideoElement>('.classroom__stage video');
  if (!video || video.readyState < 2 || !video.videoWidth) return null;
  const maxW = 1280;
  const scale = Math.min(1, maxW / video.videoWidth);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.72), width: canvas.width, height: canvas.height };
}

export function WhiteboardPanel({ join }: { join: LiveClassJoin }) {
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const isHost = join.role === 'host';

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<WhiteboardState>(EMPTY_WHITEBOARD);
  const stateRef = useRef(state);
  stateRef.current = state;
  const [ready, setReady] = useState(false);
  const [tool, setTool] = useState<WhiteboardTool>('pen');
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(WIDTHS[0]);
  const [liveStroke, setLiveStroke] = useState<WhiteboardStroke | null>(null);
  const [textDraft, setTextDraft] = useState<{ x: number; y: number; value: string } | null>(null);
  const [error, setError] = useState<string>();

  const draftRef = useRef<{ tool: Exclude<WhiteboardTool, 'eraser'>; color: string; width: number; points: WhiteboardPoint[] } | null>(
    null,
  );
  const erasedRef = useRef<Set<string>>(new Set());
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const canDraw = isHost || state.drawerIds.includes(localParticipant.identity);

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ state: unknown }>(`/live-classes/${join.liveClass.id}/whiteboard`)
      .then((res) => {
        if (cancelled) return;
        const parsed = parseWhiteboardState(res.state);
        if (parsed.background) loadBackgroundImage(parsed.background.dataUrl, () => setState((s) => ({ ...s })));
        setState(parsed);
      })
      .catch(() => setError('Could not load the whiteboard.'))
      .finally(() => setReady(true));
    return () => {
      cancelled = true;
    };
  }, [join.liveClass.id]);

  const { send } = useDataChannel('wb', (msg) => {
    let payload: WbMessage;
    try {
      payload = JSON.parse(new TextDecoder().decode(msg.payload)) as WbMessage;
    } catch {
      return;
    }
    if (payload.t === 'bg' && payload.background) {
      loadBackgroundImage(payload.background.dataUrl, () => setState((s) => ({ ...s })));
    }
    setState((prev) => applyRemote(prev, payload));
  });
  // A separate, always-cheap topic so ClassroomInner can light up the toolbar
  // button for anyone whose panel is closed, without itself parsing board
  // messages or keeping a full WhiteboardState around.
  const { send: notify } = useDataChannel('wb-notify');

  async function broadcast(msg: WbMessage) {
    try {
      await send(encode(msg), { reliable: true });
      void notify(new Uint8Array(0), { reliable: false });
    } catch {
      // Best effort -- the debounced save is the safety net if this drops.
    }
  }

  function scheduleSave(next: WhiteboardState) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void apiFetch(`/live-classes/${join.liveClass.id}/whiteboard`, {
        method: 'PUT',
        body: JSON.stringify({ state: next }),
      }).catch(() => {});
    }, SAVE_DEBOUNCE_MS);
  }

  useEffect(
    () => () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) renderWhiteboard(ctx, state, liveStroke);
  }, [state, liveStroke]);

  function commitStroke(stroke: WhiteboardStroke) {
    const next: WhiteboardState = { ...stateRef.current, strokes: [...stateRef.current.strokes, stroke] };
    setState(next);
    scheduleSave(next);
    void broadcast({ t: 'stroke', stroke });
  }

  function commitUndo() {
    if (stateRef.current.strokes.length === 0) return;
    const next: WhiteboardState = { ...stateRef.current, strokes: stateRef.current.strokes.slice(0, -1) };
    setState(next);
    scheduleSave(next);
    void broadcast({ t: 'undo' });
  }

  function commitClear() {
    const next: WhiteboardState = { ...stateRef.current, strokes: [] };
    setState(next);
    scheduleSave(next);
    void broadcast({ t: 'clear' });
  }

  function commitBackground(background: WhiteboardBackground | null) {
    const next: WhiteboardState = { ...stateRef.current, background };
    if (background) loadBackgroundImage(background.dataUrl, () => setState((s) => ({ ...s })));
    setState(next);
    scheduleSave(next);
    void broadcast({ t: 'bg', background });
  }

  function commitGrant(identity: string) {
    const next: WhiteboardState = { ...stateRef.current, drawerIds: Array.from(new Set([...stateRef.current.drawerIds, identity])) };
    setState(next);
    scheduleSave(next);
    void broadcast({ t: 'grant', identity });
  }

  function commitRevoke(identity: string) {
    const next: WhiteboardState = { ...stateRef.current, drawerIds: stateRef.current.drawerIds.filter((id) => id !== identity) };
    setState(next);
    scheduleSave(next);
    void broadcast({ t: 'revoke', identity });
  }

  function eraseAt(p: WhiteboardPoint) {
    setState((prev) => {
      const hit = prev.strokes.filter((s) => !erasedRef.current.has(s.id) && strokeHitDistance(s, p.x, p.y) <= ERASE_RADIUS);
      if (hit.length === 0) return prev;
      hit.forEach((s) => erasedRef.current.add(s.id));
      return { ...prev, strokes: prev.strokes.filter((s) => !erasedRef.current.has(s.id)) };
    });
  }

  function toPoint(e: ReactPointerEvent<HTMLCanvasElement>): WhiteboardPoint {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * WB_WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * WB_HEIGHT;
    return { x: Math.max(0, Math.min(WB_WIDTH, x)), y: Math.max(0, Math.min(WB_HEIGHT, y)) };
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!canDraw || !ready) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toPoint(e);

    if (tool === 'text') {
      setTextDraft({ x: p.x, y: p.y, value: '' });
      return;
    }
    if (tool === 'eraser') {
      erasedRef.current = new Set();
      eraseAt(p);
      return;
    }
    draftRef.current = { tool, color, width, points: [p] };
    setLiveStroke({ id: 'live', ...draftRef.current });
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!canDraw || e.buttons !== 1) return;
    const p = toPoint(e);
    if (tool === 'eraser') {
      eraseAt(p);
      return;
    }
    if (!draftRef.current) return;
    if (tool === 'pen' || tool === 'highlighter') {
      draftRef.current.points.push(p);
    } else {
      draftRef.current.points = [draftRef.current.points[0], p];
    }
    setLiveStroke({ id: 'live', ...draftRef.current });
  }

  function handlePointerUp() {
    if (!canDraw) return;
    if (tool === 'eraser') {
      if (erasedRef.current.size > 0) {
        void broadcast({ t: 'erase', ids: Array.from(erasedRef.current) });
        scheduleSave(stateRef.current);
      }
      erasedRef.current = new Set();
      return;
    }
    const draft = draftRef.current;
    draftRef.current = null;
    setLiveStroke(null);
    if (!draft || draft.points.length === 0) return;
    if (draft.tool !== 'pen' && draft.tool !== 'highlighter' && draft.points.length < 2) return;
    commitStroke({ id: newStrokeId(), tool: draft.tool, color: draft.color, width: draft.width, points: draft.points });
  }

  function commitTextDraft() {
    if (!textDraft) return;
    const value = textDraft.value.trim();
    const at = textDraft;
    setTextDraft(null);
    if (!value) return;
    commitStroke({ id: newStrokeId(), tool: 'text', color, width, points: [{ x: at.x, y: at.y }], text: value });
  }

  function insertFrame() {
    const bg = captureStageFrame();
    if (!bg) {
      setError('There is no shared screen or camera to capture right now.');
      return;
    }
    setError(undefined);
    commitBackground(bg);
  }

  const grantable = participants.filter(
    (p) => !p.isLocal && participantRole(p) !== 'host' && !state.drawerIds.includes(p.identity),
  );

  return (
    <div className="classroom-panel__body wb">
      {!canDraw ? (
        <p className="wb__notice">
          {isHost ? '' : 'Only the instructor, or whoever currently holds the pen, can draw here. You can still watch.'}
        </p>
      ) : null}

      {canDraw ? (
        <div className="wb__toolbar" role="toolbar" aria-label="Whiteboard tools">
          <div className="wb__tools">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={cn('wb__tool', tool === t.id && 'is-active')}
                aria-pressed={tool === t.id}
                onClick={() => setTool(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="wb__colors">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={cn('wb__color', color === c && 'is-active')}
                style={{ background: c }}
                aria-label={`Colour ${c}`}
                aria-pressed={color === c}
                onClick={() => setColor(c)}
              />
            ))}
            <input
              type="color"
              className="wb__color-picker"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              aria-label="Custom colour"
            />
          </div>
          <div className="wb__widths">
            {WIDTHS.map((w) => (
              <button
                key={w}
                type="button"
                className={cn('wb__width', width === w && 'is-active')}
                aria-pressed={width === w}
                onClick={() => setWidth(w)}
              >
                <span style={{ width: w, height: w }} />
              </button>
            ))}
          </div>
          <div className="wb__actions">
            <button type="button" onClick={commitUndo}>
              Undo
            </button>
            <button type="button" onClick={insertFrame}>
              Insert frame
            </button>
            {state.background ? (
              <button type="button" onClick={() => commitBackground(null)}>
                Remove image
              </button>
            ) : null}
            <button type="button" className="is-danger" onClick={() => confirm('Clear the whiteboard for everyone?') && commitClear()}>
              Clear
            </button>
          </div>
        </div>
      ) : null}

      {isHost ? (
        <div className="wb__presenter">
          <label>
            Give the pen to
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) commitGrant(e.target.value);
              }}
            >
              <option value="">Choose a participant…</option>
              {grantable.map((p) => (
                <option key={p.identity} value={p.identity}>
                  {displayName(p)}
                </option>
              ))}
            </select>
          </label>
          {state.drawerIds.length > 0 ? (
            <ul>
              {state.drawerIds.map((id) => {
                const p = participants.find((pp) => pp.identity === id);
                return (
                  <li key={id}>
                    <span>{p ? displayName(p) : id.slice(0, 8)}</span>
                    <button type="button" onClick={() => commitRevoke(id)}>
                      Take back
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="wb__error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="wb__canvas-wrap">
        <canvas
          ref={canvasRef}
          width={WB_WIDTH}
          height={WB_HEIGHT}
          className="wb__canvas"
          style={{ cursor: canDraw ? (tool === 'text' ? 'text' : 'crosshair') : 'default' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
        {textDraft ? (
          <input
            autoFocus
            className="wb__text-input"
            style={{ left: `${(textDraft.x / WB_WIDTH) * 100}%`, top: `${(textDraft.y / WB_HEIGHT) * 100}%`, color }}
            value={textDraft.value}
            onChange={(e) => setTextDraft((d) => (d ? { ...d, value: e.target.value } : d))}
            onBlur={commitTextDraft}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitTextDraft();
              if (e.key === 'Escape') setTextDraft(null);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
