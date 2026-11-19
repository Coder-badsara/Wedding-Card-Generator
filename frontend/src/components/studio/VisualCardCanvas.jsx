import React, { useRef, useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Move, Sparkles, Layers, AlignHorizontalDistributeCenter, AlignLeft, AlignCenter, StretchHorizontal } from 'lucide-react';
import { formatMediaUrl } from '../../api/projectsApi';
import { formatWeddingLines } from '../../utils/textFormatter';

export default function VisualCardCanvas({
  project,
  targetLanguage = 'original',
  lineBoxes,
  onLineBoxesChange,
  boxCoords,
  onBoxChange,
  activeLine = 'line1',
  onSelectLine,
  fontFamily,
  fontSize,
  fontColor,
  textAlign,
  sampleText,
  prefixText,
  linePreference,
  backendPreviewUrl,
  onClearBackendPreview
}) {
  const containerRef = useRef(null);
  const imgRef = useRef(null);

  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [activeHandle, setActiveHandle] = useState(null); // 'move', 'nw', 'ne', 'sw', 'se', 'e', 'w', 'n', 's'
  const [activeBoxKey, setActiveBoxKey] = useState('line1');
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialBox, setInitialBox] = useState({ x: 0, y: 0, w: 0, h: 0 });

  const previewSrc = formatMediaUrl(project?.preview_url);

  // Default 3-line boxes if none configured yet
  const defaultLineBoxes = {
    line1: { x: boxCoords?.x ?? 0.58, y: boxCoords?.y ?? 0.52, w: boxCoords?.w ?? 0.35, h: 0.045 },
    line2: { x: boxCoords?.x ?? 0.58, y: Number(((boxCoords?.y ?? 0.52) + 0.05).toFixed(4)), w: boxCoords?.w ?? 0.35, h: 0.045 },
    line3: { x: boxCoords?.x ?? 0.58, y: Number(((boxCoords?.y ?? 0.52) + 0.10).toFixed(4)), w: boxCoords?.w ?? 0.35, h: 0.045 },
  };

  const currentLineBoxes = lineBoxes && Object.keys(lineBoxes).length > 0 ? lineBoxes : defaultLineBoxes;

  const getFontFamilyStyle = (font) => {
    if (!font) return 'sans-serif';
    const lower = font.toLowerCase();
    if (lower.includes('gargi')) return "'Gargi', 'Noto Sans Devanagari', sans-serif";
    if (lower.includes('eczar')) return "'Eczar', 'Noto Sans Devanagari', serif";
    if (lower.includes('aparajita')) return "'Aparajita', 'Noto Sans Devanagari', serif";
    if (lower.includes('akshar')) return "'Akshar Unicode', 'Akshar', 'Noto Sans Devanagari', sans-serif";
    if (lower.includes('arya')) return "'Arya', 'Noto Sans Devanagari', sans-serif";
    if (lower.includes('devanagari')) return "'Noto Sans Devanagari', sans-serif";
    if (lower.includes('greatvibes') || lower.includes('vibes')) return "'Great Vibes', cursive";
    if (lower.includes('alex')) return "'AlexBrush-Regular', cursive";
    if (lower.includes('aspire')) return "'Aspire-DemiBold', cursive";
    if (lower.includes('masterday')) return "'Masterday-Regular', cursive";
    if (lower.includes('sway')) return "'SFCSway-Regular', cursive";
    if (lower.includes('nova')) return "'Novablanc-Regular', serif";
    if (lower.includes('camelot')) return "'QueenOfCamelot-Regular', sans-serif";
    if (lower.includes('college')) return "'CollegeBlock2-Regular', sans-serif";
    if (lower.includes('primitive')) return "'Primitive-Regular', serif";
    if (lower.includes('cinzel')) return "'Cinzel', serif";
    if (lower.includes('playfair')) return "'Playfair Display', serif";
    return 'sans-serif';
  };

  const handleMouseDown = (e, handleType, lineKey) => {
    e.preventDefault();
    e.stopPropagation();

    setActiveBoxKey(lineKey);
    if (onSelectLine) onSelectLine(lineKey);

    const targetBox = currentLineBoxes[lineKey] || defaultLineBoxes[lineKey];
    setIsDragging(true);
    setActiveHandle(handleType);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialBox({ ...targetBox });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !imgRef.current || !activeBoxKey) return;

      const imgRect = imgRef.current.getBoundingClientRect();
      const deltaX = (e.clientX - dragStart.x) / imgRect.width;
      const deltaY = (e.clientY - dragStart.y) / imgRect.height;

      let newX = initialBox.x;
      let newY = initialBox.y;
      let newW = initialBox.w;
      let newH = initialBox.h;

      if (activeHandle === 'move') {
        newX = Math.max(0, Math.min(1 - newW, initialBox.x + deltaX));
        newY = Math.max(0, Math.min(1 - newH, initialBox.y + deltaY));
      } else {
        if (activeHandle.includes('e')) {
          newW = Math.max(0.05, Math.min(1 - initialBox.x, initialBox.w + deltaX));
        }
        if (activeHandle.includes('s')) {
          newH = Math.max(0.02, Math.min(1 - initialBox.y, initialBox.h + deltaY));
        }
        if (activeHandle.includes('w')) {
          const maxDeltaW = initialBox.w - 0.05;
          const clampedDeltaX = Math.min(maxDeltaW, Math.max(-initialBox.x, deltaX));
          newX = initialBox.x + clampedDeltaX;
          newW = initialBox.w - clampedDeltaX;
        }
        if (activeHandle.includes('n')) {
          const maxDeltaH = initialBox.h - 0.02;
          const clampedDeltaY = Math.min(maxDeltaH, Math.max(-initialBox.y, deltaY));
          newY = initialBox.y + clampedDeltaY;
          newH = initialBox.h - clampedDeltaY;
        }
      }

      const updatedBox = {
        x: Number(newX.toFixed(4)),
        y: Number(newY.toFixed(4)),
        w: Number(newW.toFixed(4)),
        h: Number(newH.toFixed(4)),
      };

      const nextLineBoxes = {
        ...currentLineBoxes,
        [activeBoxKey]: updatedBox,
      };

      if (onLineBoxesChange) {
        onLineBoxesChange(nextLineBoxes);
      }

      // Also keep single bounding box envelope updated for fallback
      if (onBoxChange) {
        const minX = Math.min(nextLineBoxes.line1.x, nextLineBoxes.line2.x, nextLineBoxes.line3.x);
        const minY = Math.min(nextLineBoxes.line1.y, nextLineBoxes.line2.y, nextLineBoxes.line3.y);
        const maxRight = Math.max(
          nextLineBoxes.line1.x + nextLineBoxes.line1.w,
          nextLineBoxes.line2.x + nextLineBoxes.line2.w,
          nextLineBoxes.line3.x + nextLineBoxes.line3.w
        );
        const maxBottom = Math.max(
          nextLineBoxes.line1.y + nextLineBoxes.line1.h,
          nextLineBoxes.line2.y + nextLineBoxes.line2.h,
          nextLineBoxes.line3.y + nextLineBoxes.line3.h
        );
        onBoxChange({
          x: Number(minX.toFixed(4)),
          y: Number(minY.toFixed(4)),
          w: Number((maxRight - minX).toFixed(4)),
          h: Number((maxBottom - minY).toFixed(4)),
        });
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        setActiveHandle(null);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, activeHandle, activeBoxKey, dragStart, initialBox, currentLineBoxes, onLineBoxesChange, onBoxChange]);

  const isHindi =
    targetLanguage === 'hindi' ||
    (targetLanguage !== 'original' &&
      (fontFamily.toLowerCase().includes('devanagari') ||
        ['gargi', 'eczar', 'aparajita', 'akshar', 'arya'].some((f) => fontFamily.toLowerCase().includes(f)) ||
        /[\u0900-\u097F]/.test(sampleText)));

  let lines = formatWeddingLines(sampleText, isHindi, linePreference);
  if (!lines || lines.length === 0) {
    lines = [sampleText || 'अमित शर्मा एवं सपरिवार'];
  }
  if (prefixText && lines.length > 0) {
    lines = [`${prefixText} ${lines[0]}`, ...lines.slice(1)];
  }

  // Quick alignment helpers
  const handleAlignLeft = () => {
    const targetX = currentLineBoxes.line1?.x ?? 0.58;
    onLineBoxesChange({
      ...currentLineBoxes,
      line2: { ...currentLineBoxes.line2, x: targetX },
      line3: { ...currentLineBoxes.line3, x: targetX },
    });
  };

  const handleAlignCenter = () => {
    const l1 = currentLineBoxes.line1 || defaultLineBoxes.line1;
    const l1Center = l1.x + l1.w / 2;
    const l2w = currentLineBoxes.line2?.w ?? l1.w;
    const l3w = currentLineBoxes.line3?.w ?? l1.w;
    onLineBoxesChange({
      ...currentLineBoxes,
      line2: {
        ...currentLineBoxes.line2,
        x: Number((l1Center - l2w / 2).toFixed(4)),
      },
      line3: {
        ...currentLineBoxes.line3,
        x: Number((l1Center - l3w / 2).toFixed(4)),
      },
    });
  };

  const handleMatchWidth = () => {
    const targetW = currentLineBoxes.line1?.w ?? 0.35;
    onLineBoxesChange({
      ...currentLineBoxes,
      line2: { ...currentLineBoxes.line2, w: targetW },
      line3: { ...currentLineBoxes.line3, w: targetW },
    });
  };

  const handleResetStack = () => {
    const bx = currentLineBoxes.line1?.x ?? 0.58;
    const by = currentLineBoxes.line1?.y ?? 0.52;
    const bw = currentLineBoxes.line1?.w ?? 0.35;
    const bh = currentLineBoxes.line1?.h ?? 0.045;
    const gap = 0.01;
    onLineBoxesChange({
      line1: { x: bx, y: by, w: bw, h: bh },
      line2: { x: bx, y: Number((by + bh + gap).toFixed(4)), w: bw, h: bh },
      line3: { x: bx, y: Number((by + (bh + gap) * 2).toFixed(4)), w: bw, h: bh },
    });
  };

  const selectedLine = activeLine || activeBoxKey || 'line1';

  return (
    <div className="flex-1 bg-slate-950 rounded-3xl p-4 flex flex-col overflow-hidden relative shadow-2xl border border-slate-800">
      {/* Top Floating Control Bar */}
      <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800/80 mb-3 z-10 text-xs text-slate-300 gap-2">
        <div className="flex items-center gap-2.5">
          <span className="font-bold text-white flex items-center gap-1.5 font-serif">
            <Layers className="w-4 h-4 text-amber-400" />
            Interactive 3-Line Card Studio
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400 font-mono text-[11px]">
            {project?.pdf_width_pts?.toFixed(0)} × {project?.pdf_height_pts?.toFixed(0)} pt
          </span>
          {backendPreviewUrl && (
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1 font-semibold text-[10px]">
              <Sparkles className="w-3 h-3 text-amber-300" />
              Authoritative PyMuPDF Preview
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!backendPreviewUrl && (
            <div className="hidden sm:flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 text-[11px]">
              <button
                type="button"
                onClick={handleAlignLeft}
                className="px-2 py-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                title="Align all 3 boxes to the left edge of Line 1"
              >
                <AlignLeft className="w-3 h-3" />
                Align Left
              </button>
              <button
                type="button"
                onClick={handleAlignCenter}
                className="px-2 py-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                title="Align centers of Line 2 and Line 3 to Line 1"
              >
                <AlignCenter className="w-3 h-3" />
                Align Center
              </button>
              <button
                type="button"
                onClick={handleMatchWidth}
                className="px-2 py-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                title="Make all 3 boxes the same width as Line 1"
              >
                <StretchHorizontal className="w-3 h-3" />
                Match Width
              </button>
              <button
                type="button"
                onClick={handleResetStack}
                className="px-2 py-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                title="Evenly stack the 3 lines vertically"
              >
                <AlignHorizontalDistributeCenter className="w-3 h-3" />
                Even Stack
              </button>
            </div>
          )}

          {backendPreviewUrl && (
            <button
              onClick={onClearBackendPreview}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl transition-colors border border-slate-700 text-xs font-semibold cursor-pointer"
            >
              Back to Interactive Mode
            </button>
          )}

          <div className="flex items-center bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-inner">
            <button
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-xs font-mono text-slate-300">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(2.0, z + 0.15))}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-1.5 hover:bg-slate-800 text-slate-500 hover:text-slate-200 border-l border-slate-800 transition-colors cursor-pointer"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas Scroll Area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto flex items-center justify-center p-4 bg-slate-900/60 rounded-2xl relative select-none dark-canvas-scroll"
      >
        <div
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
          className="relative transition-transform duration-100 shadow-2xl rounded-xl overflow-hidden max-w-full"
        >
          {/* Card Preview Image */}
          <img
            ref={imgRef}
            src={backendPreviewUrl || previewSrc}
            alt="Wedding Card Master"
            className="block max-h-[70vh] w-auto pointer-events-none object-contain rounded-xl"
          />

          {/* 3 Separate Interactive Draggable & Resizable Boxes */}
          {!backendPreviewUrl && imgRef.current && (
            <>
              {['line1', 'line2', 'line3'].map((lineKey, idx) => {
                const box = currentLineBoxes[lineKey] || defaultLineBoxes[lineKey];
                const isActive = selectedLine === lineKey;
                const lineText = lines[idx] || '';

                const theme =
                  lineKey === 'line1'
                    ? {
                        border: isActive ? 'border-rose-500 border-2' : 'border-rose-400/80 border-dashed border-2',
                        bg: isActive ? 'bg-rose-500/15' : 'bg-rose-500/5 hover:bg-rose-500/10',
                        ring: isActive ? 'ring-2 ring-rose-400/60 shadow-xl' : '',
                        badge: 'bg-rose-800 text-white',
                        handle: 'bg-rose-500 border-slate-950',
                        title: '1st Line',
                      }
                    : lineKey === 'line2'
                    ? {
                        border: isActive ? 'border-amber-400 border-2' : 'border-amber-400/80 border-dashed border-2',
                        bg: isActive ? 'bg-amber-500/15' : 'bg-amber-500/5 hover:bg-amber-500/10',
                        ring: isActive ? 'ring-2 ring-amber-400/60 shadow-xl' : '',
                        badge: 'bg-amber-700 text-white',
                        handle: 'bg-amber-400 border-slate-950',
                        title: '2nd Line',
                      }
                    : {
                        border: isActive ? 'border-emerald-500 border-2' : 'border-emerald-400/80 border-dashed border-2',
                        bg: isActive ? 'bg-emerald-500/15' : 'bg-emerald-500/5 hover:bg-emerald-500/10',
                        ring: isActive ? 'ring-2 ring-emerald-400/60 shadow-xl' : '',
                        badge: 'bg-emerald-700 text-white',
                        handle: 'bg-emerald-500 border-slate-950',
                        title: '3rd Line',
                      };

                return (
                  <div
                    key={lineKey}
                    style={{
                      left: `${box.x * 100}%`,
                      top: `${box.y * 100}%`,
                      width: `${box.w * 100}%`,
                      height: `${box.h * 100}%`,
                      zIndex: isActive ? 35 : 25 - idx,
                    }}
                    className={`absolute ${theme.border} ${theme.bg} ${theme.ring} cursor-move rounded-lg transition-colors group select-none`}
                    onMouseDown={(e) => handleMouseDown(e, 'move', lineKey)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveBoxKey(lineKey);
                      if (onSelectLine) onSelectLine(lineKey);
                    }}
                  >
                    {/* Multi-Line Live Preview Text inside Line Box */}
                    <div
                      style={{
                        fontFamily: getFontFamilyStyle(fontFamily),
                        fontSize: `${fontSize * (imgRef.current?.clientHeight / project?.pdf_height_pts || 1)}px`,
                        color: fontColor,
                        textAlign: textAlign,
                      }}
                      className={`w-full h-full flex items-center ${
                        textAlign === 'center'
                          ? 'justify-center'
                          : textAlign === 'right'
                          ? 'justify-end'
                          : 'justify-start'
                      } px-1.5 pointer-events-none drop-shadow-sm font-semibold select-none leading-none overflow-visible`}
                    >
                      <span className="whitespace-nowrap">
                        {lineText || (
                          <span className="opacity-40 italic font-sans text-[11px] font-normal tracking-wide">
                            ({theme.title})
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Line Badge */}
                    <div
                      className={`absolute -top-6 left-0 ${theme.badge} text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-md pointer-events-none flex items-center gap-1 shrink-0`}
                    >
                      <Move className="w-2.5 h-2.5" />
                      {theme.title}
                    </div>

                    {/* Resize Handles (Active Box Only) */}
                    {isActive && (
                      <>
                        <div
                          onMouseDown={(e) => handleMouseDown(e, 'nw', lineKey)}
                          className={`absolute -top-1.5 -left-1.5 w-3.5 h-3.5 ${theme.handle} border rounded-sm cursor-nwse-resize hover:scale-125 transition-transform z-40`}
                        />
                        <div
                          onMouseDown={(e) => handleMouseDown(e, 'ne', lineKey)}
                          className={`absolute -top-1.5 -right-1.5 w-3.5 h-3.5 ${theme.handle} border rounded-sm cursor-nesw-resize hover:scale-125 transition-transform z-40`}
                        />
                        <div
                          onMouseDown={(e) => handleMouseDown(e, 'sw', lineKey)}
                          className={`absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 ${theme.handle} border rounded-sm cursor-nesw-resize hover:scale-125 transition-transform z-40`}
                        />
                        <div
                          onMouseDown={(e) => handleMouseDown(e, 'se', lineKey)}
                          className={`absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 ${theme.handle} border rounded-sm cursor-nwse-resize hover:scale-125 transition-transform z-40`}
                        />
                        <div
                          onMouseDown={(e) => handleMouseDown(e, 'e', lineKey)}
                          className={`absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-4 ${theme.handle} border rounded-sm cursor-ew-resize hover:scale-125 transition-transform z-40`}
                        />
                        <div
                          onMouseDown={(e) => handleMouseDown(e, 'w', lineKey)}
                          className={`absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-4 ${theme.handle} border rounded-sm cursor-ew-resize hover:scale-125 transition-transform z-40`}
                        />
                        <div
                          onMouseDown={(e) => handleMouseDown(e, 'n', lineKey)}
                          className={`absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-3 ${theme.handle} border rounded-sm cursor-ns-resize hover:scale-125 transition-transform z-40`}
                        />
                        <div
                          onMouseDown={(e) => handleMouseDown(e, 's', lineKey)}
                          className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-3 ${theme.handle} border rounded-sm cursor-ns-resize hover:scale-125 transition-transform z-40`}
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
