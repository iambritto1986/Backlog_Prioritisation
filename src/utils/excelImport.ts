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
    raw: false, // preserve formatted text like "June 2027"
  });
}

/**
 * Intelligently scans rows 0 to 25 to locate the true table header row.
 * Detects header keywords like Deliverable, Workstream, Priority, Owner, Stage, Target Date.
 */
export function detectHeaderRow(rawRows: any[][]): number {
  if (!rawRows || rawRows.length === 0) return 0;

  const normalize = (h: any) =>
    String(h || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

  const HEADER_KEYWORDS = [
    'deliverable',
    'deliverables',
    'requirement',
    'requirements',
    'workstream',
    'track',
    'stream',
    'priority',
    'currentpriority',
    'origpriority',
    'owner',
    'internalowner',
    'avmaisowner',
    'pearlowner',
    'lead',
    'workstreamlead',
    'status',
    'state',
    'currentstate',
    'currentstatus',
    'stage',
    'target',
    'targetdate',
    'eta',
    'horizon',
    'activities',
    'initiatives',
    'businessvalue',
    'memberimpact',
    'impact',
    'urgency',
    'effort',
    'rank',
    'decision',
    'disposition',
    'milestone',
    'dependencies',
    'notes',
  ];

  let bestRowIndex = 0;
  let bestScore = 0;

  const maxScan = Math.min(25, rawRows.length);

  for (let r = 0; r < maxScan; r++) {
    const row = rawRows[r];
    if (!row || !Array.isArray(row)) continue;

    const nonBlankCells = row.filter((c) => c !== undefined && c !== null && String(c).trim().length > 0);
    if (nonBlankCells.length < 2) continue; // single-cell banner or empty row

    let rowScore = 0;
    const matchedKeywords = new Set<string>();

    for (const cell of nonBlankCells) {
      const normCell = normalize(cell);
      if (normCell.length < 2) continue;

      for (const kw of HEADER_KEYWORDS) {
        if (normCell === kw || normCell.includes(kw)) {
          if (!matchedKeywords.has(kw)) {
            matchedKeywords.add(kw);
            // Give higher weight to critical anchor columns
            if (kw.includes('deliverable') || kw.includes('requirement')) rowScore += 5;
            else if (kw.includes('workstream')) rowScore += 4;
            else if (kw.includes('priority')) rowScore += 3;
            else if (kw.includes('owner') || kw.includes('lead')) rowScore += 3;
            else if (kw.includes('target') || kw.includes('eta') || kw.includes('date')) rowScore += 2;
            else rowScore += 1;
          }
        }
      }
    }

    // A genuine header row will match multiple distinct header keywords across several columns
    if (rowScore > bestScore && matchedKeywords.size >= 2) {
      bestScore = rowScore;
      bestRowIndex = r;
    }
  }

  return bestRowIndex;
}

/**
 * Extracts sheet data given workbook and sheet name.
 * If headerRowIndex is not provided, automatically detects it.
 */
export function extractSheetData(
  workbook: XLSX.WorkBook,
  sheetName: string,
  headerRowIndex?: number
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

  const effectiveHeaderIndex =
    headerRowIndex !== undefined ? headerRowIndex : detectHeaderRow(rawRows);

  const headers: string[] = (rawRows[effectiveHeaderIndex] || [])
    .map((h) => String(h || '').trim())
    .filter((h) => h.length > 0);

  return {
    sheetNames: workbook.SheetNames,
    selectedSheet: sheetName,
    rawRows,
    headerRowIndex: effectiveHeaderIndex,
    headers,
    totalRowCount: Math.max(0, rawRows.length - (effectiveHeaderIndex + 1)),
  };
}

/**
 * Auto-detects suggested column mapping based on standard enterprise field aliases.
 * Avoids false positive overlaps (e.g. Workstream vs Workstream Lead vs Workstream Rank).
 */
export function suggestColumnMappings(headers: string[]): ColumnMappingConfig {
  const normalize = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '');

  const findStrict = (
    candidates: string[],
    excludeKeywords: string[] = []
  ): string | undefined => {
    // 1. Try exact normalized match first
    for (const h of headers) {
      const norm = normalize(h);
      const isExcluded = excludeKeywords.some((ex) => norm.includes(ex));
      if (!isExcluded && candidates.some((cand) => norm === cand)) {
        return h;
      }
    }

    // 2. Fall back to substring match
    for (const h of headers) {
      const norm = normalize(h);
      const isExcluded = excludeKeywords.some((ex) => norm.includes(ex));
      if (!isExcluded && candidates.some((cand) => norm.includes(cand))) {
        return h;
      }
    }

    return undefined;
  };

  const config: ColumnMappingConfig = {
    recordIdCol: findStrict(['recordid', 'cardid', 'itemid', 'id', 'ticketid', 'key']),
    workstreamCol: findStrict(
      ['workstream', 'functionaltrack', 'stream', 'pillar', 'track', 'epic'],
      ['lead', 'rank', 'owner', 'status']
    ),
    workstreamLeadCol: findStrict([
      'workstreamlead',
      'streamlead',
      'tracklead',
      'leadname',
      'lead',
    ]),
    deliverableCol: findStrict([
      'deliverable',
      'deliverables',
      'requirement',
      'requirements',
      'cardtitle',
      'feature',
      'userstory',
      'story',
      'itemname',
      'title',
      'name',
    ]),
    activitiesCol: findStrict([
      'initiativesactivities',
      'initiatives',
      'activities',
      'description',
      'scope',
      'detail',
      'details',
      'summary',
    ]),
    internalOwnerCol: findStrict(
      ['avmaisowner', 'internalowner', 'clientowner', 'orgowner', 'primaryowner', 'owner', 'assignee'],
      ['pearl', 'partner', 'vendor', 'lead', 'delivery']
    ),
    deliveryPartnerOwnerCol: findStrict([
      'pearlowner',
      'deliverypartnerowner',
      'deliverypartner',
      'partnerowner',
      'vendorowner',
      'partnerlead',
      'partner',
    ]),
    currentPriorityCol: findStrict([
      'currentpriority',
      'origpriority',
      'originalpriority',
      'initialpriority',
      'priority',
      'severity',
      'p0p3',
    ]),
    currentStatusCol: findStrict([
      'currentstate',
      'currentstatus',
      'deliverystage',
      'status',
      'state',
      'stage',
      'phase',
    ]),
    targetEtaCol: findStrict([
      'existingtargetdate',
      'existingeta',
      'targetdate',
      'targetdatequarter',
      'targethorizon',
      'timeline',
      'eta',
      'target',
      'completiondate',
      'horizon',
    ]),
    dependenciesCol: findStrict([
      'dependenciesnotes',
      'dependencies',
      'blockers',
      'notes',
      'context',
      'risks',
      'comments',
    ]),
    businessValueCol: findStrict(['businessvalue', 'bizvalue', 'value', 'bv'], ['member', 'impact']),
    impactCol: findStrict([
      'memberimpact',
      'customerimpact',
      'stakeholderimpact',
      'impact',
    ]),
    urgencyCol: findStrict(['urgency', 'timesensitivity', 'urgencyscore']),
    effortCol: findStrict(['effort', 'size', 'complexity', 'tshirtsize', 'tshirt', 'storypoints', 'points']),
    workstreamRankCol: findStrict(['workstreamrank', 'streamrank', 'priorityrank', 'rank', 'order']),
    sessionDecisionCol: findStrict([
      'sessiondecision',
      'workshopdecision',
      'workshopdisposition',
      'decision',
      'disposition',
    ]),
    milestoneOutcomeCol: findStrict([
      'june2027milestoneoutcome',
      'milestoneoutcome',
      'milestone',
      'targetoutcome',
      'outcome',
      'targetmilestone',
    ]),
    teamRationaleCol: findStrict([
      'teamrationale',
      'rationale',
      'alignmentnotes',
      'discussion',
      'rationaleandnotes',
    ]),
    customColumns: [],
  };

  // Remaining unmapped headers become potential custom columns
  const mappedCols = new Set(Object.values(config).filter(Boolean));
  config.customColumns = headers.filter((h) => !mappedCols.has(h) && h.length > 0);

  return config;
}

