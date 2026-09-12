import * as XLSX from 'xlsx';
import { Card, Workstream, Priority, DeliveryStage, BusinessValue, Impact, Urgency, Effort, WorkshopDisposition } from '../types';

export interface ParsedSheetData {
  sheetNames: string[];
  selectedSheet: string;
  rawRows: any[][];
  headerRowIndex: number;
  headers: string[];
  totalRowCount: number;
}

export interface ColumnMappingConfig {
  recordIdCol?: string;
  workstreamCol?: string;
  deliverableCol?: string;
  activitiesCol?: string;
  workstreamLeadCol?: string;
  internalOwnerCol?: string;
  deliveryPartnerOwnerCol?: string;
  currentPriorityCol?: string;
  currentStatusCol?: string;
  targetEtaCol?: string;
  dependenciesCol?: string;
  businessValueCol?: string;
  impactCol?: string;
  urgencyCol?: string;
  effortCol?: string;
  workstreamRankCol?: string;
  sessionDecisionCol?: string;
  milestoneOutcomeCol?: string;
  teamRationaleCol?: string;
  customColumns: string[];
}

export interface ImportCandidateRow {
  rowIndex: number;
  stableId: string;
  workstream: string;
  deliverable: string;
  activities: string;
  workstreamLead: string;
  internalOwner: string;
  deliveryPartnerOwner: string;
  currentPriority: Priority;
  currentStatus: string;
  deliveryStage: DeliveryStage;
  targetEta: string;
  dependencies: string;
  businessValue: BusinessValue;
  impact: Impact;
  urgency: Urgency;
  effort: Effort;
  workstreamRank?: number;
  sessionDecision: WorkshopDisposition;
  milestoneOutcome: string;
  teamRationale: string;
  customFields: Record<string, string>;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  included: boolean;
  isExistingCard: boolean;
  existingDiff?: {
    field: string;
    oldVal: string;
    newVal: string;
  }[];
}

export interface OwnerResolutionInfo {
  name: string;
  occurrenceCount: number;
  matchedEmail?: string;
  isLinked: boolean;
  isGap: boolean; // e.g. "TBD"
  suggestedAction: 'link' | 'keep_unlinked' | 'flag_gap' | 'resolve_duplicate';
}

/**
 * Parses an ArrayBuffer or binary string into SheetJS workbook
 */
export function parseWorkbookFile(data: ArrayBuffer | Uint8Array): XLSX.WorkBook {
  return XLSX.read(data, {
    type: 'array',
    cellFormula: true,
    cellDates: true,
    raw: false, // get formatted text where available to preserve strings like "June 2027"
  });
}

/**
 * Extracts sheet data given workbook and sheet name
 */
export function extractSheetData(
  workbook: XLSX.WorkBook,
  sheetName: string,
  headerRowIndex: number = 0
): ParsedSheetData {
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new Error(`Sheet "${sheetName}" not found in workbook.`);
  }

  // Convert to 2D array
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  const headers: string[] = (rawRows[headerRowIndex] || []).map((h) => String(h || '').trim());

  return {
    sheetNames: workbook.SheetNames,
    selectedSheet: sheetName,
    rawRows,
    headerRowIndex,
    headers,
    totalRowCount: Math.max(0, rawRows.length - (headerRowIndex + 1)),
  };
}

/**
 * Auto-detects suggested column mapping based on standard enterprise field aliases
 */
export function suggestColumnMappings(headers: string[]): ColumnMappingConfig {
  const normalize = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '');

  const findMatch = (candidates: string[]): string | undefined => {
    return headers.find((h) => {
      const norm = normalize(h);
      return candidates.some((cand) => norm.includes(cand));
    });
  };

  const config: ColumnMappingConfig = {
    recordIdCol: findMatch(['recordid', 'cardid', 'itemid', 'id', 'ticketid', 'key']),
    workstreamCol: findMatch(['workstream', 'stream', 'pillar', 'track', 'epic']),
    deliverableCol: findMatch(['deliverable', 'title', 'itemname', 'feature', 'cardtitle', 'name']),
    activitiesCol: findMatch(['initiatives', 'activities', 'description', 'detail', 'scope', 'summary']),
    workstreamLeadCol: findMatch(['workstreamlead', 'streamlead', 'lead']),
    internalOwnerCol: findMatch(['internalowner', 'avmaisowner', 'clientowner', 'orgowner', 'owner']),
    deliveryPartnerOwnerCol: findMatch(['deliverypartnerowner', 'pearlowner', 'partnerowner', 'vendorowner']),
    currentPriorityCol: findMatch(['currentpriority', 'origpriority', 'priority', 'severity']),
    currentStatusCol: findMatch(['currentstatus', 'status', 'deliverystage', 'stage', 'phase']),
    targetEtaCol: findMatch(['existingeta', 'eta', 'targetdate', 'target', 'timeline', 'completiondate', 'targethorizon']),
    dependenciesCol: findMatch(['dependencies', 'notes', 'blockers', 'context']),
    businessValueCol: findMatch(['businessvalue', 'bizvalue', 'val']),
    impactCol: findMatch(['memberimpact', 'customerimpact', 'impact', 'stakeholderimpact']),
    urgencyCol: findMatch(['urgency', 'timesensitivity']),
    effortCol: findMatch(['effort', 'size', 'complexity', 'tshirtsize']),
    workstreamRankCol: findMatch(['workstreamrank', 'streamrank', 'rank', 'order']),
    sessionDecisionCol: findMatch(['sessiondecision', 'decision', 'disposition', 'workshopdisposition']),
    milestoneOutcomeCol: findOutcomeMatch(headers),
    teamRationaleCol: findMatch(['teamrationale', 'rationale', 'notes', 'discussion']),
    customColumns: [],
  };

  // Remaining unmapped headers become potential custom columns
  const mappedCols = new Set(Object.values(config).filter(Boolean));
  config.customColumns = headers.filter((h) => !mappedCols.has(h) && h.length > 0);

  return config;
}

