import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

const resolveFontCssFamily = (fontIdOrName) => {
  if (!fontIdOrName) return undefined;
  const str = String(fontIdOrName).toLowerCase();
  if (str.includes('gargi')) return "'Gargi', sans-serif";
  if (str.includes('eczar')) return "'Eczar', serif";
  if (str.includes('aparajita')) return "'Aparajita', serif";
  if (str.includes('akshar')) return "'Akshar Unicode', 'Akshar', sans-serif";
  if (str.includes('arya')) return "'Arya', sans-serif";
  if (str.includes('noto')) return "'Noto Sans Devanagari', 'NotoSansDevanagari-Regular', sans-serif";
  if (str.includes('vibes')) return "'Great Vibes', 'GreatVibes-Regular', cursive";
  if (str.includes('alex')) return "'AlexBrush-Regular', cursive";
  if (str.includes('aspire')) return "'Aspire-DemiBold', cursive";
  if (str.includes('masterday')) return "'Masterday-Regular', cursive";
  if (str.includes('sway')) return "'SFCSway-Regular', cursive";
  if (str.includes('nova')) return "'Novablanc-Regular', serif";
  if (str.includes('camelot')) return "'QueenOfCamelot-Regular', sans-serif";
  if (str.includes('college')) return "'CollegeBlock2-Regular', sans-serif";
  if (str.includes('primitive')) return "'Primitive-Regular', serif";
  if (str.includes('cinzel')) return "'Cinzel-Bold', 'Cinzel', serif";
  if (str.includes('playfair')) return "'Playfair Display', 'PlayfairDisplay-Regular', serif";
  if (str.includes('silver')) return "'Silver Editorial', serif";
  return fontIdOrName;
};

export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select an option...',
  className = '',
  buttonClassName = '',
  menuClassName = '',
  align = 'left'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Normalize options to { value, label, badge, subtitle, fontFamily, isFont }
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'string') {
      return { value: opt, label: opt };
    }
    const val = opt.value ?? opt.id;
    const isFont = Boolean(opt.category || opt.preview_text || opt.filename);
    return {
      value: val,
      label: opt.label ?? opt.name ?? String(val),
      badge: opt.badge ?? opt.category,
      subtitle: opt.subtitle ?? opt.preview_text,
      fontFamily: opt.fontFamily ?? opt.font_family ?? opt.id ?? val,
      isFont
    };
  });

  const selectedOption = normalizedOptions.find((opt) => String(opt.value) === String(value));

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative inline-block text-left w-full ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={selectedOption?.label || (typeof value === 'string' ? value : '') || placeholder}
        className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-800 transition-all cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-800/40 focus:border-rose-800 active:scale-[0.99] ${
          isOpen ? 'ring-2 ring-rose-800/40 border-rose-800 bg-white' : ''
        } ${buttonClassName}`}
      >
        <span className="truncate flex items-center gap-2 flex-1 min-w-0">
          {selectedOption ? (
            <>
              <span className="truncate font-semibold text-slate-900">{selectedOption.label}</span>
              {selectedOption.badge && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200/60 shrink-0">
                  {selectedOption.badge}
                </span>
              )}
            </>
          ) : value ? (
            <span className="truncate font-semibold text-slate-900">{value}</span>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </span>

        <ChevronDown
          className={`w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-rose-800' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu Popup - 100% Solid Opaque Background (Zero Transparency) */}
      {isOpen && (
        <div
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-2xl shadow-slate-900/15 p-1.5 z-[70] animate-in fade-in-50 zoom-in-95 duration-100 ${
            menuClassName || 'w-full min-w-[260px] max-w-md'
          }`}
        >
          <div className="max-h-64 overflow-y-auto space-y-1 p-0.5 focus:outline-none slim-scrollbar">
            {normalizedOptions.length === 0 ? (
              <div className="px-3 py-3 text-xs text-slate-400 text-center font-medium">No options available</div>
            ) : (
              normalizedOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-rose-50/90 text-rose-950 font-bold border border-rose-200/80'
                        : 'text-slate-800 hover:bg-slate-50 hover:text-slate-950 border border-transparent'
                    }`}
                  >
                    <div className="flex flex-col truncate pr-1">
                      <div className="flex items-center gap-2 truncate">
                        <span className={`truncate ${isSelected ? 'text-rose-950 font-bold' : 'text-slate-900 font-semibold'}`}>
                          {opt.label}
                        </span>
                        {opt.badge && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                              isSelected
                                ? 'bg-rose-100 text-rose-900 border border-rose-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200/80'
                            }`}
                          >
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.subtitle && (
                        <span
                          style={
                            opt.isFont
                              ? {
                                  fontFamily: resolveFontCssFamily(opt.fontFamily),
                                  fontSize: '14px',
                                  lineHeight: '1.4'
                                }
                              : undefined
                          }
                          className={`truncate mt-0.5 ${
                            opt.isFont
                              ? isSelected
                                ? 'text-rose-900 font-medium'
                                : 'text-slate-800 font-medium'
                              : isSelected
                              ? 'text-rose-700/90 text-[11px] font-normal'
                              : 'text-slate-500 text-[11px] font-normal'
                          }`}
                        >
                          {opt.subtitle}
                        </span>
                      )}
                    </div>

                    {isSelected && <Check className="w-4 h-4 text-rose-800 shrink-0 stroke-[2.5]" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