/**
 * Normalizes priority values into P0, P1, P2, P3, or Unprioritized
 */
export function normalizePriority(val: any): Priority {
  if (val === undefined || val === null) return 'Unprioritized';
  const str = String(val).trim().toUpperCase();
  if (!str || str === 'TBD' || str === 'NONE' || str === 'UNASSIGNED' || str === 'N/A') {
    return 'Unprioritized';
  }

  if (str === 'P0' || str.includes('P0') || str === '0' || str.includes('CRITICAL') || str.includes('HIGHEST') || str.includes('URGENT')) {
    return 'P0';
  }
  if (
    str === 'P1' ||
    str.includes('P1') ||
    str === '1' ||
    str.includes('HIGH') ||
    str.includes('MUST')
  ) {
    return 'P1';
  }
  if (
    str === 'P2' ||
    str.includes('P2') ||
    str === '2' ||
    str.includes('MED') ||
    str.includes('MEDIUM') ||
    str.includes('SHOULD')
  ) {
    return 'P2';
  }
  if (
    str === 'P3' ||
    str.includes('P3') ||
    str === '3' ||
    str.includes('LOW') ||
    str.includes('COULD') ||
    str.includes('NICE')
  ) {
    return 'P3';
  }

  return 'Unprioritized';
}

/**
 * Normalizes status into DeliveryStage
 */