function findOutcomeMatch(headers: string[]): string | undefined {
  const normList = headers.map((h) => ({ original: h, norm: h.toLowerCase() }));
  const match = normList.find((item) =>
    item.norm.includes('milestone') || item.norm.includes('outcome') || item.norm.includes('2027')
  );
  return match?.original;
}

/**
 * Normalizes priority values into P0, P1, P2, P3, or Unprioritized
 */
export function normalizePriority(val: any): Priority {
  if (!val) return 'Unprioritized';
  const str = String(val).trim().toUpperCase();
  if (str.includes('P0') || str.includes('CRITICAL') || str.includes('HIGHEST')) return 'P0';
  if (str.includes('P1') || str.includes('HIGH')) return 'P1';
  if (str.includes('P2') || str.includes('MED')) return 'P2';
  if (str.includes('P3') || str.includes('LOW')) return 'P3';
  return 'Unprioritized';
}

/**
 * Normalizes status into DeliveryStage
 */
export function normalizeDeliveryStage(val: any): DeliveryStage {
  if (!val) return 'Requirements';
  const str = String(val).trim().toLowerCase();
  if (str.includes('deliver') || str.includes('done') || str.includes('complete') || str.includes('closed')) return 'Delivered';
  if (str.includes('test') || str.includes('qa') || str.includes('uat') || str.includes('validat')) return 'Testing';
  if (str.includes('dev') || str.includes('progress') || str.includes('active') || str.includes('build')) return 'Development';
  return 'Requirements';
}

/**
 * Normalizes session workshop disposition
 */
export function normalizeDisposition(val: any): WorkshopDisposition {
  if (!val) return 'Not Discussed';
  const str = String(val).trim().toLowerCase();
  if (str.includes('select') || str.includes('approve') || str.includes('commit')) return 'Selected';
  if (str.includes('reserve') || str.includes('hold') || str.includes('backlog')) return 'Reserve';
  if (str.includes('defer') || str.includes('postpone') || str.includes('later')) return 'Defer';
  if (str.includes('drop') || str.includes('cancel') || str.includes('reject')) return 'Drop';
  if (str.includes('need') || str.includes('question') || str.includes('valid')) return 'Needs Validation';
  return 'Not Discussed';
}

/**
 * Parses and validates raw rows into Candidate Rows
 */
