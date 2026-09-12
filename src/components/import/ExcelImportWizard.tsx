import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Eye,
  Check,
  X,
  FileCheck,
  UserCheck,
  Layers,
  HelpCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Project, Card, Priority, DeliveryStage } from '../../types';
import {
  parseWorkbookFile,
  extractSheetData,
  suggestColumnMappings,
  processImportRows,
  analyzeOwners,
  ParsedSheetData,
  ColumnMappingConfig,
  ImportCandidateRow,
  OwnerResolutionInfo,
} from '../../utils/excelImport';
import { generateSampleAvmaisWorkbook } from '../../utils/sampleWorkbook';

interface ExcelImportWizardProps {
  project: Project;
  existingCards: Card[];
  onCancel: () => void;
  onImportComplete: (cards: Card[], appendMode: boolean) => void;
}

export const ExcelImportWizard: React.FC<ExcelImportWizardProps> = ({
  project,
  existingCards,
  onCancel,
  onImportComplete,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [fileName, setFileName] = useState<string>('');
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetData, setSheetData] = useState<ParsedSheetData | null>(null);
  const [headerRowIdx, setHeaderRowIdx] = useState<number>(0);
  const [columnMapping, setColumnMapping] = useState<ColumnMappingConfig | null>(null);
  const [candidateRows, setCandidateRows] = useState<ImportCandidateRow[]>([]);
  const [ownerAnalysis, setOwnerAnalysis] = useState<OwnerResolutionInfo[]>([]);
  const [importMode, setImportMode] = useState<'update' | 'append'>('update');
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load ArrayBuffer into workbook
  const handleFileBuffer = (buffer: ArrayBuffer, name: string) => {
    try {
      setIsProcessing(true);
      const wb = parseWorkbookFile(buffer);
      setWorkbook(wb);
      setFileName(name);

      const firstSheet = wb.SheetNames[0];
      const data = extractSheetData(wb, firstSheet, 0);
      setSheetData(data);

      const suggested = suggestColumnMappings(data.headers);
      setColumnMapping(suggested);
      // Stay on Step 1 to let user inspect and select available worksheets
      setStep(1);
    } catch (err: any) {
      alert(`Error reading file: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result) {
        handleFileBuffer(evt.target.result as ArrayBuffer, file.name);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result) {
        handleFileBuffer(evt.target.result as ArrayBuffer, file.name);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleLoadSample = () => {
    const buffer = generateSampleAvmaisWorkbook();
    handleFileBuffer(buffer.buffer as ArrayBuffer, 'AVMAIS_Implementation_2027_Sample.xlsx');
  };

  const handleSheetChange = (sheetName: string) => {
    if (!workbook) return;
    const data = extractSheetData(workbook, sheetName, headerRowIdx);
    setSheetData(data);
    const suggested = suggestColumnMappings(data.headers);
    setColumnMapping(suggested);
  };

  const handleHeaderRowChange = (idx: number) => {
    if (!workbook || !sheetData) return;
    setHeaderRowIdx(idx);
    const data = extractSheetData(workbook, sheetData.selectedSheet, idx);
    setSheetData(data);
    const suggested = suggestColumnMappings(data.headers);
    setColumnMapping(suggested);
  };

  // Move from Mapping (Step 2) to Owners & Validation (Step 3 & 4)
  const proceedToProcessing = () => {
    if (!sheetData || !columnMapping) return;
    const rows = processImportRows(sheetData, columnMapping, existingCards);
    setCandidateRows(rows);
    const owners = analyzeOwners(rows);
    setOwnerAnalysis(owners);
    setStep(3);
  };

  const toggleRowInclusion = (index: number) => {
    const updated = [...candidateRows];
    updated[index].included = !updated[index].included;
    setCandidateRows(updated);
  };

  const handleCommitImport = () => {
    const includedRows = candidateRows.filter((r) => r.included);

    const importedCards: Card[] = includedRows.map((r) => {
      // Find or match workstream
      const ws = project.workstreams.find(
        (w) => w.name.toLowerCase() === r.workstream.toLowerCase()
      );

      return {
        id: r.stableId,
        projectId: project.id,
        workstreamId: ws ? ws.id : `ws-${r.workstream.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        workstreamName: r.workstream,
        title: r.deliverable,
        description: r.activities,
        currentPriority: r.currentPriority,
        currentStage: r.deliveryStage,
        internalOwner: r.internalOwner,
        deliveryPartnerOwner: r.deliveryPartnerOwner,
        targetDateOrQuarter: r.targetEta,
        dependencies: r.dependencies,
        customFields: r.customFields,
        sourceMeta: {
          sheetName: sheetData?.selectedSheet,
          rowNumber: r.rowIndex + 1,
          rawStatus: r.currentStatus,
          importedAt: new Date().toISOString(),
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    onImportComplete(importedCards, importMode === 'append');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="bg-white dark:bg-[#20222a] border border-stone-200 dark:border-[#2e303a] rounded-2xl shadow-xl overflow-hidden">
        {/* Wizard Header */}
        <div className="bg-[#18191c] text-white px-6 py-4 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#282a35] border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-stone-100">
                Excel & CSV Import Wizard
              </h2>
              <p className="text-xs text-stone-400">
                Project: <strong className="text-white">{project.name}</strong> &bull; Safe re-import with conflict prevention
              </p>
            </div>
          </div>

          {/* Stepper indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs">
            <span className={`px-2.5 py-1 rounded font-semibold ${step === 1 ? 'bg-[#d4af37] text-neutral-950' : 'bg-stone-800 text-stone-400'}`}>
              1. Upload & Worksheet
            </span>
            <span className="text-stone-600">&rarr;</span>
            <span className={`px-2.5 py-1 rounded font-semibold ${step === 2 ? 'bg-[#d4af37] text-neutral-950' : 'bg-stone-800 text-stone-400'}`}>
              2. Column Mapping
            </span>
            <span className="text-stone-600">&rarr;</span>
            <span className={`px-2.5 py-1 rounded font-semibold ${step === 3 ? 'bg-[#d4af37] text-neutral-950' : 'bg-stone-800 text-stone-400'}`}>
              3. Owners
            </span>
            <span className="text-stone-600">&rarr;</span>
            <span className={`px-2.5 py-1 rounded font-semibold ${step === 4 ? 'bg-[#d4af37] text-neutral-950' : 'bg-stone-800 text-stone-400'}`}>
              4. Validation
            </span>
            <span className="text-stone-600">&rarr;</span>
            <span className={`px-2.5 py-1 rounded font-semibold ${step === 5 ? 'bg-[#d4af37] text-neutral-950' : 'bg-stone-800 text-stone-400'}`}>
              5. Preview & Commit
            </span>
          </div>

          <button
            onClick={onCancel}
            className="text-stone-400 hover:text-white text-sm font-semibold p-1"
          >
            ✕
          </button>
        </div>

        {/* STEP 1: UPLOAD & WORKSHEET SELECTION */}
        {step === 1 && (
          <div className="p-6 sm:p-8 space-y-6">
            {/* Local-only Feature Disclosure Banner */}
            <div className="bg-[#1f2128] border border-[#d4af37]/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-stone-300">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#d4af37]" />
                <div>
                  <span className="font-bold text-stone-100 text-sm mr-2">Local-Only Feature</span>
                  <span className="text-stone-400">
                    File parsing runs entirely in your local browser memory via SheetJS. No spreadsheet contents leave your device.
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded bg-[#d4af37]/15 text-[#fcd34d] font-mono text-[11px] font-semibold shrink-0 border border-[#d4af37]/30">
                Client-Side Processing
              </span>
            </div>

            {!workbook ? (
              <>
                {/* Drag and Drop Zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer ${
                    dragActive
                      ? 'border-[#d4af37] bg-amber-500/5'
                      : 'border-stone-300 dark:border-stone-700 hover:border-[#d4af37] bg-stone-50 dark:bg-[#18191c]'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="w-16 h-16 mx-auto rounded-full bg-stone-200 dark:bg-[#282a35] flex items-center justify-center text-[#d4af37] mb-4 shadow-sm">
                    <Upload className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                    Upload Spreadsheet (XLSX or CSV)
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-md mx-auto">
                    Drag and drop your project workbook here, or click to browse files from your computer.
                  </p>
                  <div className="mt-4">
                    <span className="inline-block px-4 py-2 rounded-lg bg-stone-200 dark:bg-stone-800 text-xs font-semibold text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700">
                      Select File from Computer
                    </span>
                  </div>
                </div>

                {/* Instant Fictional Data Loader */}
                <div className="bg-amber-500/10 border border-[#d4af37]/40 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-[#d4af37]" />
                      <span className="font-bold text-sm text-stone-900 dark:text-stone-100">
                        Load Fictional Data: AVMAIS Implementation 2027 Sample Workbook
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                      Pre-populates a multi-worksheet spreadsheet with 12 deliverable cards, workstreams, Pearl and internal owners, delivery stages, and TBD ownership gaps.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLoadSample}
                    disabled={isProcessing}
                    className="shrink-0 px-4 py-2.5 rounded-lg bg-[#d4af37] hover:bg-[#c59e2b] text-neutral-950 text-xs font-bold shadow-sm transition-colors flex items-center gap-2"
                  >
                    {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                    Load Sample Workbook
                  </button>
                </div>
              </>
            ) : (
              /* File Uploaded: Show Available Worksheets to Select */
              <div className="space-y-6">
                {/* Uploaded File Bar */}
                <div className="bg-stone-100 dark:bg-[#18191c] border border-stone-200 dark:border-stone-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#282a35] border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37]">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-stone-900 dark:text-stone-100">
                          {fileName}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold">
                          Parsed Successfully
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        Found {workbook.SheetNames.length} worksheet(s) in workbook
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setWorkbook(null);
                        setSheetData(null);
                        setFileName('');
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 border border-stone-300 dark:border-stone-700"
                    >
                      Upload Different File
                    </button>
                    <button
                      type="button"
                      onClick={handleLoadSample}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#b45309] dark:text-[#fcd34d] hover:bg-stone-200 dark:hover:bg-stone-800 border border-[#d4af37]/40"
                    >
                      Reload Sample Data
                    </button>
                  </div>
                </div>

                {/* Available Worksheets List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                        Select Worksheet to Import
                      </h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        Choose which tab contains the project deliverables backlog.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {workbook.SheetNames.map((sheetName) => {
                      const isSelected = sheetData?.selectedSheet === sheetName;
                      const sheet = workbook.Sheets[sheetName];
                      const range = sheet ? XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1') : null;
                      const rowCount = range ? range.e.r - range.s.r + 1 : 0;

                      return (
                        <div
                          key={sheetName}
                          onClick={() => handleSheetChange(sheetName)}
                          className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'border-[#d4af37] bg-amber-500/5 dark:bg-[#282a35] shadow-sm'
                              : 'border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-700 bg-white dark:bg-[#20222a]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Layers className={`w-4 h-4 ${isSelected ? 'text-[#d4af37]' : 'text-stone-400'}`} />
                              <span className="font-bold text-sm text-stone-900 dark:text-stone-100">
                                {sheetName}
                              </span>
                            </div>
                            {isSelected && (
                              <span className="w-5 h-5 rounded-full bg-[#d4af37] text-neutral-950 flex items-center justify-center text-xs font-bold">
                                ✓
                              </span>
                            )}
                          </div>

                          <div className="mt-3 pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                            <span>~{rowCount} rows detected</span>
                            <span className="text-[11px] font-semibold text-[#b45309] dark:text-[#fcd34d]">
                              {isSelected ? 'Active Sheet' : 'Click to Select'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Preview of Selected Sheet Data */}
                {sheetData && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-stone-700 dark:text-stone-300">
                        Preview of Worksheet "{sheetData.selectedSheet}":
                      </span>
                      <span className="text-stone-500">{sheetData.totalRowCount} rows found</span>
                    </div>

                    <div className="border border-stone-200 dark:border-stone-800 rounded-xl overflow-x-auto max-h-48 overflow-y-auto bg-white dark:bg-[#18191c]">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-stone-100 dark:bg-[#20222a] text-stone-600 dark:text-stone-400 font-semibold border-b border-stone-200 dark:border-stone-800 sticky top-0">
                          <tr>
                            {sheetData.headers.slice(0, 6).map((h, i) => (
                              <th key={i} className="p-2.5 truncate max-w-[150px]">{h}</th>
                            ))}
                            {sheetData.headers.length > 6 && (
                              <th className="p-2.5 text-stone-400">+{sheetData.headers.length - 6} more columns</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 dark:divide-stone-800 text-stone-700 dark:text-stone-300">
                          {sheetData.rawRows.slice(1, 4).map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                              {row.slice(0, 6).map((cell, cIdx) => (
                                <td key={cIdx} className="p-2.5 truncate max-w-[150px]">{String(cell || '—')}</td>
                              ))}
                              {row.length > 6 && (
                                <td key="more" className="p-2.5 text-stone-400 text-[10px]">...</td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Step 1 Actions */}
                <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
                  >
                    Cancel Import
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#d4af37] hover:bg-[#c59e2b] text-neutral-950 text-xs font-bold shadow-md transition-colors"
                  >
                    <span>Proceed to Column Mapping</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: SHEET SELECTION & COLUMN MAPPING */}
        {step === 2 && sheetData && columnMapping && (
          <div className="p-6 space-y-6">
            {/* Sheet & Header row selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-stone-50 dark:bg-[#18191c] p-4 rounded-xl border border-stone-200 dark:border-stone-800 text-xs">
              <div>
                <label className="block font-bold text-stone-800 dark:text-stone-200 mb-1">
                  Select Worksheet
                </label>
                <select
                  value={sheetData.selectedSheet}
                  onChange={(e) => handleSheetChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#20222a] text-stone-900 dark:text-stone-100 font-medium"
                >
                  {sheetData.sheetNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-stone-500 mt-1">
                  Detected {sheetData.totalRowCount} data rows.
                </p>
              </div>

              <div>
                <label className="block font-bold text-stone-800 dark:text-stone-200 mb-1">
                  Header Row Number
                </label>
                <select
                  value={headerRowIdx}
                  onChange={(e) => handleHeaderRowChange(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#20222a] text-stone-900 dark:text-stone-100 font-medium"
                >
                  {[0, 1, 2, 3, 4].map((idx) => (
                    <option key={idx} value={idx}>
                      Row {idx + 1} ({sheetData.rawRows[idx]?.slice(0, 3).join(', ') || 'Empty'}...)
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-stone-500 mt-1">
                  Header defines mapped column names.
                </p>
              </div>
            </div>

            {/* Column Mapping Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    Column Mappings (PRD Section 5)
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Review suggested matches. Workstream and Deliverable title are strictly required.
                  </p>
                </div>
              </div>

              <div className="border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-stone-100 dark:bg-[#18191c] text-stone-600 dark:text-stone-400 font-semibold border-b border-stone-200 dark:border-stone-800 sticky top-0">
                    <tr>
                      <th className="p-3">Application Field</th>
                      <th className="p-3">Requirement</th>
                      <th className="p-3">Mapped Spreadsheet Column</th>
                      <th className="p-3">Preview Value (Row 1)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800 text-stone-800 dark:text-stone-200">
                    {/* Record ID */}
                    <tr className="hover:bg-stone-50 dark:hover:bg-[#252835]">
                      <td className="p-3 font-semibold">Stable Card ID</td>
                      <td className="p-3 text-stone-400">Optional (Auto-generated if blank)</td>
                      <td className="p-3">
                        <select
                          value={columnMapping.recordIdCol || ''}
                          onChange={(e) => setColumnMapping({ ...columnMapping, recordIdCol: e.target.value || undefined })}
                          className="px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#20222a] w-full"
                        >
                          <option value="">-- None (Auto-generate IDs) --</option>
                          {sheetData.headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 font-mono text-stone-500">{sheetData.rawRows[headerRowIdx + 1]?.[sheetData.headers.indexOf(columnMapping.recordIdCol || '')] || '-'}</td>
                    </tr>

                    {/* Workstream */}
                    <tr className="hover:bg-stone-50 dark:hover:bg-[#252835]">
                      <td className="p-3 font-semibold">Workstream</td>
                      <td className="p-3 text-rose-500 font-semibold">Required</td>
                      <td className="p-3">
                        <select
                          value={columnMapping.workstreamCol || ''}
                          onChange={(e) => setColumnMapping({ ...columnMapping, workstreamCol: e.target.value || undefined })}
                          className="px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#20222a] w-full"
                        >
                          <option value="">-- Select Column --</option>
                          {sheetData.headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 text-stone-500">{sheetData.rawRows[headerRowIdx + 1]?.[sheetData.headers.indexOf(columnMapping.workstreamCol || '')] || '-'}</td>
                    </tr>

                    {/* Deliverable */}
                    <tr className="hover:bg-stone-50 dark:hover:bg-[#252835]">
                      <td className="p-3 font-semibold">Deliverable (Card Title)</td>
                      <td className="p-3 text-rose-500 font-semibold">Required</td>
                      <td className="p-3">
                        <select
                          value={columnMapping.deliverableCol || ''}
                          onChange={(e) => setColumnMapping({ ...columnMapping, deliverableCol: e.target.value || undefined })}
                          className="px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#20222a] w-full"
                        >
                          <option value="">-- Select Column --</option>
                          {sheetData.headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 text-stone-500 font-medium">{sheetData.rawRows[headerRowIdx + 1]?.[sheetData.headers.indexOf(columnMapping.deliverableCol || '')] || '-'}</td>
                    </tr>

                    {/* Activities */}
                    <tr className="hover:bg-stone-50 dark:hover:bg-[#252835]">
                      <td className="p-3 font-semibold">Initiatives / Activities</td>
                      <td className="p-3 text-stone-400">Optional</td>
                      <td className="p-3">
                        <select
                          value={columnMapping.activitiesCol || ''}
                          onChange={(e) => setColumnMapping({ ...columnMapping, activitiesCol: e.target.value || undefined })}
                          className="px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#20222a] w-full"
                        >
                          <option value="">-- None --</option>
                          {sheetData.headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 text-stone-500 truncate max-w-xs">{sheetData.rawRows[headerRowIdx + 1]?.[sheetData.headers.indexOf(columnMapping.activitiesCol || '')] || '-'}</td>
                    </tr>

                    {/* Internal Owner */}
                    <tr className="hover:bg-stone-50 dark:hover:bg-[#252835]">
                      <td className="p-3 font-semibold">Internal Owner</td>
                      <td className="p-3 text-stone-400">Optional (Preserves names without emails)</td>
                      <td className="p-3">
                        <select
                          value={columnMapping.internalOwnerCol || ''}
                          onChange={(e) => setColumnMapping({ ...columnMapping, internalOwnerCol: e.target.value || undefined })}
                          className="px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#20222a] w-full"
                        >
                          <option value="">-- None --</option>
                          {sheetData.headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 text-stone-500">{sheetData.rawRows[headerRowIdx + 1]?.[sheetData.headers.indexOf(columnMapping.internalOwnerCol || '')] || '-'}</td>
                    </tr>

                    {/* Partner Owner */}
                    <tr className="hover:bg-stone-50 dark:hover:bg-[#252835]">
                      <td className="p-3 font-semibold">Delivery Partner Owner</td>
                      <td className="p-3 text-stone-400">Optional</td>
                      <td className="p-3">
                        <select
                          value={columnMapping.deliveryPartnerOwnerCol || ''}
                          onChange={(e) => setColumnMapping({ ...columnMapping, deliveryPartnerOwnerCol: e.target.value || undefined })}
                          className="px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#20222a] w-full"
                        >
                          <option value="">-- None --</option>
                          {sheetData.headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 text-stone-500">{sheetData.rawRows[headerRowIdx + 1]?.[sheetData.headers.indexOf(columnMapping.deliveryPartnerOwnerCol || '')] || '-'}</td>
                    </tr>

                    {/* Current Priority */}
                    <tr className="hover:bg-stone-50 dark:hover:bg-[#252835]">
                      <td className="p-3 font-semibold">Current Priority</td>
                      <td className="p-3 text-stone-400">Optional (P0-P3)</td>
                      <td className="p-3">
                        <select
                          value={columnMapping.currentPriorityCol || ''}
                          onChange={(e) => setColumnMapping({ ...columnMapping, currentPriorityCol: e.target.value || undefined })}
                          className="px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#20222a] w-full"
                        >
                          <option value="">-- None --</option>
                          {sheetData.headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 text-stone-500">{sheetData.rawRows[headerRowIdx + 1]?.[sheetData.headers.indexOf(columnMapping.currentPriorityCol || '')] || '-'}</td>
                    </tr>

                    {/* Current Status */}
                    <tr className="hover:bg-stone-50 dark:hover:bg-[#252835]">
                      <td className="p-3 font-semibold">Current Status / Stage</td>
                      <td className="p-3 text-stone-400">Maps to Requirements, Dev, Testing, Delivered</td>
                      <td className="p-3">
                        <select
                          value={columnMapping.currentStatusCol || ''}
                          onChange={(e) => setColumnMapping({ ...columnMapping, currentStatusCol: e.target.value || undefined })}
                          className="px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#20222a] w-full"
                        >
                          <option value="">-- None --</option>
                          {sheetData.headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 text-stone-500">{sheetData.rawRows[headerRowIdx + 1]?.[sheetData.headers.indexOf(columnMapping.currentStatusCol || '')] || '-'}</td>
                    </tr>

                    {/* Existing ETA / Horizon */}
                    <tr className="hover:bg-stone-50 dark:hover:bg-[#252835]">
                      <td className="p-3 font-semibold">Existing Target / ETA</td>
                      <td className="p-3 text-stone-400">Preserves "Ongoing", "TBD", quarter strings</td>
                      <td className="p-3">
                        <select
                          value={columnMapping.targetEtaCol || ''}
                          onChange={(e) => setColumnMapping({ ...columnMapping, targetEtaCol: e.target.value || undefined })}
                          className="px-2 py-1 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#20222a] w-full"
                        >
                          <option value="">-- None --</option>
                          {sheetData.headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 text-stone-500">{sheetData.rawRows[headerRowIdx + 1]?.[sheetData.headers.indexOf(columnMapping.targetEtaCol || '')] || '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-1 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-900"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Upload
              </button>
              <button
                type="button"
                onClick={proceedToProcessing}
                disabled={!columnMapping.workstreamCol || !columnMapping.deliverableCol}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#d4af37] hover:bg-[#c59e2b] disabled:opacity-50 text-neutral-950 text-xs font-bold shadow-md transition-colors"
              >
                Continue to Owner Review <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: WORKSTREAM & OWNER MATCHING */}
        {step === 3 && (
          <div className="p-6 space-y-6">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Workstream & Owner Resolution (PRD Section 6)
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Imported names appear immediately on cards without inventing emails, sending unsolicited invitations, or granting unauthorized access.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ownerAnalysis.map((owner) => (
                <div
                  key={owner.name}
                  className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
                    owner.isGap
                      ? 'bg-amber-500/10 border-amber-500/40'
                      : 'bg-stone-50 dark:bg-[#18191c] border-stone-200 dark:border-stone-800'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <UserCheck className={`w-4 h-4 ${owner.isGap ? 'text-amber-500' : 'text-[#d4af37]'}`} />
                      <span className="font-bold text-xs text-stone-900 dark:text-stone-100">
                        {owner.name || 'Blank / Unassigned'}
                      </span>
                      {owner.isGap && (
                        <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400">
                          Ownership Gap
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-stone-500">
                      Found in <strong>{owner.occurrenceCount}</strong> item(s) &bull;{' '}
                      {owner.isGap
                        ? 'Flagged for explicit gap recording in workshop.'
                        : 'Display-only name; accounts not automatically linked.'}
                    </div>
                  </div>

                  <span className="text-xs font-semibold px-2.5 py-1 rounded bg-stone-200 dark:bg-[#282a35] text-stone-700 dark:text-stone-300 shrink-0">
                    {owner.isGap ? 'Gap Flagged' : 'Display Verified'}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center gap-1 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-900"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Mappings
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#d4af37] hover:bg-[#c59e2b] text-neutral-950 text-xs font-bold shadow-md transition-colors"
              >
                Continue to Validation ({candidateRows.length} rows) <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: ROW VALIDATION & INCLUSION */}
        {step === 4 && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                  Data Validation & Row Inclusion
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {candidateRows.filter((r) => r.included).length} of {candidateRows.length} rows selected for import.
                </p>
              </div>
            </div>

            <div className="border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-stone-100 dark:bg-[#18191c] text-stone-600 dark:text-stone-400 font-semibold border-b border-stone-200 dark:border-stone-800 sticky top-0">
                  <tr>
                    <th className="p-3 w-10 text-center">Include</th>
                    <th className="p-3">ID</th>
                    <th className="p-3">Workstream</th>
                    <th className="p-3">Deliverable Title</th>
                    <th className="p-3">Stage</th>
                    <th className="p-3">Priority</th>
                    <th className="p-3">Owner</th>
                    <th className="p-3">Status / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800 text-stone-800 dark:text-stone-200">
                  {candidateRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className={`hover:bg-stone-50 dark:hover:bg-[#252835] ${
                        !row.included ? 'opacity-40 bg-stone-50 dark:bg-stone-900/50' : ''
                      }`}
                    >
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={row.included}
                          onChange={() => toggleRowInclusion(idx)}
                          className="w-4 h-4 rounded text-[#d4af37] cursor-pointer"
                        />
                      </td>
                      <td className="p-3 font-mono font-bold text-stone-600 dark:text-stone-400">{row.stableId}</td>
                      <td className="p-3 font-medium">{row.workstream}</td>
                      <td className="p-3 font-semibold text-stone-900 dark:text-stone-100 max-w-xs truncate">{row.deliverable}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400">
                          {row.deliveryStage}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-stone-200 dark:bg-stone-800">
                          {row.currentPriority}
                        </span>
                      </td>
                      <td className="p-3">{row.internalOwner || 'TBD'}</td>
                      <td className="p-3">
                        {row.isExistingCard ? (
                          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                            Existing Card ({row.existingDiff?.length || 0} diffs)
                          </span>
                        ) : (
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                            New Deliverable
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex items-center gap-1 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-900"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Owners
              </button>
              <button
                type="button"
                onClick={() => setStep(5)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#d4af37] hover:bg-[#c59e2b] text-neutral-950 text-xs font-bold shadow-md transition-colors"
              >
                Review Safe Re-import Preview <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: PREVIEW & SAFE RE-IMPORT COMMIT */}
        {step === 5 && (
          <div className="p-6 space-y-6">
            <div className="bg-[#1f2128] text-white p-5 rounded-xl border border-stone-800 space-y-4">
              <h3 className="text-base font-bold text-stone-100 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-[#d4af37]" />
                Safe Re-import & Conflict Policy (PRD Section 5)
              </h3>
              <p className="text-xs text-stone-300 leading-relaxed">
                Re-import must not silently duplicate cards, clear fields, overwrite newer edits, or merge similar titles.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <label
                  onClick={() => setImportMode('update')}
                  className={`p-3 rounded-lg border cursor-pointer flex items-start gap-3 transition-colors ${
                    importMode === 'update'
                      ? 'border-[#d4af37] bg-[#282a35]'
                      : 'border-stone-700 bg-[#18191c]'
                  }`}
                >
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === 'update'}
                    onChange={() => setImportMode('update')}
                    className="mt-0.5 text-[#d4af37]"
                  />
                  <div>
                    <div className="text-xs font-bold text-white">Update by Record ID</div>
                    <div className="text-[11px] text-stone-400 mt-0.5">
                      Updates matched card records while preserving in-session assessments, decisions, and discussion history.
                    </div>
                  </div>
                </label>

                <label
                  onClick={() => setImportMode('append')}
                  className={`p-3 rounded-lg border cursor-pointer flex items-start gap-3 transition-colors ${
                    importMode === 'append'
                      ? 'border-[#d4af37] bg-[#282a35]'
                      : 'border-stone-700 bg-[#18191c]'
                  }`}
                >
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === 'append'}
                    onChange={() => setImportMode('append')}
                    className="mt-0.5 text-[#d4af37]"
                  />
                  <div>
                    <div className="text-xs font-bold text-white">Append as New Deliverables</div>
                    <div className="text-[11px] text-stone-400 mt-0.5">
                      Generates fresh stable IDs for all items without altering existing backlog cards.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Summary statistics */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-stone-50 dark:bg-[#18191c] p-4 rounded-xl border border-stone-200 dark:border-stone-800">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {candidateRows.filter((r) => r.included && !r.isExistingCard).length}
                </div>
                <div className="text-xs text-stone-500 mt-1">New Cards to Create</div>
              </div>

              <div className="bg-stone-50 dark:bg-[#18191c] p-4 rounded-xl border border-stone-200 dark:border-stone-800">
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {candidateRows.filter((r) => r.included && r.isExistingCard).length}
                </div>
                <div className="text-xs text-stone-500 mt-1">Existing Cards to Update</div>
              </div>

              <div className="bg-stone-50 dark:bg-[#18191c] p-4 rounded-xl border border-stone-200 dark:border-stone-800">
                <div className="text-2xl font-bold text-stone-600 dark:text-stone-400">
                  {candidateRows.filter((r) => !r.included).length}
                </div>
                <div className="text-xs text-stone-500 mt-1">Excluded Rows</div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-stone-200 dark:border-stone-800">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="flex items-center gap-1 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-900"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Validation
              </button>
              <button
                type="button"
                onClick={handleCommitImport}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#d4af37] hover:bg-[#c59e2b] text-neutral-950 text-xs font-bold shadow-lg transition-colors"
              >
                <Check className="w-4 h-4" /> Confirm Import & Open Workspace
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