export function normalizeDeliveryStage(val: any): DeliveryStage {
  if (!val) return 'Requirements';
  const str = String(val).trim().toLowerCase();
  if (str.includes('deliver') || str.includes('done') || str.includes('complete') || str.includes('closed') || str.includes('live')) {
    return 'Delivered';
  }
  if (str.includes('test') || str.includes('qa') || str.includes('uat') || str.includes('validat')) {
    return 'Testing';
  }
  if (str.includes('dev') || str.includes('progress') || str.includes('active') || str.includes('build') || str.includes('wip')) {
    return 'Development';
  }
  if (str.includes('arch') || str.includes('design') || str.includes('spec') || str.includes('concept')) {
    return 'Architecture & Design';
  }
  return 'Requirements';
}

/**
 * Normalizes session workshop disposition
 */
export function normalizeDisposition(val: any): WorkshopDisposition {
  if (!val) return 'Not Discussed';
  const str = String(val).trim().toLowerCase();
  if (str.includes('select') || str.includes('approve') || str.includes('commit') || str.includes('in-scope') || str.includes('in scope')) {
    return 'Selected';
  }
  if (str.includes('reserve') || str.includes('hold') || str.includes('buffer') || str.includes('secondary')) {
    return 'Reserve';
  }
  if (str.includes('defer') || str.includes('postpone') || str.includes('later') || str.includes('phase 2') || str.includes('phase2')) {
    return 'Defer';
  }
  if (str.includes('drop') || str.includes('cancel') || str.includes('reject') || str.includes('out of scope') || str.includes('out-of-scope')) {
    return 'Drop';
  }
  if (str.includes('need') || str.includes('question') || str.includes('valid') || str.includes('gap') || str.includes('tbd')) {
    return 'Needs Validation';
  }
  return 'Not Discussed';
}

/**
 * Normalizes assessment scale values (High, Medium, Low, Unknown)
 */
export function normalizeMetricValue(val: any): 'High' | 'Medium' | 'Low' | 'Unknown' {
  if (!val) return 'Unknown';
  const str = String(val).trim().toLowerCase();
  if (str.includes('high') || str.includes('critical') || str === 'h' || str === '3') return 'High';
  if (str.includes('med') || str === 'm' || str === '2') return 'Medium';
  if (str.includes('low') || str === 'l' || str === '1') return 'Low';
  return 'Unknown';
}

/**
 * Normalizes effort size (Small, Medium, Large, Unknown)
 */
export function normalizeEffort(val: any): Effort {
  if (!val) return 'Unknown';
  const str = String(val).trim().toLowerCase();
  if (str.includes('large') || str.includes('xl') || str.includes('heavy') || str === 'l' || str === '3') return 'Large';
  if (str.includes('med') || str === 'm' || str === '2') return 'Medium';
  if (str.includes('small') || str.includes('xs') || str === 's' || str === '1') return 'Small';
  return 'Unknown';
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
    if (!row || !Array.isArray(row)) continue;

    // Check if row has any non-empty cells
    const nonBlankCount = row.filter((c) => c !== undefined && c !== null && String(c).trim().length > 0).length;
    if (nonBlankCount === 0) continue;

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
    const businessValue = normalizeMetricValue(getColVal(row, mapping.businessValueCol)) as BusinessValue;
    const impact = normalizeMetricValue(getColVal(row, mapping.impactCol)) as Impact;
    const urgency = normalizeMetricValue(getColVal(row, mapping.urgencyCol)) as Urgency;
    const effort = normalizeEffort(getColVal(row, mapping.effortCol));
    const rankRaw = getColVal(row, mapping.workstreamRankCol);
    const workstreamRank = rankRaw && !isNaN(Number(rankRaw)) ? Number(rankRaw) : undefined;
    const sessionDecision = normalizeDisposition(getColVal(row, mapping.sessionDecisionCol));
    const milestoneOutcome = getColVal(row, mapping.milestoneOutcomeCol);
    const teamRationale = getColVal(row, mapping.teamRationaleCol);

    // Skip banner rows or subheader rows that are not real deliverable data
    if (!deliverable && !workstream) continue;
    if (deliverable.toLowerCase().startsWith('items under consideration') || deliverable.toLowerCase().includes('deliverables backlog')) {
      continue;
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Collect custom columns
    const customFields: Record<string, string> = {};
    mapping.customColumns.forEach((col) => {
      const v = getColVal(row, col);
      if (v) customFields[col] = v;
    });

    // Required fields: Workstream and Deliverable title
    if (!workstream) {
      errors.push('Missing required Workstream track.');
    }
    if (!deliverable) {
      errors.push('Missing required Deliverable title.');
    }

    // Stable ID generation or validation
    let stableId = rawId;
    if (!stableId) {
      const cleanWs = (workstream || 'ITM').replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase() || 'ITM';
      stableId = `${cleanWs}-${String(r + 100).padStart(3, '0')}`;
      warnings.push(`Auto-generated card ID: ${stableId}`);
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