export function processImportRows(
  data: ParsedSheetData,
  mapping: ColumnMappingConfig,
  existingCards: Card[]
): ImportCandidateRow[] {
  const { rawRows, headerRowIndex, headers } = data;
  const existingMap = new Map<string, Card>(existingCards.map((c) => [c.id.toLowerCase(), c]));

  const getColVal = (row: any[], colName?: string): string => {
    if (!colName) return '';
    const idx = headers.indexOf(colName);
    if (idx === -1 || idx >= row.length) return '';
    const val = row[idx];
    return val !== undefined && val !== null ? String(val).trim() : '';
  };

  const results: ImportCandidateRow[] = [];

  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.every((c) => c === undefined || c === null || String(c).trim() === '')) {
      continue; // skip completely empty rows
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    const rawId = getColVal(row, mapping.recordIdCol);
    const workstream = getColVal(row, mapping.workstreamCol);
    const deliverable = getColVal(row, mapping.deliverableCol);
    const activities = getColVal(row, mapping.activitiesCol);
    const workstreamLead = getColVal(row, mapping.workstreamLeadCol);
    const internalOwner = getColVal(row, mapping.internalOwnerCol);
    const deliveryPartnerOwner = getColVal(row, mapping.deliveryPartnerOwnerCol);
    const currentPriority = normalizePriority(getColVal(row, mapping.currentPriorityCol));
    const currentStatus = getColVal(row, mapping.currentStatusCol);
    const deliveryStage = normalizeDeliveryStage(currentStatus);
    const targetEta = getColVal(row, mapping.targetEtaCol) || 'TBD';
    const dependencies = getColVal(row, mapping.dependenciesCol);
    const businessValue = (getColVal(row, mapping.businessValueCol) || 'Unknown') as BusinessValue;
    const impact = (getColVal(row, mapping.impactCol) || 'Unknown') as Impact;
    const urgency = (getColVal(row, mapping.urgencyCol) || 'Unknown') as Urgency;
    const effort = (getColVal(row, mapping.effortCol) || 'Unknown') as Effort;
    const rankRaw = getColVal(row, mapping.workstreamRankCol);
    const workstreamRank = rankRaw && !isNaN(Number(rankRaw)) ? Number(rankRaw) : undefined;
    const sessionDecision = normalizeDisposition(getColVal(row, mapping.sessionDecisionCol));
    const milestoneOutcome = getColVal(row, mapping.milestoneOutcomeCol);
    const teamRationale = getColVal(row, mapping.teamRationaleCol);

    // Collect custom columns
    const customFields: Record<string, string> = {};
    mapping.customColumns.forEach((col) => {
      const v = getColVal(row, col);
      if (v) customFields[col] = v;
    });

    // Required fields per PRD Section 5: Workstream and Deliverable title
    if (!workstream) {
      errors.push('Missing required Workstream name.');
    }
    if (!deliverable) {
      errors.push('Missing required Deliverable title.');
    }

    // Stable ID generation or validation
    let stableId = rawId;
    if (!stableId) {
      const cleanWs = workstream.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase() || 'ITM';
      stableId = `${cleanWs}-${String(r + 100).padStart(3, '0')}`;
      warnings.push(`Generated stable ID: ${stableId}`);
    }

    // Check for existing card and compute diff
    const existing = existingMap.get(stableId.toLowerCase());
    const isExistingCard = !!existing;
    const existingDiff: { field: string; oldVal: string; newVal: string }[] = [];

    if (existing) {
      if (existing.title !== deliverable) {
        existingDiff.push({ field: 'Title', oldVal: existing.title, newVal: deliverable });
      }
      if (existing.currentPriority !== currentPriority) {
        existingDiff.push({ field: 'Priority', oldVal: existing.currentPriority, newVal: currentPriority });
      }
      if (existing.currentStage !== deliveryStage) {
        existingDiff.push({ field: 'Stage', oldVal: existing.currentStage, newVal: deliveryStage });
      }
      if (existing.internalOwner !== internalOwner && internalOwner) {
        existingDiff.push({ field: 'Internal Owner', oldVal: existing.internalOwner, newVal: internalOwner });
      }
      if (existing.targetDateOrQuarter !== targetEta && targetEta) {
        existingDiff.push({ field: 'Target Horizon', oldVal: existing.targetDateOrQuarter, newVal: targetEta });
      }
    }

    // Owner checks
    if (!internalOwner || internalOwner.toLowerCase() === 'tbd') {
      warnings.push('Internal ownership gap (TBD)');
    }

    results.push({
      rowIndex: r,
      stableId,
      workstream,
      deliverable,
      activities,
      workstreamLead,
      internalOwner,
      deliveryPartnerOwner,
      currentPriority,
      currentStatus,
      deliveryStage,
      targetEta,
      dependencies,
      businessValue,
      impact,
      urgency,
      effort,
      workstreamRank,
      sessionDecision,
      milestoneOutcome,
      teamRationale,
      customFields,
      isValid: errors.length === 0,
      errors,
      warnings,
      included: errors.length === 0,
      isExistingCard,
      existingDiff,
    });
  }

  return results;
}

/**
 * Extracts unique owners and evaluates account matching status
 */
export function analyzeOwners(rows: ImportCandidateRow[]): OwnerResolutionInfo[] {
  const map = new Map<string, number>();

  rows.forEach((r) => {
    if (r.internalOwner) {
      map.set(r.internalOwner, (map.get(r.internalOwner) || 0) + 1);
    }
    if (r.deliveryPartnerOwner && r.deliveryPartnerOwner !== r.internalOwner) {
      map.set(r.deliveryPartnerOwner, (map.get(r.deliveryPartnerOwner) || 0) + 1);
    }
  });

  return Array.from(map.entries()).map(([name, count]) => {
    const isGap = name.trim().toUpperCase() === 'TBD' || name.trim() === '';
    const hasEmailInParen = name.includes('@');
    return {
      name,
      occurrenceCount: count,
      matchedEmail: hasEmailInParen ? name.match(/[\w.-]+@[\w.-]+/)?.[0] : undefined,
      isLinked: hasEmailInParen,
      isGap,
      suggestedAction: isGap ? 'flag_gap' : hasEmailInParen ? 'link' : 'keep_unlinked',
    };
  });
}
