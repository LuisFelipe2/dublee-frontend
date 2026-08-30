import { useEffect, useRef } from 'react';
import './SubtitleTimeline.css';

const RULER_HEIGHT = 28;
const TRACK_HEIGHT = 64;
const PX_PER_SEC = 50;
const MIN_BLOCK_WIDTH = 24;
const AUTO_SCROLL_MARGIN = 60;
const TICK_OPTIONS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600];

const pickTickInterval = (pxPerSec) =>
  TICK_OPTIONS.find(sec => sec * pxPerSec >= 70) ?? TICK_OPTIONS[TICK_OPTIONS.length - 1];

const formatTick = (sec) => {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const SubtitleTimeline = ({
  subtitles,
  pendingBlock,
  durationSec,
  playheadSec,
  selectedBlockId,
  disabled,
  onSeek,
  onSelectBlock,
  onDeleteBlock,
  onMoveBlock,
  onTrimBlockStart,
  onTrimBlockEnd,
}) => {
  const scrollRef = useRef(null);
  const contentRef = useRef(null);
  const dragRef = useRef(null);

  const safeDuration = Math.max(durationSec, 1);
  const contentWidth = safeDuration * PX_PER_SEC + 40;
  const tickInterval = pickTickInterval(PX_PER_SEC);
  const ticks = [];
  for (let t = 0; t <= safeDuration; t += tickInterval) ticks.push(t);

  useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    const playheadX = playheadSec * PX_PER_SEC;
    const { scrollLeft, clientWidth } = scroll;
    if (playheadX < scrollLeft + AUTO_SCROLL_MARGIN) {
      scroll.scrollLeft = Math.max(0, playheadX - AUTO_SCROLL_MARGIN);
    } else if (playheadX > scrollLeft + clientWidth - AUTO_SCROLL_MARGIN) {
      scroll.scrollLeft = playheadX - clientWidth + AUTO_SCROLL_MARGIN;
    }
  }, [playheadSec]);

  const seekFromClientX = (clientX) => {
    if (disabled || !contentRef.current) return;
    const rect = contentRef.current.getBoundingClientRect();
    const sec = Math.max(0, Math.min(safeDuration, (clientX - rect.left) / PX_PER_SEC));
    onSeek(sec);
  };

  const handleRulerPointerDown = (e) => seekFromClientX(e.clientX);

  const handleTrackPointerDown = (e) => {
    if (e.target.closest('.subtitle-block')) return;
    onSelectBlock(null);
    seekFromClientX(e.clientX);
  };

  const beginDrag = (e, type, block) => {
    if (disabled) return;
    e.stopPropagation();
    // setPointerCapture pode falhar em alguns dispositivos/condições (ex.: o
    // pointerId ainda não é reconhecido como "ativo" no exato instante do
    // pointerdown) — não deixamos isso abortar a seleção/arraste, já que o
    // capture é só uma otimização (garante que pointermove/pointerup continuem
    // chegando aqui mesmo se o cursor sair do elemento), não um requisito.
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* segue sem capture */ }
    dragRef.current = { type, blockId: block.id, startX: e.clientX, startStart: block.startTime, startEnd: block.endTime };
    onSelectBlock(block.id);
    if (type === 'move') onSeek(block.startTime);
  };

  const handleBlockPointerMove = (e) => {
    const drag = dragRef.current;
    if (!drag) return;
    const deltaSec = (e.clientX - drag.startX) / PX_PER_SEC;
    if (drag.type === 'move') onMoveBlock(drag.blockId, drag.startStart + deltaSec);
    else if (drag.type === 'trim-start') onTrimBlockStart(drag.blockId, drag.startStart + deltaSec);
    else if (drag.type === 'trim-end') onTrimBlockEnd(drag.blockId, drag.startEnd + deltaSec);
  };

  const endBlockDrag = (e) => {
    dragRef.current = null;
    try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch { /* nada a liberar */ }
  };

  return (
    <div className="subtitle-timeline">
      <div className="subtitle-timeline__scroll" ref={scrollRef}>
        <div className="subtitle-timeline__content" ref={contentRef} style={{ width: contentWidth }}>
          <div
            className="subtitle-timeline__ruler"
            style={{ height: RULER_HEIGHT }}
            onPointerDown={handleRulerPointerDown}
          >
            {ticks.map(t => (
              <div key={t} className="subtitle-timeline__tick" style={{ left: t * PX_PER_SEC }}>
                <span className="subtitle-timeline__tick-label">{formatTick(t)}</span>
              </div>
            ))}
          </div>

          <div
            className="subtitle-timeline__track"
            style={{ height: TRACK_HEIGHT }}
            onPointerDown={handleTrackPointerDown}
          >
            {subtitles.map(block => {
              const left = block.startTime * PX_PER_SEC;
              const width = Math.max(MIN_BLOCK_WIDTH, (block.endTime - block.startTime) * PX_PER_SEC);
              const selected = block.id === selectedBlockId;
              return (
                <div
                  key={block.id}
                  className={`subtitle-block${selected ? ' subtitle-block--selected' : ''}`}
                  style={{ left, width }}
                  onPointerDown={e => beginDrag(e, 'move', block)}
                  onPointerMove={handleBlockPointerMove}
                  onPointerUp={endBlockDrag}
                  title={block.text}
                >
                  <div
                    className="subtitle-block__handle subtitle-block__handle--left"
                    onPointerDown={e => beginDrag(e, 'trim-start', block)}
                    onPointerMove={handleBlockPointerMove}
                    onPointerUp={endBlockDrag}
                  />
                  <span className="subtitle-block__label">{block.text}</span>
                  <div
                    className="subtitle-block__handle subtitle-block__handle--right"
                    onPointerDown={e => beginDrag(e, 'trim-end', block)}
                    onPointerMove={handleBlockPointerMove}
                    onPointerUp={endBlockDrag}
                  />
                </div>
              );
            })}

            {pendingBlock && pendingBlock.text.trim() !== '' && (() => {
              // O pendente preenche até o início da próxima legenda comitada
              // (se houver uma à frente) em vez de sempre ir até o fim do vídeo.
              const nextStart = subtitles
                .filter(s => s.startTime >= pendingBlock.startSec)
                .reduce((min, s) => Math.min(min, s.startTime), safeDuration);
              return (
                <div
                  className="subtitle-block subtitle-block--pending"
                  style={{
                    left: pendingBlock.startSec * PX_PER_SEC,
                    width: Math.max(MIN_BLOCK_WIDTH, (nextStart - pendingBlock.startSec) * PX_PER_SEC),
                  }}
                  title={pendingBlock.text}
                >
                  <span className="subtitle-block__label">{pendingBlock.text}</span>
                </div>
              );
            })()}
          </div>

          <div
            className="subtitle-timeline__playhead"
            style={{ left: playheadSec * PX_PER_SEC, height: RULER_HEIGHT + TRACK_HEIGHT }}
          />
        </div>
      </div>
    </div>
  );
};

export default SubtitleTimeline;
