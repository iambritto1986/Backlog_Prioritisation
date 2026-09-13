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
  FolderKanban,
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
import { generateSampleNovaWorkbook } from '../../utils/sampleWorkbook';

export interface ImportDestinationConfig {
  mode: 'new_project' | 'existing_project';
  newProjectName: string;
  newProjectHorizon: string;
  newProjectImpactLabel: string;
  targetProjectId: string;
  importAction: 'clean_replace' | 'update_merge' | 'append_only';
}

interface ExcelImportWizardProps {
  project?: Project | null;
  projects?: Project[];
  existingCards?: Card[];
  onCancel: () => void;
  onImportComplete: (cards: Card[], destination: ImportDestinationConfig) => void;
}

export const ExcelImportWizard: React.FC<ExcelImportWizardProps> = ({
  project,
  projects = [],
  existingCards = [],
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
  const [destMode, setDestMode] = useState<'new_project' | 'existing_project'>('new_project');
  const [newProjName, setNewProjName] = useState<string>('');
  const [newProjHorizon, setNewProjHorizon] = useState<string>('June 2027');
  const [newProjImpactLabel, setNewProjImpactLabel] = useState<string>('Member Impact');
  const [selectedTargetProjId, setSelectedTargetProjId] = useState<string>(project?.id || projects[0]?.id || '');
  const [importAction, setImportAction] = useState<'clean_replace' | 'update_merge' | 'append_only'>('clean_replace');
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

      const cleanName = name
        .replace(/\.(xlsx|xls|csv)$/i, '')
        .replace(/[-_]/g, ' ')
        .trim();
      setNewProjName(cleanName || 'Imported Product Backlog');

      const firstSheet = wb.SheetNames[0];
      const data = extractSheetData(wb, firstSheet);
      setSheetData(data);
      setHeaderRowIdx(data.headerRowIndex);

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
    const buffer = generateSampleNovaWorkbook();
    handleFileBuffer(buffer.buffer as ArrayBuffer, 'Nova_Platform_Modernization_2027_Sample.xlsx');
  };

  const handleSheetChange = (sheetName: string) => {
    if (!workbook) return;
    const data = extractSheetData(workbook, sheetName);
    setSheetData(data);
    setHeaderRowIdx(data.headerRowIndex);
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
    const targetProjId = destMode === 'new_project' ? `proj-${Date.now()}` : selectedTargetProjId;
    const targetProj = projects.find((p) => p.id === targetProjId) || project;

    const importedCards: Card[] = includedRows.map((r) => {
      // Find or match workstream
      const ws = targetProj?.workstreams?.find(
        (w) => w.name.toLowerCase().trim() === r.workstream.toLowerCase().trim()
      );

      return {
        id: r.stableId,
        projectId: targetProjId,
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
        customFields: {
          ...r.customFields,
          ...(r.workstreamLead ? { workstreamLead: r.workstreamLead } : {}),
          ...(r.businessValue ? { businessValue: r.businessValue } : {}),
          ...(r.impact ? { impact: r.impact } : {}),
          ...(r.urgency ? { urgency: r.urgency } : {}),
          ...(r.effort ? { effort: r.effort } : {}),
          ...(r.workstreamRank !== undefined ? { workstreamRank: String(r.workstreamRank) } : {}),
          ...(r.sessionDecision ? { sessionDecision: r.sessionDecision } : {}),
          ...(r.milestoneOutcome ? { milestoneOutcome: r.milestoneOutcome } : {}),
          ...(r.teamRationale ? { teamRationale: r.teamRationale } : {}),
        },
        sourceMeta: {
          sheetName: sheetData?.selectedSheet,
          rowNumber: r.rowIndex + 1,
          rawStatus: r.currentStatus,
          workstreamLead: r.workstreamLead,
          businessValue: r.businessValue,
          impact: r.impact,
          urgency: r.urgency,
          effort: r.effort,
          workstreamRank: r.workstreamRank,
          sessionDecision: r.sessionDecision,
          milestoneOutcome: r.milestoneOutcome,
          teamRationale: r.teamRationale,
          importedAt: new Date().toISOString(),
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    onImportComplete(importedCards, {
      mode: destMode,
      newProjectName: newProjName.trim() || 'Imported Product Backlog',
      newProjectHorizon: newProjHorizon.trim() || 'June 2027',
      newProjectImpactLabel: newProjImpactLabel || 'Member Impact',
      targetProjectId: targetProjId,
      importAction,
    });
  };

  const activeDestProject = projects.find((p) => p.id === selectedTargetProjId) || project;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="bg-[#121318] border border-[#1f222c] rounded-2xl shadow-2xl overflow-hidden text-[#e5e7eb]">
        {/* Wizard Header */}
        <div className="bg-[#181920] text-white px-6 py-4 border-b border-[#252836] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#14161f] border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white">
                Intelligent Spreadsheet Import Wizard
              </h2>
              <p className="text-xs text-stone-400">
                Target:{' '}
                <strong className="text-white">
                  {destMode === 'new_project'
                    ? newProjName || 'New Project'
                    : activeDestProject?.name || 'Existing Project'}
                </strong>{' '}
                &bull; Auto-detects multi-row headers & workstreams
              </p>
            </div>
          </div>

          {/* Stepper indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs">
            <span className={`px-2.5 py-1 rounded-full font-bold ${step === 1 ? 'bg-[#d4af37] text-neutral-950' : 'bg-[#181a22] text-stone-400 border border-[#282c38]'}`}>
              1. Upload
            </span>
            <span className="text-stone-600">&rarr;</span>
            <span className={`px-2.5 py-1 rounded-full font-bold ${step === 2 ? 'bg-[#d4af37] text-neutral-950' : 'bg-[#181a22] text-stone-400 border border-[#282c38]'}`}>
              2. Mappings
            </span>
            <span className="text-stone-600">&rarr;</span>
            <span className={`px-2.5 py-1 rounded-full font-bold ${step === 3 ? 'bg-[#d4af37] text-neutral-950' : 'bg-[#181a22] text-stone-400 border border-[#282c38]'}`}>
              3. Owners
            </span>
            <span className="text-stone-600">&rarr;</span>
            <span className={`px-2.5 py-1 rounded-full font-bold ${step === 4 ? 'bg-[#d4af37] text-neutral-950' : 'bg-[#181a22] text-stone-400 border border-[#282c38]'}`}>
              4. Validation
            </span>
            <span className="text-stone-600">&rarr;</span>
            <span className={`px-2.5 py-1 rounded-full font-bold ${step === 5 ? 'bg-[#d4af37] text-neutral-950' : 'bg-[#181a22] text-stone-400 border border-[#282c38]'}`}>
              5. Commit
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
            <div className="bg-[#181920] border border-[#d4af37]/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-stone-300">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#d4af37]" />
                <div>
                  <span className="font-bold text-white text-sm mr-2">Client-Side Private Processing</span>
                  <span className="text-stone-400">
                    File parsing runs entirely in your local browser memory via SheetJS. No spreadsheet contents leave your device.
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#d4af37]/15 text-[#fcd34d] font-mono text-[11px] font-bold shrink-0 border border-[#d4af37]/30">
                100% Private
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
                      ? 'border-[#d4af37] bg-amber-500/10'
                      : 'border-[#282c38] hover:border-[#d4af37] bg-[#181a22]'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-[#14161f] border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37] mb-4 shadow-inner">
                    <Upload className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    Upload Spreadsheet (XLSX or CSV)
                  </h3>
                  <p className="text-xs text-stone-400 mt-1 max-w-md mx-auto leading-relaxed">
                    TalonSync automatically scans for header offsets, workstream tracks, leads, priorities (P0-P3), and workshop decisions.
                  </p>
                  <div className="mt-4">
                    <span className="inline-block px-4 py-2 rounded-xl bg-[#20232e] text-xs font-semibold text-stone-200 border border-[#2d3142]">
                      Browse Files from Computer
                    </span>
                  </div>
                </div>

                {/* Instant Fictional Data Loader */}
                <div className="bg-[#181a22] border border-[#282c38] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-[#d4af37]" />
                      <span className="font-bold text-sm text-white">
                        Load Sample: Nova Platform Modernization 2027 Workbook
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 leading-relaxed">
                      Pre-populates a multi-worksheet spreadsheet with 12 deliverable cards, workstream tracks, Pearl & internal leads, and priorities.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLoadSample}
                    disabled={isProcessing}
                    className="shrink-0 px-4 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#c59e2b] text-neutral-950 text-xs font-bold shadow-md transition-all flex items-center gap-2"
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
                <div className="bg-[#181a22] border border-[#282c38] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#14161f] border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37]">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">
                          {fileName}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30">
                          Parsed Successfully
                        </span>
                      </div>
                      <p className="text-xs text-stone-400 mt-0.5">
                        Found {workbook.SheetNames.length} worksheet(s) &bull; Auto-detected header on Row {headerRowIdx + 1}
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
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-300 hover:text-white bg-[#20232e] hover:bg-[#282c3a] border border-[#2d3142]"
                    >
                      Upload Different File
                    </button>
                    <button
                      type="button"
                      onClick={handleLoadSample}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#fcd34d] hover:text-white bg-[#20232e] hover:bg-[#282c3a] border border-[#d4af37]/40"
                    >
                      Reload Sample Data
                    </button>
                  </div>
                </div>

                {/* Available Worksheets List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        Select Worksheet to Import
                      </h3>
                      <p className="text-xs text-stone-400">
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
                          className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'border-[#d4af37] bg-[#1a1b24] shadow-md'
                              : 'border-[#282c38] hover:border-stone-600 bg-[#181a22]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Layers className={`w-4 h-4 ${isSelected ? 'text-[#d4af37]' : 'text-stone-400'}`} />
                              <span className="font-bold text-sm text-white">
                                {sheetName}
                              </span>
                            </div>
                            {isSelected && (
                              <span className="w-5 h-5 rounded-full bg-[#d4af37] text-neutral-950 flex items-center justify-center text-xs font-bold">
                                ✓
                              </span>
                            )}
                          </div>

                          <div className="mt-3 pt-2 border-t border-[#252836] flex items-center justify-between text-xs text-stone-400">
                            <span>~{rowCount} rows detected</span>
                            <span className="text-[11px] font-semibold text-[#fcd34d]">
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
                      <span className="font-semibold text-stone-300">
                        Preview of Worksheet "{sheetData.selectedSheet}" (Header detected at Row {sheetData.headerRowIndex + 1}):
                      </span>
                      <span className="text-stone-400">{sheetData.totalRowCount} data rows found</span>
                    </div>

                    <div className="border border-[#282c38] rounded-2xl overflow-x-auto max-h-48 overflow-y-auto bg-[#181a22]">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-[#14161f] text-stone-400 font-semibold border-b border-[#282c38] sticky top-0">
                          <tr>
                            {sheetData.headers.slice(0, 7).map((h, i) => (
                              <th key={i} className="p-2.5 truncate max-w-[160px] text-white">{h}</th>
                            ))}
                            {sheetData.headers.length > 7 && (
                              <th className="p-2.5 text-stone-500">+{sheetData.headers.length - 7} more columns</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#252836] text-stone-300">
                          {sheetData.rawRows.slice(sheetData.headerRowIndex + 1, sheetData.headerRowIndex + 5).map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-[#20232e]">
                              {row.slice(0, 7).map((cell, cIdx) => (
                                <td key={cIdx} className="p-2.5 truncate max-w-[160px] text-stone-300">{String(cell || '—')}</td>
                              ))}
                              {row.length > 7 && (
                                <td key="more" className="p-2.5 text-stone-500 text-[10px]">...</td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Target Project & Destination Scope */}
                <div className="bg-[#181a22] border border-[#282c38] rounded-2xl p-5 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <FolderKanban className="w-4 h-4 text-[#d4af37]" />
                      Project Destination & Scope
                    </h3>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Choose whether to create a clean isolated project or import into an existing project.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Option 1: New Project */}
                    <div
                      onClick={() => setDestMode('new_project')}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        destMode === 'new_project'
                          ? 'border-[#d4af37] bg-[#20232e]'
                          : 'border-[#282c38] bg-[#14161f] hover:border-stone-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#d4af37]" />
                          Create New Project (Recommended)
                        </span>
                        {destMode === 'new_project' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#d4af37]/20 text-[#fcd34d] border border-[#d4af37]/40">
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-400 mb-3 leading-relaxed">
                        Creates a clean dedicated project with only these spreadsheet deliverables and auto-generates a workshop room.
                      </p>

                      {destMode === 'new_project' && (
                        <div className="space-y-3 pt-2 border-t border-[#2d3142]" onClick={(e) => e.stopPropagation()}>
                          <div>
                            <label className="block text-[11px] font-semibold text-stone-300 mb-1">Project Name</label>
                            <input
                              type="text"
                              value={newProjName}
                              onChange={(e) => setNewProjName(e.target.value)}
                              placeholder="e.g. Nova Platform June 2027 Deliverables"
                              className="w-full px-3 py-1.5 rounded-lg border border-[#3b4054] bg-[#121318] text-xs text-white focus:outline-none focus:border-[#d4af37]"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[11px] font-semibold text-stone-300 mb-1">Delivery Horizon</label>
                              <input
                                type="text"
                                value={newProjHorizon}
                                onChange={(e) => setNewProjHorizon(e.target.value)}
                                placeholder="e.g. June 2027"
                                className="w-full px-3 py-1.5 rounded-lg border border-[#3b4054] bg-[#121318] text-xs text-white focus:outline-none focus:border-[#d4af37]"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-stone-300 mb-1">Impact Metric</label>
                              <select
                                value={newProjImpactLabel}
                                onChange={(e) => setNewProjImpactLabel(e.target.value)}
                                className="w-full px-2 py-1.5 rounded-lg border border-[#3b4054] bg-[#121318] text-xs text-white focus:outline-none focus:border-[#d4af37]"
                              >
                                <option value="Member Impact">Member Impact</option>
                                <option value="Customer Impact">Customer Impact</option>
                                <option value="Business Impact">Business Impact</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Option 2: Existing Project */}
                    <div
                      onClick={() => setDestMode('existing_project')}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        destMode === 'existing_project'
                          ? 'border-[#d4af37] bg-[#20232e]'
                          : 'border-[#282c38] bg-[#14161f] hover:border-stone-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-400" />
                          Import into Existing Project
                        </span>
                        {destMode === 'existing_project' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-400 mb-3 leading-relaxed">
                        Imports deliverables into an existing project. You can cleanly replace previous dummy cards or merge.
                      </p>

                      {destMode === 'existing_project' && (
                        <div className="space-y-3 pt-2 border-t border-[#2d3142]" onClick={(e) => e.stopPropagation()}>
                          <div>
                            <label className="block text-[11px] font-semibold text-stone-300 mb-1">Select Target Project</label>
                            <select
                              value={selectedTargetProjId}
                              onChange={(e) => setSelectedTargetProjId(e.target.value)}
                              className="w-full px-3 py-1.5 rounded-lg border border-[#3b4054] bg-[#121318] text-xs text-white focus:outline-none focus:border-[#d4af37]"
                            >
                              {projects.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.workstreams?.length || 0} workstreams)
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-stone-300 mb-1">Overwrite Policy</label>
                            <div className="space-y-1.5">
                              <label className="flex items-center gap-2 text-[11px] text-stone-200 cursor-pointer">
                                <input
                                  type="radio"
                                  name="importActionRadio"
                                  checked={importAction === 'clean_replace'}
                                  onChange={() => setImportAction('clean_replace')}
                                  className="text-[#d4af37]"
                                />
                                <span><strong>Clean Replace (Recommended)</strong> — Overwrite previous cards so only this spreadsheet appears</span>
                              </label>
                              <label className="flex items-center gap-2 text-[11px] text-stone-200 cursor-pointer">
                                <input
                                  type="radio"
                                  name="importActionRadio"
                                  checked={importAction === 'update_merge'}
                                  onChange={() => setImportAction('update_merge')}
                                  className="text-[#d4af37]"
                                />
                                <span><strong>Merge & Update</strong> — Keep existing cards, update matching records</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Step 1 Actions */}
                <div className="pt-4 border-t border-[#252836] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-400 hover:text-white"
                  >
                    Cancel Import
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#c59e2b] text-neutral-950 text-xs font-bold shadow-md transition-all"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#181a22] p-4 rounded-2xl border border-[#282c38] text-xs">
              <div>
                <label className="block font-bold text-white mb-1">
                  Select Worksheet
                </label>
                <select
                  value={sheetData.selectedSheet}
                  onChange={(e) => handleSheetChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#282c38] bg-[#121318] text-white font-medium focus:outline-none focus:border-[#d4af37]"
                >
                  {sheetData.sheetNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-stone-400 mt-1">
                  Detected {sheetData.totalRowCount} data rows.
                </p>
              </div>

              <div>
                <label className="block font-bold text-white mb-1">
                  Header Row Number
                </label>
                <select
                  value={headerRowIdx}
                  onChange={(e) => handleHeaderRowChange(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-[#282c38] bg-[#121318] text-white font-medium focus:outline-none focus:border-[#d4af37]"
                >
                  {Array.from({ length: Math.min(15, sheetData.rawRows.length) }, (_, idx) => {
                    const rowPreview = (sheetData.rawRows[idx] || []).filter(Boolean).slice(0, 3).join(', ');
                    const isDetected = idx === headerRowIdx;
                    return (
                      <option key={idx} value={idx}>
                        Row {idx + 1} {isDetected ? '★ (Auto-detected Header)' : ''} &bull; {rowPreview || 'Empty'}...
                      </option>
                    );
                  })}
                </select>
                <p className="text-[11px] text-[#fcd34d] mt-1 font-semibold">
                  Row {headerRowIdx + 1} detected as table header containing {sheetData.headers.length} columns.
                </p>
              </div>
            </div>

            {/* Column Mapping Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Column Mappings
                  </h3>
                  <p className="text-xs text-stone-400">
                    Review suggested matches. Workstream and Deliverable title are strictly required.
                  </p>
                </div>
              </div>

              <div className="border border-[#282c38] rounded-2xl overflow-hidden max-h-96 overflow-y-auto bg-[#181a22]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#14161f] text-stone-400 font-semibold border-b border-[#282c38] sticky top-0">
                    <tr>
                      <th className="p-3">Application Field</th>
                      <th className="p-3">Requirement</th>
                      <th className="p-3">Mapped Spreadsheet Column</th>
                      <th className="p-3">Preview Value (Row 1)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#252836] text-stone-200">
                    {/* Record ID */}
                    <tr className="hover:bg-[#20232e]">
                      <td className="p-3 font-semibold text-white">Stable Card ID</td>
                      <td className="p-3 text-stone-400">Optional (Auto-generated if blank)</td>
                      <td className="p-3">
                        <select
                          value={columnMapping.recordIdCol || ''}
                          onChange={(e) => setColumnMapping({ ...columnMapping, recordIdCol: e.target.value || undefined })}
                          className="px-2.5 py-1.5 rounded-lg border border-[#282c38] bg-[#121318] text-white w-full text-xs"
                        >
                          <option value="">-- None (Auto-generate IDs) --</option>
                          {sheetData.headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 font-mono text-stone-400">{sheetData.rawRows[headerRowIdx + 1]?.[sheetData.headers.indexOf(columnMapping.recordIdCol || '')] || '-'}</td>
                    </tr>

                    {/* Workstream */}
                    <tr className="hover:bg-[#20232e]">
                      <td className="p-3 font-semibold text-white">Workstream Track</td>
                      <td className="p-3 text-rose-400 font-bold">Required</td>
                      <td className="p-3">
                        <select
                          value={columnMapping.workstreamCol || ''}
                          onChange={(e) => setColumnMapping({ ...columnMapping, workstreamCol: e.target.value || undefined })}
                          className="px-2.5 py-1.5 rounded-lg border border-[#282c38] bg-[#121318] text-white w-full text-xs font-semibold"
                        >
                          <option value="">-- Select Column --</option>
                          {sheetData.headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 text-stone-300 font-medium">{sheetData.rawRows[headerRowIdx + 1]?.[sheetData.headers.indexOf(columnMapping.workstreamCol || '')] || '-'}</td>
                    </tr>

                    {/* Workstream Lead */}
                    <tr className="hover:bg-[#20232e]">
                      <td className="p-3 font-semibold text-white">Workstream Lead</td>
                      <td className="p-3 text-stone-400">Optional (Assigned to track)</td>
                      <td className="p-3">
                        <select
                          value={columnMapping.workstreamLeadCol || ''}
                          onChange={(e) => setColumnMapping({ ...columnMapping, workstreamLeadCol: e.target.value || undefined })}
                          className="px-2.5 py-1.5 rounded-lg border border-[#282c38] bg-[#121318] text-white w-full text-xs"
                        >
                          <option value="">-- None --</option>
                          {sheetData.headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 text-stone-300">{sheetData.rawRows[headerRowIdx + 1]?.[sheetData.headers.indexOf(columnMapping.workstreamLeadCol || '')] || '-'}</td>
                    </tr>

                    {/* Deliverable */}
                    <tr className="hover:bg-[#20232e]">
                      <td className="p-3 font-semibold text-white">Deliverable (Card Title)</td>
                      <td className="p-3 text-rose-400 font-bold">Required</td>
                      <td className="p-3">
                        <select
                          value={columnMapping.deliverableCol || ''}
                          onChange={(e) => setColumnMapping({ ...columnMapping, deliverableCol: e.target.value || undefined })}
                          className="px-2.5 py-1.5 rounded-lg border border-[#282c38] bg-[#121318] text-white w-full text-xs font-semibold"
                        >
                          <option value="">-- Select Column --</option>
                          {sheetData.headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 text-white font-bold">{sheetData.rawRows[headerRowIdx + 1]?.[sheetData.headers.indexOf(columnMapping.deliverableCol || '')] || '-'}</td>
                    </tr>

                    {/* Activities */}
                    <tr className="hover:bg-[#20232e]">
                      <td className="p-3 font-semibold text-white">Initiatives / Activities</td>
                      <td className="p-3 text-stone-400">Optional (Description)</td>
                      <td className="p-3">
                        <select
                          value={columnMapping.activitiesCol || ''}
                          onChange={(e) => setColumnMapping({ ...columnMapping, activitiesCol: e.target.value || undefined })}
                          className="px-2.5 py-1.5 rounded-lg border border-[#282c38] bg-[#121318] text-white w-full text-xs"
                        >
                          <option value="">-- None --</option>
                          {sheetData.headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 text-stone-400 truncate max-w-xs">{sheetData.rawRows[headerRowIdx + 1]?.[sheetData.headers.indexOf(columnMapping.activitiesCol || '')] || '-'}</td>
                    </tr>

                    {/* Current Priority */}
                    <tr className="hover:bg-[#20232e]">
                      <td className="p-3 font-semibold text-white">Current Priority</td>
                      <td className="p-3 text-stone-400">Optional (P0-P3, High, Critical)</td>
                      <td className="p-3">
                        <select
                          value={columnMapping.currentPriorityCol || ''}
                          onChange={(e) => setColumnMapping({ ...columnMapping, currentPriorityCol: e.target.value || undefined })}
                          className="px-2.5 py-1.5 rounded-lg border border-[#282c38] bg-[#121318] text-white w-full text-xs"
                        >
                          <option value="">-- None --</option>
                          {sheetData.headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 font-mono text-[#fcd34d] font-bold">{sheetData.rawRows[headerRowIdx + 1]?.[sheetData.headers.indexOf(columnMapping.currentPriorityCol || '')] || '-'}</td>
                    </tr>

                    {/* Current Status */}
                    <tr className="hover:bg-[#20232e]">
                      <td className="p-3 font-semibold text-white">Current Status / Stage</td>
                      <td className="p-3 text-stone-400">Optional</td>
                      <td className="p-3">
                        <select
                          value={columnMapping.currentStatusCol || ''}
                          onChange={(e) => setColumnMapping({ ...columnMapping, currentStatusCol: e.target.value || undefined })}
                          className="px-2.5 py-1.5 rounded-lg border border-[#282c38] bg-[#121318] text-white w-full text-xs"
                        >
                          <option value="">-- None --</option>
                          {sheetData.headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 text-stone-300">{sheetData.rawRows[headerRowIdx + 1]?.[sheetData.headers.indexOf(columnMapping.currentStatusCol || '')] || '-'}</td>
                    </tr>

                    {/* Internal Owner */}
                    <tr className="hover:bg-[#20232e]">
                      <td className="p-3 font-semibold text-white">Internal Owner</td>
                      <td className="p-3 text-stone-400">Optional</td>
                      <td className="p-3">
                        <select
                          value={columnMapping.internalOwnerCol || ''}
                          onChange={(e) => setColumnMapping({ ...columnMapping, internalOwnerCol: e.target.value || undefined })}
                          className="px-2.5 py-1.5 rounded-lg border border-[#282c38] bg-[#121318] text-white w-full text-xs"
                        >
                          <option value="">-- None --</option>
                          {sheetData.headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 text-stone-300">{sheetData.rawRows[headerRowIdx + 1]?.[sheetData.headers.indexOf(columnMapping.internalOwnerCol || '')] || '-'}</td>
                    </tr>

                    {/* Partner Owner */}
                    <tr className="hover:bg-[#20232e]">
                      <td className="p-3 font-semibold text-white">Pearl / Partner Owner</td>
                      <td className="p-3 text-stone-400">Optional</td>
                      <td className="p-3">
                        <select
                          value={columnMapping.deliveryPartnerOwnerCol || ''}
                          onChange={(e) => setColumnMapping({ ...columnMapping, deliveryPartnerOwnerCol: e.target.value || undefined })}
                          className="px-2.5 py-1.5 rounded-lg border border-[#282c38] bg-[#121318] text-white w-full text-xs"
                        >
                          <option value="">-- None --</option>
                          {sheetData.headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 text-stone-300">{sheetData.rawRows[headerRowIdx + 1]?.[sheetData.headers.indexOf(columnMapping.deliveryPartnerOwnerCol || '')] || '-'}</td>
                    </tr>

                    {/* Existing Target Date */}
                    <tr className="hover:bg-[#20232e]">
                      <td className="p-3 font-semibold text-white">Target Date / Horizon</td>
                      <td className="p-3 text-stone-400">Optional</td>
                      <td className="p-3">
                        <select
                          value={columnMapping.targetEtaCol || ''}
                          onChange={(e) => setColumnMapping({ ...columnMapping, targetEtaCol: e.target.value || undefined })}
                          className="px-2.5 py-1.5 rounded-lg border border-[#282c38] bg-[#121318] text-white w-full text-xs"
                        >
                          <option value="">-- None --</option>
                          {sheetData.headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 text-stone-300">{sheetData.rawRows[headerRowIdx + 1]?.[sheetData.headers.indexOf(columnMapping.targetEtaCol || '')] || '-'}</td>
                    </tr>

                    {/* Dependencies & Notes */}
                    <tr className="hover:bg-[#20232e]">
                      <td className="p-3 font-semibold text-white">Dependencies & Notes</td>
                      <td className="p-3 text-stone-400">Optional</td>
                      <td className="p-3">
                        <select
                          value={columnMapping.dependenciesCol || ''}
                          onChange={(e) => setColumnMapping({ ...columnMapping, dependenciesCol: e.target.value || undefined })}
                          className="px-2.5 py-1.5 rounded-lg border border-[#282c38] bg-[#121318] text-white w-full text-xs"
                        >
                          <option value="">-- None --</option>
                          {sheetData.headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 text-stone-400 truncate max-w-xs">{sheetData.rawRows[headerRowIdx + 1]?.[sheetData.headers.indexOf(columnMapping.dependenciesCol || '')] || '-'}</td>
                    </tr>

                    {/* Workshop Assessments */}
                    <tr className="hover:bg-[#20232e]">
                      <td className="p-3 font-semibold text-white">Business Value</td>
                      <td className="p-3 text-stone-400">Optional</td>
                      <td className="p-3">
                        <select
                          value={columnMapping.businessValueCol || ''}
                          onChange={(e) => setColumnMapping({ ...columnMapping, businessValueCol: e.target.value || undefined })}
                          className="px-2.5 py-1.5 rounded-lg border border-[#282c38] bg-[#121318] text-white w-full text-xs"
                        >
                          <option value="">-- None --</option>
                          {sheetData.headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 text-stone-300">{sheetData.rawRows[headerRowIdx + 1]?.[sheetData.headers.indexOf(columnMapping.businessValueCol || '')] || '-'}</td>
                    </tr>

                    <tr className="hover:bg-[#20232e]">
                      <td className="p-3 font-semibold text-white">Member / Customer Impact</td>
                      <td className="p-3 text-stone-400">Optional</td>
                      <td className="p-3">
                        <select
                          value={columnMapping.impactCol || ''}
                          onChange={(e) => setColumnMapping({ ...columnMapping, impactCol: e.target.value || undefined })}
                          className="px-2.5 py-1.5 rounded-lg border border-[#282c38] bg-[#121318] text-white w-full text-xs"
                        >
                          <option value="">-- None --</option>
                          {sheetData.headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 text-stone-300">{sheetData.rawRows[headerRowIdx + 1]?.[sheetData.headers.indexOf(columnMapping.impactCol || '')] || '-'}</td>
                    </tr>

                    <tr className="hover:bg-[#20232e]">
                      <td className="p-3 font-semibold text-white">Session Decision / Disposition</td>
                      <td className="p-3 text-stone-400">Optional (Selected, Reserve, Defer)</td>
                      <td className="p-3">
                        <select
                          value={columnMapping.sessionDecisionCol || ''}
                          onChange={(e) => setColumnMapping({ ...columnMapping, sessionDecisionCol: e.target.value || undefined })}
                          className="px-2.5 py-1.5 rounded-lg border border-[#282c38] bg-[#121318] text-white w-full text-xs"
                        >
                          <option value="">-- None --</option>
                          {sheetData.headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 text-emerald-400 font-bold">{sheetData.rawRows[headerRowIdx + 1]?.[sheetData.headers.indexOf(columnMapping.sessionDecisionCol || '')] || '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#252836]">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-1 text-xs font-semibold text-stone-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Upload
              </button>
              <button
                type="button"
                onClick={proceedToProcessing}
                disabled={!columnMapping.workstreamCol || !columnMapping.deliverableCol}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#c59e2b] disabled:opacity-50 text-neutral-950 text-xs font-bold shadow-md transition-all"
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
              <h3 className="text-sm font-bold text-white">
                Workstream & Owner Resolution
              </h3>
              <p className="text-xs text-stone-400">
                Imported names appear immediately on cards without inventing emails, sending unsolicited invitations, or granting unauthorized access.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ownerAnalysis.map((owner) => (
                <div
                  key={owner.name}
                  className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                    owner.isGap
                      ? 'bg-amber-500/10 border-amber-500/40'
                      : 'bg-[#181a22] border-[#282c38]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <UserCheck className={`w-4 h-4 ${owner.isGap ? 'text-amber-400' : 'text-[#d4af37]'}`} />
                      <span className="font-bold text-xs text-white">
                        {owner.name || 'Blank / Unassigned'}
                      </span>
                      {owner.isGap && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400">
                          Ownership Gap
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-stone-400">
                      Found in <strong>{owner.occurrenceCount}</strong> item(s) &bull;{' '}
                      {owner.isGap
                        ? 'Flagged for explicit gap recording in workshop.'
                        : 'Display-only name; accounts not automatically linked.'}
                    </div>
                  </div>

                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#14161f] text-stone-300 shrink-0 border border-[#252836]">
                    {owner.isGap ? 'Gap Flagged' : 'Display Verified'}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#252836]">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center gap-1 text-xs font-semibold text-stone-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Mappings
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#c59e2b] text-neutral-950 text-xs font-bold shadow-md transition-all"
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
                <h3 className="text-sm font-bold text-white">
                  Data Validation & Row Inclusion
                </h3>
                <p className="text-xs text-stone-400">
                  {candidateRows.filter((r) => r.included).length} of {candidateRows.length} rows selected for import.
                </p>
              </div>
            </div>

            <div className="border border-[#282c38] rounded-2xl overflow-hidden max-h-96 overflow-y-auto bg-[#181a22]">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#14161f] text-stone-400 font-semibold border-b border-[#282c38] sticky top-0">
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
                <tbody className="divide-y divide-[#252836] text-stone-200">
                  {candidateRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className={`hover:bg-[#20232e] ${
                        !row.included ? 'opacity-40 bg-[#121318]' : ''
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
                      <td className="p-3 font-mono font-bold text-stone-400">{row.stableId}</td>
                      <td className="p-3 font-medium text-stone-300">{row.workstream}</td>
                      <td className="p-3 font-bold text-white max-w-xs truncate">{row.deliverable}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-400">
                          {row.deliveryStage}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#14161f] text-[#fcd34d] border border-[#2d3142]">
                          {row.currentPriority}
                        </span>
                      </td>
                      <td className="p-3 text-stone-300">{row.internalOwner || 'TBD'}</td>
                      <td className="p-3">
                        {row.isExistingCard ? (
                          <span className="text-[11px] font-semibold text-amber-400">
                            Existing Card ({row.existingDiff?.length || 0} diffs)
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-emerald-400">
                            New Deliverable
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#252836]">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex items-center gap-1 text-xs font-semibold text-stone-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Owners
              </button>
              <button
                type="button"
                onClick={() => setStep(5)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#c59e2b] text-neutral-950 text-xs font-bold shadow-md transition-all"
              >
                Review Safe Re-import Preview <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: PREVIEW & SAFE RE-IMPORT COMMIT */}
        {step === 5 && (
          <div className="p-6 space-y-6">
            <div className="bg-[#181a22] text-white p-5 rounded-2xl border border-[#282c38] space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-[#d4af37]" />
                Destination & Import Summary
              </h3>
              <p className="text-xs text-stone-300 leading-relaxed">
                Review your destination settings and policy before importing. TalonSync will formulate all unique workstreams, attach designated leads, and populate deliverables.
              </p>

              {/* Destination badge summary */}
              <div className="bg-[#121318] p-4 rounded-xl border border-[#2d3142] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="text-[11px] text-stone-400 font-semibold uppercase tracking-wider">
                    Destination Project
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#d4af37]" />
                    {destMode === 'new_project'
                      ? newProjName || 'New Project'
                      : activeDestProject?.name || 'Existing Project'}
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#20232e] text-stone-300 border border-[#3b4054]">
                      {destMode === 'new_project' ? 'Brand New Project' : 'Existing Project'}
                    </span>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-[11px] text-stone-400 font-semibold uppercase tracking-wider">
                    Action Policy
                  </div>
                  <div className="text-xs font-semibold text-[#fcd34d] mt-0.5">
                    {destMode === 'new_project'
                      ? 'Clean Project Creation + Default Workshop'
                      : importAction === 'clean_replace'
                      ? 'Clean Replace (Wipes previous dummy cards)'
                      : importAction === 'update_merge'
                      ? 'Merge & Update Cards'
                      : 'Append as New Items'}
                  </div>
                </div>
              </div>

              {destMode === 'existing_project' && (
                <div className="pt-2">
                  <label className="block text-xs font-bold text-white mb-2">Change Overwrite Policy:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label
                      onClick={() => setImportAction('clean_replace')}
                      className={`p-3 rounded-xl border cursor-pointer flex items-start gap-2.5 transition-colors ${
                        importAction === 'clean_replace'
                          ? 'border-[#d4af37] bg-[#20232e]'
                          : 'border-[#282c38] bg-[#14161f]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="step5Action"
                        checked={importAction === 'clean_replace'}
                        onChange={() => setImportAction('clean_replace')}
                        className="mt-0.5 text-[#d4af37]"
                      />
                      <div>
                        <div className="text-xs font-bold text-white">Clean Replace (Recommended)</div>
                        <div className="text-[11px] text-stone-400 mt-0.5">
                          Removes dummy/sample cards so only this spreadsheet's items exist.
                        </div>
                      </div>
                    </label>

                    <label
                      onClick={() => setImportAction('update_merge')}
                      className={`p-3 rounded-xl border cursor-pointer flex items-start gap-2.5 transition-colors ${
                        importAction === 'update_merge'
                          ? 'border-[#d4af37] bg-[#20232e]'
                          : 'border-[#282c38] bg-[#14161f]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="step5Action"
                        checked={importAction === 'update_merge'}
                        onChange={() => setImportAction('update_merge')}
                        className="mt-0.5 text-[#d4af37]"
                      />
                      <div>
                        <div className="text-xs font-bold text-white">Merge & Update</div>
                        <div className="text-[11px] text-stone-400 mt-0.5">
                          Updates matching cards and appends new deliverables.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Summary statistics */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-[#181a22] p-4 rounded-2xl border border-[#282c38]">
                <div className="text-2xl font-bold text-emerald-400">
                  {candidateRows.filter((r) => r.included).length}
                </div>
                <div className="text-xs text-stone-400 mt-1">Deliverables to Import</div>
              </div>

              <div className="bg-[#181a22] p-4 rounded-2xl border border-[#282c38]">
                <div className="text-2xl font-bold text-[#d4af37]">
                  {new Set(candidateRows.filter((r) => r.included).map((r) => r.workstream)).size}
                </div>
                <div className="text-xs text-stone-400 mt-1">Workstream Tracks</div>
              </div>

              <div className="bg-[#181a22] p-4 rounded-2xl border border-[#282c38]">
                <div className="text-2xl font-bold text-stone-400">
                  {candidateRows.filter((r) => !r.included).length}
                </div>
                <div className="text-xs text-stone-400 mt-1">Excluded Rows</div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#252836]">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="flex items-center gap-1 text-xs font-semibold text-stone-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Validation
              </button>
              <button
                type="button"
                onClick={handleCommitImport}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#c59e2b] text-neutral-950 text-xs font-bold shadow-lg transition-all"
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
