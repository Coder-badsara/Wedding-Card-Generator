import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Sliders, AlignLeft, AlignCenter, AlignRight, Check, Save, Sparkles, Loader2, ListTree, ChevronDown } from 'lucide-react';
import CustomSelect from '../common/CustomSelect';
import { formatWeddingLines } from '../../utils/textFormatter';

function LineCheckboxDropdown({ selectedValues = [], onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const availableOptions = [
    { id: 'names', label: 'Names (Primary Name)', short: 'Names' },
    { id: 'secondary_name', label: '2nd Name (Secondary Name)', short: '2nd Name' },
    { id: 'and', label: 'and (एवं / और)', short: 'and' },
    { id: 'with_family', label: 'with family (सपरिवार)', short: 'with family' },
    { id: 'and_family', label: 'and family (एवं सपरिवार)', short: 'and family' },
    { id: 'location', label: 'Location (स्थान/शहर)', short: 'Location' },
  ];

  useEffect(() => {
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  const toggleOption = (id) => {
    let next;
    if (selectedValues.includes(id)) {
      next = selectedValues.filter((v) => v !== id);
    } else {
      next = [...selectedValues, id];
    }
    onChange(next);
  };

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-1.5 px-2.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-800 transition-all cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-rose-800/40"
      >
        <span className="truncate flex items-center gap-1 flex-1 text-left min-w-0">
          {selectedValues.length === 0 ? (
            <span className="text-slate-400 font-normal text-[11px]">Select...</span>
          ) : (
            selectedValues.map((val) => {
              const opt = availableOptions.find((o) => o.id === val);
              return (
                <span
                  key={val}
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-900 border border-rose-200/80 shrink-0"
                >
                  {opt?.short || val}
                </span>
              );
            })
          )}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-rose-800' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-full min-w-[250px] bg-white rounded-2xl border border-slate-200 shadow-2xl shadow-slate-900/15 p-1.5 z-[80] animate-in fade-in-50 zoom-in-95 duration-100">
          <div className="p-1 space-y-0.5 max-h-56 overflow-y-auto slim-scrollbar">
            {availableOptions.map((opt) => {
              const checked = selectedValues.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleOption(opt.id)}
                  className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                    checked ? 'bg-rose-50/90 text-rose-950 font-bold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                        checked
                          ? 'bg-rose-800 border-rose-800 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {checked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span>{opt.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TypographyToolbar({
  fonts,
  targetLanguage = 'original',
  onLanguageChange,
  fontFamily,
  setFontFamily,
  fontSize,
  setFontSize,
  minFontSize,
  setMinFontSize,
  fontColor,
  setFontColor,
  textAlign,
  setTextAlign,
  prefixText,
  setPrefixText,
  sampleText,
  setSampleText,
  samplePreviewOptions = [],
  linePreference,
  setLinePreference,
  activeLine = 'line1',
  onSelectLine,
  onSaveSettings,
  onRenderBackendPreview,
  saving,
  renderingSample,
}) {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isCustomSample, setIsCustomSample] = useState(false);

  const handleLineChange = (lineKey, newVals) => {
    setLinePreference((prev) => ({
      ...(prev || {}),
      [lineKey]: newVals,
    }));
  };

  const filteredFonts = useMemo(() => {
    if (!fonts || !fonts.length) return [];
    if (targetLanguage === 'hindi') {
      return fonts.filter((f) => f.category === 'devanagari');
    }
    return fonts.filter((f) => f.category !== 'devanagari');
  }, [fonts, targetLanguage]);

  const isHindi =
    targetLanguage === 'hindi' ||
    (targetLanguage !== 'original' &&
      ((fontFamily || '').toLowerCase().includes('devanagari') ||
        ['gargi', 'eczar', 'aparajita', 'akshar', 'arya'].some((f) => (fontFamily || '').toLowerCase().includes(f)) ||
        /[\u0900-\u097F]/.test(sampleText)));

  const previewLines = useMemo(() => {
    return formatWeddingLines(sampleText, isHindi, linePreference);
  }, [sampleText, isHindi, linePreference]);

  const handleSave = async () => {
    await onSaveSettings();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const colorPresets = [
    { label: 'Royal Maroon', value: '#800020' },
    { label: 'Wedding Gold', value: '#D4AF37' },
    { label: 'Classic Crimson', value: '#991B1B' },
    { label: 'Royal Navy', value: '#1E3A8A' },
    { label: 'Deep Charcoal', value: '#18181B' },
  ];

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-serif">
          <Sliders className="w-4 h-4 text-rose-800" />
          Adjustment & Styling
        </h3>

        <div className="flex items-center gap-2">
          <button
            onClick={onRenderBackendPreview}
            disabled={renderingSample}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95"
            title="Render exact PyMuPDF output"
          >
            {renderingSample ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700" /> : <Sparkles className="w-3.5 h-3.5 text-amber-600" />}
            Exact PDF Preview
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer active:scale-95 ${
              saveSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-900 hover:bg-rose-950 text-white'
            }`}
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : saveSuccess ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {saveSuccess ? 'Saved' : 'Save Setup'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Font Family Selection */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Font Family
            </label>
            {onLanguageChange && (
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px]">
                <button
                  type="button"
                  onClick={() => onLanguageChange('hindi')}
                  className={`px-2 py-0.5 rounded-md font-bold cursor-pointer transition-all ${
                    targetLanguage === 'hindi'
                      ? 'bg-rose-900 text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  हिन्दी
                </button>
                <button
                  type="button"
                  onClick={() => onLanguageChange('original')}
                  className={`px-2 py-0.5 rounded-md font-bold cursor-pointer transition-all ${
                    targetLanguage === 'original'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  English
                </button>
              </div>
            )}
          </div>
          <CustomSelect
            value={fontFamily}
            onChange={setFontFamily}
            options={filteredFonts}
            placeholder="Choose font..."
          />
        </div>

        {/* Text Alignment */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Alignment
          </label>
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setTextAlign('left')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                textAlign === 'left' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <AlignLeft className="w-3.5 h-3.5 mr-1" /> Left
            </button>
            <button
              type="button"
              onClick={() => setTextAlign('center')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                textAlign === 'center' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <AlignCenter className="w-3.5 h-3.5 mr-1" /> Center
            </button>
            <button
              type="button"
              onClick={() => setTextAlign('right')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                textAlign === 'right' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <AlignRight className="w-3.5 h-3.5 mr-1" /> Right
            </button>
          </div>
        </div>

        {/* Font Size & Auto-Scale Min Size */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Font Size: <span className="font-extrabold text-slate-900">{fontSize} pt</span>
            </label>
            <span className="text-[10px] text-slate-400 font-medium">Min: {minFontSize} pt</span>
          </div>
          <input
            type="range"
            min="12"
            max="60"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="w-full accent-rose-900 cursor-pointer"
          />
        </div>

        {/* Color Picker & Presets */}
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Font Color
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              {colorPresets.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setFontColor(c.value)}
                  style={{ backgroundColor: c.value }}
                  className={`w-5 h-5 rounded-full border transition-all cursor-pointer ${
                    fontColor.toUpperCase() === c.value.toUpperCase()
                      ? 'scale-125 border-slate-900 shadow-md ring-2 ring-slate-400/40'
                      : 'border-slate-300 hover:scale-110'
                  }`}
                  title={c.label}
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <input
                type="color"
                value={fontColor}
                onChange={(e) => setFontColor(e.target.value)}
                className="w-6 h-6 rounded-md border border-slate-200 cursor-pointer p-0 bg-transparent shrink-0"
                title="Custom Hex Picker"
              />
              <input
                type="text"
                value={fontColor}
                onChange={(e) => setFontColor(e.target.value)}
                className="w-16 px-1.5 py-1 text-[11px] font-mono uppercase bg-slate-50 border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-800"
              />
            </div>
          </div>
        </div>

        {/* Prefix Text (Full width across box) */}
        <div className="sm:col-span-2">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Prefix Text (Optional)
          </label>
          <input
            type="text"
            value={prefixText}
            onChange={(e) => setPrefixText(e.target.value)}
            placeholder="e.g. श्रीमान् or To,"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-800 focus:bg-white transition-all shadow-xs"
          />
        </div>

        {/* Sample Guest Name for Live Test (Full length across box) */}
        <div className="sm:col-span-2">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Sample Preview Name
          </label>

          <CustomSelect
            value={isCustomSample ? '__custom__' : sampleText}
            onChange={(val) => {
              if (val === '__custom__') {
                setIsCustomSample(true);
              } else {
                setIsCustomSample(false);
                setSampleText(val);
              }
            }}
            options={samplePreviewOptions}
            placeholder="Select guest name to preview..."
            className="w-full"
            menuClassName="w-full left-0 right-0"
          />

          {isCustomSample && (
            <div className="mt-2.5 space-y-1">
              <input
                type="text"
                value={sampleText === '__custom__' ? '' : sampleText}
                onChange={(e) => setSampleText(e.target.value)}
                placeholder="Type custom preview name..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-800 focus:bg-white transition-all shadow-xs"
                autoFocus
              />
              <p className="text-[10px] text-slate-400">
                Type any custom test name. Pick from the dropdown above anytime to switch back.
              </p>
            </div>
          )}
        </div>

        {/* Line Preference (3 Lines Structure) */}
        <div className="sm:col-span-2 pt-3 border-t border-slate-100 space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 font-serif">
              <ListTree className="w-4 h-4 text-rose-800" />
              Line Preference
            </label>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Select elements for each line. Click any line box below or on the card to adjust position.
            </p>
          </div>

          {/* 3 Line Boxes - Aligned Grid Layout */}
          <div className="space-y-2">
            {/* 1st Line Box */}
            <div
              onClick={() => onSelectLine && onSelectLine('line1')}
              className={`relative z-30 p-2 rounded-2xl border transition-all cursor-pointer ${
                activeLine === 'line1'
                  ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-800/10 shadow-xs'
                  : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-16 sm:w-20 text-center py-2 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-rose-900 bg-rose-100/90 border border-rose-200/90 rounded-xl shrink-0">
                  1st Line
                </span>

                <LineCheckboxDropdown
                  selectedValues={linePreference?.line1 || ['names']}
                  onChange={(vals) => handleLineChange('line1', vals)}
                />

                <div className="w-28 sm:w-32 shrink-0">
                  <div
                    className="w-full text-center px-2 py-2 bg-white border border-slate-200 rounded-xl text-xs font-serif font-bold text-slate-800 truncate shadow-2xs"
                    title={previewLines[0] || 'Empty Line'}
                  >
                    {previewLines[0] || <span className="text-slate-300 italic font-sans text-[11px] font-normal">Empty</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* 2nd Line Box */}
            <div
              onClick={() => onSelectLine && onSelectLine('line2')}
              className={`relative z-20 p-2 rounded-2xl border transition-all cursor-pointer ${
                activeLine === 'line2'
                  ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-800/10 shadow-xs'
                  : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-16 sm:w-20 text-center py-2 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-amber-900 bg-amber-100/90 border border-amber-200/90 rounded-xl shrink-0">
                  2nd Line
                </span>

                <LineCheckboxDropdown
                  selectedValues={linePreference?.line2 || ['and']}
                  onChange={(vals) => handleLineChange('line2', vals)}
                />

                <div className="w-28 sm:w-32 shrink-0">
                  <div
                    className="w-full text-center px-2 py-2 bg-white border border-slate-200 rounded-xl text-xs font-serif font-bold text-slate-800 truncate shadow-2xs"
                    title={previewLines[1] || 'Empty Line'}
                  >
                    {previewLines[1] || <span className="text-slate-300 italic font-sans text-[11px] font-normal">Empty</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* 3rd Line Box */}
            <div
              onClick={() => onSelectLine && onSelectLine('line3')}
              className={`relative z-10 p-2 rounded-2xl border transition-all cursor-pointer ${
                activeLine === 'line3'
                  ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-800/10 shadow-xs'
                  : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-16 sm:w-20 text-center py-2 text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-emerald-900 bg-emerald-100/90 border border-emerald-200/90 rounded-xl shrink-0">
                  3rd Line
                </span>

                <LineCheckboxDropdown
                  selectedValues={linePreference?.line3 || ['with_family']}
                  onChange={(vals) => handleLineChange('line3', vals)}
                />

                <div className="w-28 sm:w-32 shrink-0">
                  <div
                    className="w-full text-center px-2 py-2 bg-white border border-slate-200 rounded-xl text-xs font-serif font-bold text-slate-800 truncate shadow-2xs"
                    title={previewLines[2] || 'Empty Line'}
                  >
                    {previewLines[2] || <span className="text-slate-300 italic font-sans text-[11px] font-normal">Empty</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
