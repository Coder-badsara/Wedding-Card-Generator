import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  Sparkles,
  Sliders,
  Send,
  Download,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Archive,
  ArrowRight,
  Eye,
  Check,
  Trash2,
  Layers,
  PlusCircle
} from 'lucide-react';
import { getProject, updateProject, getProjectBatches, createBatch, renderSample, getFonts, formatMediaUrl, transliterateText } from '../api/projectsApi';
import { getBatchStatus, retryBatch, deleteBatch, deleteCard } from '../api/batchesApi';
import VisualCardCanvas from '../components/studio/VisualCardCanvas';
import TypographyToolbar from '../components/studio/TypographyToolbar';
import CustomSelect from '../components/common/CustomSelect';
import ConfirmModal from '../components/common/ConfirmModal';
import {
  saveBatchToStorage,
  getBatchesFromStorage,
  deleteBatchFromStorage,
  deleteCardFromStorage,
  cacheBatchArtifacts,
  downloadBatchZipArchive,
  downloadOrViewCard
} from '../utils/pdfStorage';

export default function CardStudioPage({ projectId }) {
  const getInitialCachedProject = () => {
    try {
      const raw = localStorage.getItem(`wedding_cached_project_${projectId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  const initialProject = getInitialCachedProject();

  const [project, setProject] = useState(initialProject);
  const [batches, setBatches] = useState([]);
  const [fonts, setFonts] = useState(() => {
    try {
      const raw = localStorage.getItem('wedding_cached_fonts');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(!initialProject);
  const [error, setError] = useState(null);

  // Custom Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Delete',
    confirmVariant: 'danger',
    isLoading: false,
    onConfirm: null,
  });

  // Active Tab: 'generate' or 'editor'
  const [activeTab, setActiveTab] = useState('generate');

  // Studio Settings State initialized from initialProject if available
  const [boxCoords, setBoxCoords] = useState(() => ({
    x: initialProject?.box_x ?? 0.58,
    y: initialProject?.box_y ?? 0.55,
    w: initialProject?.box_width ?? 0.32,
    h: initialProject?.box_height ?? 0.15,
  }));
  const [fontFamily, setFontFamily] = useState(
    initialProject?.font_family || 'NotoSansDevanagari-Regular'
  );
  const [fontSize, setFontSize] = useState(initialProject?.font_size || 20);
  const [minFontSize, setMinFontSize] = useState(initialProject?.min_font_size || 12);
  const [fontColor, setFontColor] = useState(initialProject?.font_color || '#800020');
  const [textAlign, setTextAlign] = useState(initialProject?.text_align || 'center');
  const [prefixText, setPrefixText] = useState(initialProject?.prefix_text || '');
  const [sampleText, setSampleText] = useState('अमित शर्मा सपरिवार');
  const [linePreference, setLinePreference] = useState(initialProject?.line_preference || {});
  const [lineBoxes, setLineBoxes] = useState(() => {
    if (initialProject?.line_boxes && Object.keys(initialProject.line_boxes).length > 0) {
      return initialProject.line_boxes;
    }
    return {
      line1: { x: 0.58, y: 0.52, w: 0.35, h: 0.045 },
      line2: { x: 0.58, y: 0.575, w: 0.35, h: 0.045 },
      line3: { x: 0.58, y: 0.63, w: 0.35, h: 0.045 },
    };
  });
  const [activeLine, setActiveLine] = useState('line1');

  // Authoritative Preview State
  const [backendPreviewUrl, setBackendPreviewUrl] = useState(null);
  const [renderingSample, setRenderingSample] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Generate Tab State
  const [targetBatchId, setTargetBatchId] = useState('new'); // 'new' or UUID of existing batch
  const [batchLabel, setBatchLabel] = useState('');
  const [targetLanguage, setTargetLanguage] = useState(() => {
    const f = initialProject?.font_family || '';
    const isDev =
      f.toLowerCase().includes('devanagari') ||
      ['gargi', 'eczar', 'aparajita', 'akshar', 'arya'].some((k) => f.toLowerCase().includes(k));
    return isDev ? 'hindi' : 'original';
  });
  const [transliterating, setTransliterating] = useState(false);
  const [rawGuestNames, setRawGuestNames] = useState('1. ');
  const textareaRef = useRef(null);
  const [generating, setGenerating] = useState(false);
  const [simulatedProgress, setSimulatedProgress] = useState(0);
  const [simulatedStage, setSimulatedStage] = useState('');
  const progressTimerRef = useRef(null);
  const [activeBatch, setActiveBatch] = useState(null);
  const [isPolling, setIsPolling] = useState(false);

  const startSimulatedProgress = () => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    setSimulatedProgress(8);
    setSimulatedStage('Preparing card layouts...');

    let current = 8;
    progressTimerRef.current = setInterval(() => {
      if (current < 25) {
        current += Math.floor(Math.random() * 4) + 3; // +3 to +6%
        setSimulatedStage('Preparing individual card layouts...');
      } else if (current < 55) {
        current += Math.floor(Math.random() * 3) + 2; // +2 to +4%
        setSimulatedStage('Rendering high-resolution typography...');
      } else if (current < 80) {
        current += Math.floor(Math.random() * 2) + 1; // +1 to +2%
        setSimulatedStage('Formatting guest lines & positions...');
      } else if (current < 94) {
        current += 1;
        setSimulatedStage('Finalizing card batch...');
      }
      if (current > 94) current = 94;
      setSimulatedProgress(current);
    }, 700);
  };

  const stopSimulatedProgress = (isSuccess = true) => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    if (isSuccess) {
      setSimulatedProgress(100);
      setSimulatedStage('Cards Generated Successfully!');
    } else {
      setSimulatedProgress(0);
      setSimulatedStage('');
    }
  };

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  const fetchProjectData = useCallback(async () => {
    // 1. Immediately load any existing batches from IndexedDB cache
    let cachedBatches = [];
    try {
      cachedBatches = await getBatchesFromStorage(projectId);
      if (cachedBatches && cachedBatches.length > 0) {
        setBatches(cachedBatches);
        setActiveBatch((prev) => prev || cachedBatches[0]);
      }
    } catch (e) {
      console.warn('[CardStudioPage] IndexedDB load error:', e);
    }

    try {
      const [projData, batchesData, fontsData] = await Promise.all([
        getProject(projectId),
        getProjectBatches(projectId),
        getFonts(),
      ]);

      setProject(projData);
      setFonts(fontsData);

      try {
        localStorage.setItem(`wedding_cached_project_${projectId}`, JSON.stringify(projData));
        localStorage.setItem('wedding_cached_fonts', JSON.stringify(fontsData));
      } catch (e) {}

      // Merge server batches with cached batches
      const serverIds = new Set((batchesData || []).map((b) => b.id));
      const cachedOnly = (cachedBatches || []).filter((b) => !serverIds.has(b.id));
      const mergedBatches = [...(batchesData || []), ...cachedOnly];

      setBatches(mergedBatches);

      setBoxCoords({
        x: projData.box_x,
        y: projData.box_y,
        w: projData.box_width,
        h: projData.box_height,
      });
      const initialFont = projData.font_family || 'NotoSansDevanagari-Regular';
      setFontFamily(initialFont);
      const isInitialDevanagari =
        (initialFont || '').toLowerCase().includes('devanagari') ||
        ['gargi', 'eczar', 'aparajita', 'akshar', 'arya'].some((f) => (initialFont || '').toLowerCase().includes(f));
      if (!isInitialDevanagari) {
        setTargetLanguage('original');
      } else {
        setTargetLanguage('hindi');
      }
      setFontSize(projData.font_size || 20);
      setMinFontSize(projData.min_font_size || 12);
      setFontColor(projData.font_color || '#800020');
      setTextAlign(projData.text_align || 'center');
      setPrefixText(projData.prefix_text || '');
      if (projData.line_preference && Object.keys(projData.line_preference).length > 0) {
        setLinePreference(projData.line_preference);
      }
      if (projData.line_boxes && Object.keys(projData.line_boxes).length > 0) {
        setLineBoxes(projData.line_boxes);
      } else {
        const bx = projData.box_x || 0.58;
        const by = projData.box_y || 0.52;
        const bw = projData.box_width || 0.35;
        const bh = projData.box_height || 0.15;
        const lh = Number((bh / 3).toFixed(4));
        setLineBoxes({
          line1: { x: bx, y: by, w: bw, h: lh },
          line2: { x: bx, y: Number((by + lh + 0.005).toFixed(4)), w: bw, h: lh },
          line3: { x: bx, y: Number((by + lh * 2 + 0.01).toFixed(4)), w: bw, h: lh },
        });
      }

      // If there are batches, select the latest one
      if (mergedBatches.length > 0) {
        setActiveBatch((prev) => {
          const found = mergedBatches.find((b) => b.id === prev?.id);
          return found || mergedBatches[0];
        });
        if (mergedBatches[0].status === 'PROCESSING' || mergedBatches[0].status === 'PENDING') {
          setIsPolling(true);
        }
      }

      // Sync server batches to IndexedDB in background
      for (const b of (batchesData || [])) {
        saveBatchToStorage(b);
        if (b.status === 'COMPLETED') {
          cacheBatchArtifacts(b, formatMediaUrl);
        }
      }
    } catch (err) {
      setProject((current) => {
        if (!current) {
          setError('Connecting to card workspace... Getting things ready.');
          setTimeout(fetchProjectData, 4000);
        }
        return current;
      });
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  // Polling for active batch progress
  useEffect(() => {
    if (!isPolling || !activeBatch) return;

    const interval = setInterval(async () => {
      try {
        const statusData = await getBatchStatus(activeBatch.id);
        setActiveBatch((prev) => ({ ...prev, ...statusData }));

        if (statusData.status === 'COMPLETED' || statusData.status === 'FAILED') {
          setIsPolling(false);
          const updatedBatches = await getProjectBatches(projectId);
          setBatches(updatedBatches);
          const fullBatch = updatedBatches.find((b) => b.id === activeBatch.id);
          if (fullBatch) {
            setActiveBatch(fullBatch);
            saveBatchToStorage(fullBatch);
            if (fullBatch.status === 'COMPLETED') {
              cacheBatchArtifacts(fullBatch, formatMediaUrl);
            }
          }
        }
      } catch (err) {
        console.error('Polling error', err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPolling, activeBatch?.id, projectId]);

  // Clean guest name lines (strips leading "1.", "1 -", etc.)
  const cleanGuestNames = (text) => {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(/^[\d]+[\.\)\-\s]+/, '').trim())
      .filter(Boolean)
      .join('\n');
  };

  const parsedGuestList = cleanGuestNames(rawGuestNames).split('\n').filter(Boolean);
  const guestCount = parsedGuestList.length;

  // Batch Target Options (Create New vs Add-on to Existing Past Batch)
  const batchTargetOptions = useMemo(() => [
    {
      value: 'new',
      label: '+ Create New Batch',
      badge: 'New Batch',
      subtitle: 'Start a fresh batch starting from Card 1'
    },
    ...batches.map((b) => {
      const count = b.cards?.length ?? b.total_guests ?? 0;
      const cleanName = (b.batch_name || 'Untitled').replace(/Batch\s*#\s*/i, 'Batch ');
      return {
        value: b.id,
        label: cleanName.startsWith(`Batch ${b.batch_number}`) ? cleanName : `Batch ${b.batch_number} - ${cleanName}`,
        badge: `${count} ${count === 1 ? 'card' : 'cards'}`,
        subtitle: `Add-on: New cards continue from Card ${count + 1}`
      };
    })
  ], [batches]);

  const selectedExistingBatch = useMemo(() => {
    if (targetBatchId === 'new') return null;
    return batches.find((b) => b.id === targetBatchId) || null;
  }, [targetBatchId, batches]);

  const selectedExistingBatchCardsCount = selectedExistingBatch
    ? (selectedExistingBatch.cards?.length ?? selectedExistingBatch.total_guests ?? 0)
    : 0;

  // Dropdown options for "Sample Preview Name" in Tab 2 (Adjustment & Styling)
  // Shows ONLY:
  // 1. "✏️ Type Custom Name..." (1st place)
  // 2. Currently selected preview name (2nd place)
  // 3. Names from THAT particular active batch only + entered names in guest list
  const guestPreviewOptions = useMemo(() => {
    // 1st item: Type Custom Name...
    const customItem = {
      value: '__custom__',
      label: '✏️ Type Custom Name...',
      badge: 'Custom',
      subtitle: 'Type any test name manually'
    };

    // Gather candidate names from:
    // (A) That particular active batch only
    // (B) Entered names in current guest list (not yet generated)
    const candidates = [];
    const seenValues = new Set();
    seenValues.add('__custom__');

    // From active batch only
    if (activeBatch && activeBatch.cards) {
      activeBatch.cards.forEach((c) => {
        const name = c.guest_name?.trim();
        if (name && !seenValues.has(name)) {
          seenValues.add(name);
          candidates.push({
            value: name,
            label: name,
            badge: `Batch ${activeBatch.batch_number}`,
            subtitle: `Generated in Batch ${activeBatch.batch_number}`
          });
        }
      });
    }

    // From entered guest list (not yet generated)
    const currentList = rawGuestNames
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    currentList.forEach((rawLine, idx) => {
      const clean = rawLine.replace(/^[\d]+[\.\)\-\:\s]+/, '').trim();
      if (clean && !seenValues.has(clean)) {
        seenValues.add(clean);
        candidates.push({
          value: clean,
          label: rawLine,
          badge: `Guest ${idx + 1}`,
          subtitle: 'Entered in guest list (not yet generated)'
        });
      }
    });

    // Determine 2nd item (the currently selected one)
    let selectedItem = null;
    const remainingItems = [];

    const activeText = sampleText?.trim();
    if (activeText && activeText !== '__custom__') {
      const matchIdx = candidates.findIndex((c) => c.value === activeText);
      if (matchIdx !== -1) {
        selectedItem = {
          ...candidates[matchIdx],
          subtitle: 'Currently active preview'
        };
        candidates.forEach((c, i) => {
          if (i !== matchIdx) remainingItems.push(c);
        });
      } else {
        selectedItem = {
          value: activeText,
          label: activeText,
          badge: 'Selected',
          subtitle: 'Currently active preview'
        };
        remainingItems.push(...candidates);
      }
    } else {
      if (candidates.length > 0) {
        selectedItem = candidates[0];
        remainingItems.push(...candidates.slice(1));
      }
    }

    const result = [customItem];
    if (selectedItem) {
      result.push(selectedItem);
    }
    result.push(...remainingItems);

    return result;
  }, [rawGuestNames, activeBatch, sampleText]);

  // Smart keyboard handlers for auto-populating serial numbers
  const handleGuestNamesKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const textarea = textareaRef.current || e.target;
      const { selectionStart, selectionEnd, value } = textarea;

      if (selectionStart !== selectionEnd) return;

      const textBeforeCursor = value.substring(0, selectionStart);
      const textAfterCursor = value.substring(selectionEnd);
      const lastNewLineIndex = textBeforeCursor.lastIndexOf('\n');
      const currentLine = lastNewLineIndex === -1
        ? textBeforeCursor
        : textBeforeCursor.substring(lastNewLineIndex + 1);

      // Check if current line starts with number e.g. "1. ", "02. ", "3) "
      const numMatch = currentLine.match(/^(\s*)(\d+)[\.\)]\s*(.*)$/);

      if (numMatch) {
        e.preventDefault();
        const indent = numMatch[1];
        const currentNum = parseInt(numMatch[2], 10);
        const lineContent = numMatch[3].trim();

        // If user pressed Enter on an empty line like "2. " with nothing typed:
        if (!lineContent) {
          // Remove the empty bullet
          const lineStartPos = lastNewLineIndex === -1 ? 0 : lastNewLineIndex + 1;
          const newValue = value.substring(0, lineStartPos) + textAfterCursor;
          setRawGuestNames(newValue);
          requestAnimationFrame(() => {
            if (textareaRef.current) {
              textareaRef.current.selectionStart = textareaRef.current.selectionEnd = lineStartPos;
            }
          });
          return;
        }

        // Increment to next serial number
        const nextNum = currentNum + 1;
        const insertText = `\n${indent}${nextNum}. `;
        const newValue = textBeforeCursor + insertText + textAfterCursor;
        const newCursorPos = selectionStart + insertText.length;

        setRawGuestNames(newValue);
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newCursorPos;
          }
        });
        return;
      } else {
        // Line didn't have a number, calculate next number
        const lines = textBeforeCursor.split('\n');
        const nextNum = lines.length + 1;
        e.preventDefault();
        const insertText = `\n${nextNum}. `;
        const newValue = textBeforeCursor + insertText + textAfterCursor;
        const newCursorPos = selectionStart + insertText.length;

        setRawGuestNames(newValue);
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newCursorPos;
          }
        });
        return;
      }
    }

    if (e.key === 'Backspace') {
      const textarea = textareaRef.current || e.target;
      const { selectionStart, selectionEnd, value } = textarea;
      if (selectionStart !== selectionEnd) return;

      const textBeforeCursor = value.substring(0, selectionStart);
      const textAfterCursor = value.substring(selectionEnd);
      const lastNewLineIndex = textBeforeCursor.lastIndexOf('\n');
      const currentLine = lastNewLineIndex === -1
        ? textBeforeCursor
        : textBeforeCursor.substring(lastNewLineIndex + 1);

      // If on an empty bullet like "2. " (where number > 1), backspace removes the line cleanly
      const emptyBulletMatch = currentLine.match(/^(\s*)(\d+)[\.\)]\s*$/);
      if (emptyBulletMatch && parseInt(emptyBulletMatch[2], 10) > 1) {
        e.preventDefault();
        const lineStartPos = lastNewLineIndex === -1 ? 0 : lastNewLineIndex;
        const newValue = value.substring(0, lineStartPos) + textAfterCursor;
        setRawGuestNames(newValue);
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = lineStartPos;
          }
        });
        return;
      }
    }
  };

  const handleGuestNamesFocus = () => {
    if (!rawGuestNames || !rawGuestNames.trim() || rawGuestNames === '1. ') {
      if (!rawGuestNames || !rawGuestNames.trim()) {
        setRawGuestNames('1. ');
      }
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = 3;
        }
      });
    }
  };

  const handleGuestNamesPaste = (e) => {
    const pasteData = e.clipboardData?.getData('text');
    if (pasteData && pasteData.includes('\n')) {
      const rawLines = pasteData.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const hasNumbering = rawLines.some((l) => /^\d+[\.\)\-]/.test(l));
      if (!hasNumbering) {
        e.preventDefault();
        const formatted = rawLines.map((l, i) => `${i + 1}. ${l}`).join('\n');
        const textarea = textareaRef.current || e.target;
        const { selectionStart, selectionEnd, value } = textarea;
        const newValue = value.substring(0, selectionStart) + formatted + value.substring(selectionEnd);
        setRawGuestNames(newValue);
        const newCursor = selectionStart + formatted.length;
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = newCursor;
          }
        });
      }
    }
  };

  const filteredFonts = useMemo(() => {
    if (targetLanguage === 'hindi') {
      return fonts.filter((f) => f.category === 'devanagari');
    }
    return fonts.filter((f) => f.category !== 'devanagari');
  }, [fonts, targetLanguage]);

  const handleLanguageChange = async (newLang) => {
    setTargetLanguage(newLang);
    const isDevanagari =
      (fontFamily || '').toLowerCase().includes('devanagari') ||
      ['gargi', 'eczar', 'aparajita', 'akshar', 'arya'].some((f) => (fontFamily || '').toLowerCase().includes(f));

    if (newLang === 'hindi' && !isDevanagari) {
      const defaultHindi = fonts.find((f) => f.category === 'devanagari')?.id || 'Arya';
      setFontFamily(defaultHindi);
      try {
        await updateProject(projectId, { font_family: defaultHindi });
      } catch (err) {
        console.error('Failed to auto-update font family on language change:', err);
      }
    } else if (newLang === 'original' && isDevanagari) {
      const defaultEnglish = fonts.find((f) => f.category !== 'devanagari')?.id || 'PlayfairDisplay-Regular';
      setFontFamily(defaultEnglish);
      try {
        await updateProject(projectId, { font_family: defaultEnglish });
      } catch (err) {
        console.error('Failed to auto-update font family on language change:', err);
      }
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const updated = await updateProject(projectId, {
        box_x: boxCoords.x,
        box_y: boxCoords.y,
        box_width: boxCoords.w,
        box_height: boxCoords.h,
        font_family: fontFamily,
        font_size: fontSize,
        min_font_size: minFontSize,
        font_color: fontColor,
        text_align: textAlign,
        prefix_text: prefixText,
        line_preference: linePreference,
        line_boxes: lineBoxes,
        target_language: targetLanguage,
      });
      setProject(updated);
      try {
        localStorage.setItem(`wedding_cached_project_${projectId}`, JSON.stringify(updated));
      } catch (e) {}
    } catch (err) {
      alert('Failed to save settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRenderBackendPreview = async () => {
    setRenderingSample(true);
    try {
      const blobUrl = await renderSample(projectId, {
        sample_text: sampleText,
        box_x: boxCoords.x,
        box_y: boxCoords.y,
        box_width: boxCoords.w,
        box_height: boxCoords.h,
        font_family: fontFamily,
        font_size: fontSize,
        min_font_size: minFontSize,
        font_color: fontColor,
        text_align: textAlign,
        prefix_text: prefixText,
        line_preference: linePreference,
        line_boxes: lineBoxes,
        target_language: targetLanguage,
      });
      setBackendPreviewUrl(blobUrl);
    } catch (err) {
      alert('Failed to render authoritative preview.');
    } finally {
      setRenderingSample(false);
    }
  };

  const hasHindiText = useMemo(() => {
    return /[\u0900-\u097F]/.test(rawGuestNames);
  }, [rawGuestNames]);

  const handleToggleTransliterate = async () => {
    if (!rawGuestNames || !rawGuestNames.trim() || rawGuestNames === '1. ') return;
    setTransliterating(true);
    try {
      if (hasHindiText) {
        // Hindi -> English: only convert the typed names in the textarea
        const converted = await transliterateText(rawGuestNames, 'to_english');
        setRawGuestNames(converted);
      } else {
        // English -> Hindi: only convert the typed names in the textarea
        const converted = await transliterateText(rawGuestNames, 'to_hindi');
        setRawGuestNames(converted);
      }
    } catch (err) {
      alert('Failed to convert language.');
    } finally {
      setTransliterating(false);
    }
  };

  const handleGenerate = async () => {
    if (guestCount === 0) return;

    setGenerating(true);
    startSimulatedProgress();

    try {
      const cleanedNames = cleanGuestNames(rawGuestNames);
      const payload = {
        guest_names: cleanedNames,
        target_language: targetLanguage,
        ...(targetBatchId !== 'new'
          ? { batch_id: targetBatchId }
          : { batch_name: batchLabel.trim() || `Batch ${batches.length + 1}` })
      };

      const responseBatch = await createBatch(projectId, payload);

      stopSimulatedProgress(true);
      await new Promise((res) => setTimeout(res, 350));

      setActiveBatch(responseBatch);
      saveBatchToStorage(responseBatch);
      setTargetBatchId(responseBatch.id);
      setBatchLabel('');
      setRawGuestNames('1. ');
      setIsPolling(true);
      const updatedBatches = await getProjectBatches(projectId);
      setBatches(updatedBatches);
      for (const b of updatedBatches) {
        saveBatchToStorage(b);
      }
    } catch (err) {
      stopSimulatedProgress(false);
      alert(err.response?.data?.error || err.response?.data?.batch_id || 'Failed to generate cards. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteBatch = (batchId) => {
    const batchToDelete = batches.find((b) => b.id === batchId);
    if (!batchToDelete) return;

    const cleanBatchName = (batchToDelete.batch_name || 'Untitled').replace(/Batch\s*#\s*/i, 'Batch ');
    const count = batchToDelete.total_guests || 0;
    const cardText = count === 1 ? '1 generated card' : `${count} generated cards`;

    setConfirmModal({
      isOpen: true,
      title: `Delete Batch ${batchToDelete.batch_number}?`,
      message: `Delete Batch ${batchToDelete.batch_number} (${cleanBatchName}) and all its ${cardText}? This action cannot be undone.`,
      confirmText: 'Delete Batch',
      confirmVariant: 'danger',
      isLoading: false,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }));
        try {
          await deleteBatch(batchId).catch((e) => console.warn('Server deleteBatch error:', e));
          await deleteBatchFromStorage(batchId);
          const remaining = batches.filter((b) => b.id !== batchId);
          setBatches(remaining);
          if (activeBatch?.id === batchId) {
            setActiveBatch(remaining[0] || null);
            setIsPolling(false);
          }
          if (targetBatchId === batchId) {
            setTargetBatchId(remaining[0]?.id || 'new');
          }
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        } catch (err) {
          alert('Failed to delete batch. Please try again.');
          setConfirmModal((prev) => ({ ...prev, isLoading: false }));
        }
      },
    });
  };

  const handleDeleteCard = (cardId, guestName) => {
    setConfirmModal({
      isOpen: true,
      title: `Delete Personalized Card?`,
      message: `Are you sure you want to delete the personalized card for "${guestName}"?`,
      confirmText: 'Delete Card',
      confirmVariant: 'danger',
      isLoading: false,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isLoading: true }));
        try {
          await deleteCard(cardId).catch((e) => console.warn('Server deleteCard error:', e));
          await deleteCardFromStorage(cardId, activeBatch?.id);
          if (activeBatch && activeBatch.cards) {
            const remainingCards = activeBatch.cards.filter((c) => c.id !== cardId);
            const updatedBatch = {
              ...activeBatch,
              cards: remainingCards,
              total_guests: remainingCards.length,
              processed_guests: remainingCards.length,
            };
            setActiveBatch(updatedBatch);
            setBatches((prev) =>
              prev.map((b) => (b.id === activeBatch.id ? updatedBatch : b))
            );
            saveBatchToStorage(updatedBatch);
          }
          setConfirmModal((prev) => ({ ...prev, isOpen: false, isLoading: false }));
        } catch (err) {
          alert('Failed to delete card. Please try again.');
          setConfirmModal((prev) => ({ ...prev, isLoading: false }));
        }
      },
    });
  };

  if (loading && !project) {
    return (
      <div className="py-32 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 text-rose-800 animate-spin mb-3" />
        <p className="text-sm font-semibold">Opening Workspace...</p>
      </div>
    );
  }

  if ((error || !project) && !project) {
    return (
      <div className="max-w-md mx-auto py-32 px-4 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-800 flex items-center justify-center mx-auto border border-rose-200/60 shadow-sm">
          <Loader2 className="w-6 h-6 animate-spin text-rose-800" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-800">Connecting to Card Workspace...</h3>
          <p className="text-xs text-slate-500">
            Getting your card studio ready. This usually takes just a few seconds.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Workspace Header & Segmented Tab Navigation */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 font-serif">{project.title}</h2>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {project.total_pages} Pages
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Card Workspace • {batches.length} {batches.length === 1 ? 'batch generated' : 'batches generated'}
          </p>
        </div>

        {/* Apple/Linear style modern Segmented Control Tabs */}
        <div className="inline-flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('generate')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'generate'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Send className="w-3.5 h-3.5 text-rose-800" />
            Generate Cards
          </button>

          <button
            onClick={() => {
              setActiveTab('editor');
              if (
                sampleText === 'अमित शर्मा एवं सपरिवार' &&
                guestPreviewOptions.length > 1
              ) {
                setSampleText(guestPreviewOptions[1].value);
              }
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'editor'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-amber-600" />
            Card Editor & Placement
          </button>
        </div>
      </div>

      {/* TAB 1: GENERATE CARDS (The clean, focused main page requested by user) */}
      {activeTab === 'generate' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Input Box to Enter Names (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-serif">Enter Guest Names</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Type or paste names. Supports numbering (e.g. 1. Rajesh Sharma).
                </p>
              </div>

              <span className="text-xs font-bold px-3 py-1 rounded-full bg-rose-50 text-rose-900 border border-rose-200">
                {guestCount} {guestCount === 1 ? 'Guest' : 'Guests'}
              </span>
            </div>

            {/* Batch Target (Create New vs Add-on to Existing Past Batch) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Target Batch
                </label>
                <span className="text-[11px] font-semibold text-slate-500">
                  {targetBatchId === 'new' ? 'New Batch' : 'Add-on to Existing'}
                </span>
              </div>

              <CustomSelect
                value={targetBatchId}
                onChange={(val) => {
                  setTargetBatchId(val);
                  if (val !== 'new') {
                    const selected = batches.find((b) => b.id === val);
                    if (selected) {
                      setActiveBatch(selected);
                      setIsPolling(selected.status === 'PROCESSING' || selected.status === 'PENDING');
                    }
                  }
                }}
                options={batchTargetOptions}
                placeholder="Choose target batch..."
              />

              {targetBatchId === 'new' ? (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 mt-2">
                    Batch Label (Optional)
                  </label>
                  <input
                    type="text"
                    value={batchLabel}
                    onChange={(e) => setBatchLabel(e.target.value)}
                    placeholder="e.g. Friends Jaipur, Relatives, VIPs"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-800 focus:bg-white"
                  />
                </div>
              ) : (
                <div className="p-2.5 px-3.5 rounded-xl bg-amber-50/90 border border-amber-200/80 text-xs text-amber-950 flex items-center gap-2 mt-2">
                  <Layers className="w-4 h-4 text-amber-700 shrink-0" />
                  <span className="font-semibold truncate">
                    Adding new cards to <span className="font-bold text-amber-900 underline decoration-amber-300 underline-offset-2">{(selectedExistingBatch?.batch_name || `Batch ${selectedExistingBatch?.batch_number}`).replace(/Batch\s*#\s*/i, 'Batch ')}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Output Language Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Output Card Language
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleLanguageChange('hindi')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    targetLanguage === 'hindi'
                      ? 'bg-rose-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>हिन्दी (Hindi / Devanagari)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange('original')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    targetLanguage === 'original'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>English (As Typed)</span>
                </button>
              </div>
            </div>

            {/* Font Family Selector in Tab 1 */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Card Font Family
                </label>
                <button
                  type="button"
                  onClick={() => setActiveTab('editor')}
                  className="text-[11px] font-semibold text-rose-800 hover:text-rose-950 hover:underline cursor-pointer"
                >
                  Adjust Size & Position →
                </button>
              </div>
              <CustomSelect
                value={fontFamily}
                onChange={async (newFont) => {
                  setFontFamily(newFont);
                  try {
                    await updateProject(projectId, { font_family: newFont });
                  } catch (err) {
                    console.error('Failed to auto-save font family:', err);
                  }
                }}
                options={filteredFonts}
                placeholder="Choose font..."
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Guest List (One per line)
                </label>

                {/* Bidirectional Convert to Hindi / English Button */}
                <button
                  type="button"
                  onClick={handleToggleTransliterate}
                  disabled={transliterating}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  title={hasHindiText ? 'Convert Hindi names back to English' : 'Converts English names to Hindi Devanagari immediately'}
                >
                  {transliterating ? (
                    <Loader2 className="w-3 h-3 animate-spin text-rose-800" />
                  ) : (
                    <Sparkles className="w-3 h-3 text-amber-600" />
                  )}
                  {transliterating
                    ? 'Converting...'
                    : hasHindiText
                    ? 'Convert to English (English करें)'
                    : 'Convert to Hindi (हिन्दी करें)'}
                </button>
              </div>

              <textarea
                ref={textareaRef}
                rows={9}
                value={rawGuestNames}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setRawGuestNames('1. ');
                    requestAnimationFrame(() => {
                      if (textareaRef.current) {
                        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = 3;
                      }
                    });
                  } else {
                    setRawGuestNames(val);
                  }
                }}
                onKeyDown={handleGuestNamesKeyDown}
                onFocus={handleGuestNamesFocus}
                onClick={() => {
                  if (rawGuestNames === '1. ') {
                    requestAnimationFrame(() => {
                      if (textareaRef.current) {
                        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = 3;
                      }
                    });
                  }
                }}
                onPaste={handleGuestNamesPaste}
                placeholder="1. "
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-800 focus:bg-white resize-y leading-relaxed slim-scrollbar"
              />
            </div>

            <div className="pt-2">
              <button
                onClick={handleGenerate}
                disabled={generating || isPolling || guestCount === 0}
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-rose-900 via-rose-950 to-slate-950 hover:from-rose-800 hover:to-slate-900 text-white font-bold text-sm shadow-md transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {generating || isPolling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                    <span>
                      Generating Cards ({generating ? `${simulatedProgress}%` : `${Math.round(((activeBatch?.processed_guests || 0) / (activeBatch?.total_guests || 1)) * 100)}%`})...
                    </span>
                  </>
                ) : targetBatchId !== 'new' ? (
                  <>
                    <PlusCircle className="w-4 h-4 text-amber-300" />
                    <span>
                      Add {guestCount} {guestCount === 1 ? 'Card' : 'Cards'} to "{(selectedExistingBatch?.batch_name || `Batch ${selectedExistingBatch?.batch_number}`).replace(/Batch\s*#\s*/i, 'Batch ')}"
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Generate {guestCount} Invitation {guestCount === 1 ? 'Card' : 'Cards'}</span>
                  </>
                )}
              </button>
              <p className="text-center text-[11px] text-slate-400 mt-2">
                Serial-numbered PDFs will be generated and bundled in a single ZIP.
              </p>
            </div>
          </div>

          {/* Right Column: Generation Status & Download Results (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Immediate Progress Indicator when starting a generation */}
            {generating && !activeBatch && (
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-mono">
                      Generating
                    </span>
                    <h4 className="text-base font-bold text-slate-900 font-serif">
                      New Batch
                    </h4>
                  </div>
                </div>

                <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-4 space-y-2.5 shadow-sm">
                  <div className="flex justify-between items-center text-xs font-bold text-amber-950">
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700" />
                      {simulatedStage || 'Generating individual PDFs...'}
                    </span>
                    <span className="font-mono text-amber-800">{simulatedProgress}%</span>
                  </div>
                  <div className="w-full h-3 bg-amber-200/60 rounded-full overflow-hidden shadow-inner">
                    <div
                      style={{ width: `${simulatedProgress}%` }}
                      className="h-full bg-gradient-to-r from-amber-500 via-rose-700 to-rose-950 rounded-full transition-all duration-300"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeBatch ? (
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-mono">
                        Batch {activeBatch.batch_number}
                      </span>
                      <h4 className="text-base font-bold text-slate-900 font-serif">
                        {(activeBatch.batch_name || `Batch ${activeBatch.batch_number}`).replace(/Batch\s*#\s*/i, 'Batch ')}
                      </h4>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {activeBatch.total_guests} {activeBatch.total_guests === 1 ? 'card' : 'cards'} • Created on{' '}
                      {new Date(activeBatch.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeBatch.status === 'COMPLETED' && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Completed
                      </span>
                    )}
                    {activeBatch.status === 'PROCESSING' && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                        Generating ({activeBatch.processed_guests || 0}/{activeBatch.total_guests || 0})
                      </span>
                    )}
                    {activeBatch.status === 'FAILED' && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-red-50 text-red-800 border border-red-200">
                        <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                        Failed
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteBatch(activeBatch.id)}
                      className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-200 cursor-pointer ml-1"
                      title="Delete this batch and all its cards"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar (while processing or generating) */}
                {(generating || activeBatch.status === 'PROCESSING' || activeBatch.status === 'PENDING') && (
                  <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-4 space-y-2.5 shadow-sm">
                    <div className="flex justify-between items-center text-xs font-bold text-amber-950">
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700" />
                        {generating ? (simulatedStage || 'Generating individual PDFs...') : 'Generating individual PDFs...'}
                      </span>
                      <span className="font-mono text-amber-800">
                        {generating
                          ? `${simulatedProgress}%`
                          : `${Math.round(((activeBatch.processed_guests || 0) / (activeBatch.total_guests || 1)) * 100)}%`}
                      </span>
                    </div>
                    <div className="w-full h-3 bg-amber-200/60 rounded-full overflow-hidden shadow-inner">
                      <div
                        style={{
                          width: `${
                            generating
                              ? simulatedProgress
                              : Math.round(((activeBatch.processed_guests || 0) / (activeBatch.total_guests || 1)) * 100)
                          }%`,
                        }}
                        className="h-full bg-gradient-to-r from-amber-500 via-rose-700 to-rose-950 rounded-full transition-all duration-300"
                      />
                    </div>
                  </div>
                )}

                {/* Download All as ZIP Banner (when completed) */}
                {activeBatch.status === 'COMPLETED' && activeBatch.zip_url && (
                  <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h5 className="text-sm font-bold text-emerald-950 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        All {activeBatch.total_guests} Cards Ready for Download!
                      </h5>
                      <p className="text-xs text-emerald-800/80 mt-0.5">
                        Download all serialized PDFs packed in a single ZIP archive.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => downloadBatchZipArchive(activeBatch, formatMediaUrl(activeBatch.zip_url))}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md active:scale-95 shrink-0 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      Download ZIP Archive
                    </button>
                  </div>
                )}

                {/* Individual Cards Grid */}
                {activeBatch.cards && activeBatch.cards.length > 0 && (
                  <div className="space-y-3">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Generated Individual PDFs ({activeBatch.cards.length})
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1 slim-scrollbar">
                      {activeBatch.cards.map((card) => {
                        const downloadUrl = formatMediaUrl(card.download_url);
                        return (
                          <div
                            key={card.id}
                            className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between text-xs hover:bg-slate-100 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <FileText className="w-4 h-4 text-rose-800 shrink-0" />
                              <div className="truncate">
                                <span className="font-bold text-slate-900 block truncate">{card.guest_name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{card.file_name}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => downloadOrViewCard(card, downloadUrl, 'open')}
                                className="p-1.5 text-slate-500 hover:text-rose-900 hover:bg-white rounded-lg transition-colors cursor-pointer"
                                title="Open / Download PDF"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCard(card.id, card.guest_name)}
                                className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
                                title="Delete this card"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Error details if failed */}
                {activeBatch.status === 'FAILED' && (
                  <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-4 rounded-xl space-y-2">
                    <p className="font-bold">Generation Stopped:</p>
                    <p className="font-mono text-[11px] bg-red-100/60 p-2 rounded">{activeBatch.error_message}</p>
                    <p className="text-[11px] text-red-600">
                      Tip: Open the "Card Editor" tab to ensure the placement box is wide enough for long names.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center text-slate-400">
                <Archive className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                <h4 className="text-sm font-bold text-slate-700 font-serif">No Cards Generated Yet</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Enter your guest names on the left and click "Generate Cards" to start.
                </p>
              </div>
            )}

            {/* Batch Selector (if multiple batches exist) */}
            {batches.length > 1 && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-700 shrink-0">
                  Switch to Another Past Batch:
                </span>
                <CustomSelect
                  value={activeBatch?.id || ''}
                  onChange={(selectedId) => {
                    const selected = batches.find((b) => b.id === selectedId);
                    if (selected) {
                      setActiveBatch(selected);
                      setTargetBatchId(selected.id);
                      setIsPolling(selected.status === 'PROCESSING' || selected.status === 'PENDING');
                    }
                  }}
                  options={batches.map((b) => {
                    const cleanName = (b.batch_name || 'Untitled').replace(/Batch\s*#\s*/i, 'Batch ');
                    const count = b.cards?.length ?? b.total_guests ?? 0;
                    return {
                      value: b.id,
                      label: cleanName.startsWith(`Batch ${b.batch_number}`)
                        ? cleanName
                        : `Batch ${b.batch_number} - ${cleanName}`,
                      badge: `${count} ${count === 1 ? 'card' : 'cards'}`,
                      subtitle: `Created on ${new Date(b.created_at).toLocaleDateString()}`
                    };
                  })}
                  align="right"
                  className="w-full sm:w-auto sm:min-w-[320px]"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CARD EDITOR & PLACEMENT (Full-width dedicated visual editor) */}
      {activeTab === 'editor' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Full-Height Interactive Canvas (7 cols) */}
            <div className="lg:col-span-7 flex flex-col h-[76vh]">
              <VisualCardCanvas
                project={project}
                lineBoxes={lineBoxes}
                onLineBoxesChange={setLineBoxes}
                boxCoords={boxCoords}
                onBoxChange={setBoxCoords}
                activeLine={activeLine}
                onSelectLine={setActiveLine}
                fontFamily={fontFamily}
                fontSize={fontSize}
                fontColor={fontColor}
                textAlign={textAlign}
                sampleText={sampleText}
                prefixText={prefixText}
                linePreference={linePreference}
                backendPreviewUrl={backendPreviewUrl}
                onClearBackendPreview={() => setBackendPreviewUrl(null)}
              />
            </div>

            {/* Right Column: Typography & Coordinate Settings Controls (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              <TypographyToolbar
                fonts={fonts}
                fontFamily={fontFamily}
                setFontFamily={setFontFamily}
                fontSize={fontSize}
                setFontSize={setFontSize}
                minFontSize={minFontSize}
                setMinFontSize={setMinFontSize}
                fontColor={fontColor}
                setFontColor={setFontColor}
                textAlign={textAlign}
                setTextAlign={setTextAlign}
                prefixText={prefixText}
                setPrefixText={setPrefixText}
                sampleText={sampleText}
                setSampleText={setSampleText}
                samplePreviewOptions={guestPreviewOptions}
                linePreference={linePreference}
                setLinePreference={setLinePreference}
                activeLine={activeLine}
                onSelectLine={setActiveLine}
                onSaveSettings={handleSaveSettings}
                onRenderBackendPreview={handleRenderBackendPreview}
                saving={savingSettings}
                renderingSample={renderingSample}
              />

              <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 text-xs space-y-1.5">
                <p className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  How Placement Works
                </p>
                <p className="text-amber-800 leading-relaxed">
                  Drag each of the 3 separate line boxes (<strong>1st Line</strong>, <strong>2nd Line</strong>, <strong>3rd Line</strong>) to align each line directly over your card's printed lines. Once adjusted, click <strong>"Save Setup"</strong> above, then switch back to the <strong>"Generate Cards"</strong> tab to run your batches!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern Confirmation & Delete Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        confirmVariant={confirmModal.confirmVariant || 'danger'}
        isLoading={confirmModal.isLoading}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
