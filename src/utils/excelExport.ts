import * as XLSX from 'xlsx';
import {
  Project,
  Card,
  PlanningSession,
  SessionAssessment,
  FollowUpAction,
  CardComment,
} from '../types';

/**
 * Generates and downloads the Full Project Excel Workbook with 8 comprehensive sheets
 */
export function exportFullProjectExcel(
  project: Project,
  cards: Card[],
  sessions: PlanningSession[],
  assessmentsMap: Record<string, SessionAssessment>,
  actions: FollowUpAction[],
  comments: CardComment[]
) {
  const wb = XLSX.utils.book_new();

  // 1. README sheet
  const readmeData = [
    ['Product Planner - Project Export Specification'],
    ['Schema Version', '1.0.0'],
    ['Exported At', new Date().toISOString()],
    ['Project ID', project.id],
    ['Project Name', project.name],
    ['Target Horizon', project.targetHorizon],
    ['Impact Label', project.impactLabelName],
    ['Total Cards', cards.length],
    ['Total Workstreams', project.workstreams.length],
    ['Total Planning Sessions', sessions.length],
    ['Notes', 'Imported historical comments or decisions are marked as imported. A spreadsheet cannot manufacture a verified in-app approval.'],
  ];
  const wsReadme = XLSX.utils.aoa_to_sheet(readmeData);
  XLSX.utils.book_append_sheet(wb, wsReadme, 'README');

  // 2. CARDS sheet
  const cardsHeaders = [
    'Record ID',
    'Workstream',
    'Deliverable Title',
    'Activities / Scope',
    'Current Priority',
    'Delivery Stage',
    'Internal Owner',
    'Delivery Partner Owner',
    'Target Horizon',
    'Dependencies / Context',
    'Source Sheet',
    'Source Row',
    'Created At',
    'Updated At',
  ];
  const cardsData = [
    cardsHeaders,
    ...cards.map((c) => [
      c.id,
      c.workstreamName,
      c.title,
      c.description,
      c.currentPriority,
      c.currentStage,
      c.internalOwner,
      c.deliveryPartnerOwner,
      c.targetDateOrQuarter,
      c.dependencies,
      c.sourceMeta.sheetName || 'Manual',
      c.sourceMeta.rowNumber || '',
      c.createdAt,
      c.updatedAt,
    ]),
  ];
  const wsCards = XLSX.utils.aoa_to_sheet(cardsData);
  XLSX.utils.book_append_sheet(wb, wsCards, 'Cards');

  // 3. WORKSTREAMS sheet
  const wsHeaders = ['Workstream ID', 'Workstream Name', 'Lead Name', 'Lead Email', 'Display Order'];
  const wsData = [
    wsHeaders,
    ...project.workstreams.map((w) => [w.id, w.name, w.leadName, w.leadEmail || '', w.displayOrder]),
  ];
  const wsWorkstreams = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, wsWorkstreams, 'Workstreams');

  // 4. PEOPLE / ASSIGNMENTS sheet
  const peopleMap = new Map<string, { role: string; count: number; email?: string }>();
  cards.forEach((c) => {
    if (c.internalOwner) {
      const existing = peopleMap.get(c.internalOwner) || { role: 'Internal Owner', count: 0, email: c.internalOwnerEmail };
      existing.count++;
      peopleMap.set(c.internalOwner, existing);
    }
    if (c.deliveryPartnerOwner && c.deliveryPartnerOwner !== c.internalOwner) {
      const existing = peopleMap.get(c.deliveryPartnerOwner) || { role: 'Delivery Partner Owner', count: 0, email: c.deliveryPartnerOwnerEmail };
      existing.count++;
      peopleMap.set(c.deliveryPartnerOwner, existing);
    }
  });
  const peopleData = [
    ['Person Name', 'Role Type', 'Associated Cards Count', 'Linked Email / Status'],
    ...Array.from(peopleMap.entries()).map(([name, info]) => [
      name,
      info.role,
      info.count,
      info.email ? info.email : name.toUpperCase() === 'TBD' ? 'Ownership Gap (Unassigned)' : 'Display Only (Unlinked Account)',
    ]),
  ];
  const wsPeople = XLSX.utils.aoa_to_sheet(peopleData);
  XLSX.utils.book_append_sheet(wb, wsPeople, 'People & Assignments');

  // 5. SESSION ASSESSMENTS sheet
  const assessHeaders = [
    'Session ID',
    'Card ID',
    'Deliverable Title',
    'Proposed Priority',
    'Business Value',
    project.impactLabelName,
    'Urgency',
    'Effort',
    'Workstream Rank',
    'Workshop Disposition',
    'Milestone / Outcome',
    'Team Rationale',
    'Validation Needs',
    'Last Edited By',
    'Last Edited At',
    'Version',
  ];
  const assessRows = Object.values(assessmentsMap).map((a) => {
    const card = cards.find((c) => c.id === a.cardId);
    return [
      a.sessionId,
      a.cardId,
      card ? card.title : '',
      a.proposedPriority,
      a.businessValue,
      a.memberImpact,
      a.urgency,
      a.effort,
      a.workstreamRank ?? '',
      a.decision,
      a.milestoneOutcome,
      a.teamRationale,
      a.validationNeeds,
      a.lastEditedBy,
      a.lastEditedAt,
      a.version,
    ];
  });
  const wsAssessments = XLSX.utils.aoa_to_sheet([assessHeaders, ...assessRows]);
  XLSX.utils.book_append_sheet(wb, wsAssessments, 'Session Assessments');

  // 6. COMMENTS sheet
  const commentHeaders = ['Comment ID', 'Session ID', 'Card ID', 'Author', 'Role', 'Comment Body', 'Timestamp', 'Is Imported'];
  const commentRows = comments.map((comm) => [
    comm.id,
    comm.sessionId,
    comm.cardId,
    comm.authorName,
    comm.authorRole,
    comm.content,
    comm.createdAt,
    comm.isImported ? 'Yes' : 'No',
  ]);
  const wsComments = XLSX.utils.aoa_to_sheet([commentHeaders, ...commentRows]);
  XLSX.utils.book_append_sheet(wb, wsComments, 'Comments');

  // 7. DECISIONS sheet (Summary of Agreed Dispositions)
  const decisionHeaders = ['Card ID', 'Deliverable Title', 'Workstream', 'Workshop Decision', 'Agreed Priority', 'Target Milestone', 'Rationale'];
  const decisionRows = Object.values(assessmentsMap)
    .filter((a) => a.decision !== 'Not Discussed')
    .map((a) => {
      const card = cards.find((c) => c.id === a.cardId);
      return [
        a.cardId,
        card?.title || '',
        card?.workstreamName || '',
        a.decision,
        a.proposedPriority,
        a.milestoneOutcome,
        a.teamRationale,
      ];
    });
  const wsDecisions = XLSX.utils.aoa_to_sheet([decisionHeaders, ...decisionRows]);
  XLSX.utils.book_append_sheet(wb, wsDecisions, 'Decisions');

  // 8. ACTIONS sheet
  const actionHeaders = ['Action ID', 'Session ID', 'Card ID', 'Action Description', 'Owner', 'Due Date', 'Status', 'Created At'];
  const actionRows = actions.map((act) => [
    act.id,
    act.sessionId,
    act.cardId,
    act.action,
    act.owner,
    act.dueDate,
    act.status,
    act.createdAt,
  ]);
  const wsActions = XLSX.utils.aoa_to_sheet([actionHeaders, ...actionRows]);
  XLSX.utils.book_append_sheet(wb, wsActions, 'Follow-up Actions');

  // Generate file name & trigger browser download
  const cleanProjName = project.name.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(wb, `${cleanProjName}_Full_Project_Record_${formatDate(new Date())}.xlsx`);
}

/**
 * Generates Session Results Excel with Assessments, Stakeholder Comments, Action Items, and Executive Summary
 */
export function exportSessionResultsExcel(
  session: PlanningSession,
  project: Project,
  cards: Card[],
  assessmentsMap: Record<string, SessionAssessment>,
  actions: FollowUpAction[],
  comments: CardComment[] = []
) {
  const wb = XLSX.utils.book_new();

  // 1. Executive Summary Sheet
  const selectedCount = cards.filter((c) => assessmentsMap[c.id]?.decision === 'Selected').length;
  const reserveCount = cards.filter((c) => assessmentsMap[c.id]?.decision === 'Reserve').length;
  const deferCount = cards.filter((c) => assessmentsMap[c.id]?.decision === 'Defer').length;
  const dropCount = cards.filter((c) => assessmentsMap[c.id]?.decision === 'Drop').length;
  const needsValCount = cards.filter((c) => assessmentsMap[c.id]?.decision === 'Needs Validation').length;
  const notDiscussedCount = cards.length - (selectedCount + reserveCount + deferCount + dropCount + needsValCount);

  const summaryData = [
    ['MEETING OUTCOME & EXECUTIVE SUMMARY'],
    ['Session Name', session.name],
    ['Project', project.name],
    ['Meeting Date', `${session.date} (${session.timeZone})`],
    ['Delivery Horizon', session.deliveryHorizon],
    ['Facilitator', session.facilitatorName],
    ['Meeting Objective', session.objective || 'N/A'],
    ['Version Revision', `Rev ${session.version}`],
    ['Status Stage', session.stage.toUpperCase()],
    ['Exported On', new Date().toLocaleString()],
    [],
    ['DECISION & DISPOSITION BREAKDOWN'],
    ['Metric', 'Count', 'Description'],
    ['Selected (In-Scope Commitment)', selectedCount, 'Agreed high-priority scope for target delivery horizon'],
    ['Reserve (Secondary Candidates)', reserveCount, 'Buffer candidates pending capacity confirmation'],
    ['Deferred (Future Scope)', deferCount, 'Scheduled for post-horizon milestones'],
    ['Drop (Out of Scope)', dropCount, 'Excluded from future roadmap'],
    ['Needs Validation (Flagged Gaps)', needsValCount, 'Pending critical architecture, legal, or dependency resolution'],
    ['Not Discussed / Pending', notDiscussedCount, 'Unreviewed items'],
    ['Total Deliverables Reviewed', cards.length, 'Total backlog items'],
    ['Total Action Items Logged', actions.length, 'Specific deliverables with assigned owners & deadlines'],
    ['Total Stakeholder Comments Logged', comments.length, 'Individual comments across workstreams & cards'],
    [],
    ['WORKSHOP AGENDA & TOPICS'],
    ['Topic', 'Allocated Mins', 'Completed Status'],
    ...session.agenda.map((item) => [item.title, `${item.allocatedMinutes || 15}m`, item.completed ? 'COMPLETED' : 'PENDING']),
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive Summary');

  // 2. Deliverables & Assessments Sheet
  const headers = [
    'Record ID',
    'Workstream',
    'Deliverable Title',
    'Delivery Stage',
    'Current Priority',
    'Proposed Priority',
    'Business Value',
    project.impactLabelName,
    'Urgency',
    'Effort',
    'Rank',
    'Workshop Decision',
    'Internal Owner',
    'Partner Owner',
    'Milestone / Outcome',
    'Team Rationale & Discussion',
    'Validation Needs / Flagged Gaps',
  ];

  const rows = cards.map((card) => {
    const a = assessmentsMap[card.id];
    return [
      card.id,
      card.workstreamName,
      card.title,
      card.currentStage,
      card.currentPriority,
      a ? a.proposedPriority : 'Unprioritized',
      a ? a.businessValue : 'Unknown',
      a ? a.memberImpact : 'Unknown',
      a ? a.urgency : 'Unknown',
      a ? a.effort : 'Unknown',
      a?.workstreamRank ?? '',
      a ? a.decision : 'Not Discussed',
      card.internalOwner,
      card.deliveryPartnerOwner,
      a ? a.milestoneOutcome : '',
      a ? a.teamRationale : '',
      a ? a.validationNeeds : '',
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([
    [`Session Results: ${session.name}`],
    [`Meeting Date: ${session.date} (${session.timeZone}) | Target Horizon: ${session.deliveryHorizon}`],
    [`Facilitator: ${session.facilitatorName} | Version: Rev ${session.version}`],
    [],
    headers,
    ...rows,
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'Deliverable Decisions');

  // 3. Stakeholder Comments Sheet
  const cardMap = new Map<string, Card>(cards.map((c) => [c.id, c]));
  const commentsHeaders = [
    'Comment ID',
    'Card ID',
    'Deliverable Title',
    'Workstream',
    'Author Name',
    'Author Role',
    'Comment & Discussion Note',
    'Timestamp',
  ];
  const commentsRows = comments.map((comm) => {
    const c = cardMap.get(comm.cardId);
    return [
      comm.id,
      comm.cardId,
      c ? c.title : '',
      c ? c.workstreamName : '',
      comm.authorName,
      comm.authorRole,
      comm.content,
      comm.createdAt,
    ];
  });

  const wsComments = XLSX.utils.aoa_to_sheet([
    [`Stakeholder Discussion Comments (${comments.length} Total)`],
    [`Captured during ${session.name}`],
    [],
    commentsHeaders,
    ...commentsRows,
  ]);
  XLSX.utils.book_append_sheet(wb, wsComments, 'Stakeholder Comments');

  // 4. Action Items Sheet
  const actHeaders = [
    'Action ID',
    'Card ID',
    'Linked Deliverable',
    'Workstream',
    'Follow-up Action Description',
    'Accountable Owner',
    'Due Date',
    'Status',
  ];
  const actRows = actions.map((act) => {
    const c = cardMap.get(act.cardId);
    return [
      act.id,
      act.cardId,
      c ? c.title : '',
      c ? c.workstreamName : '',
      act.action,
      act.owner,
      act.dueDate,
      act.status.toUpperCase(),
    ];
  });

  const actWs = XLSX.utils.aoa_to_sheet([
    [`Follow-Up Action Items (${actions.length} Total)`],
    [`Agreed during ${session.name}`],
    [],
    actHeaders,
    ...actRows,
  ]);
  XLSX.utils.book_append_sheet(wb, actWs, 'Action Items');

  const cleanSessionName = session.name.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(wb, `${cleanSessionName}_Meeting_Outcome_${formatDate(new Date())}.xlsx`);
}

/**
 * Generates Filtered CSV file
 */
export function exportFilteredCsv(
  filename: string,
  headers: string[],
  rows: (string | number)[][]
) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
}

/**
 * Generates Downloadable Read-only HTML Snapshot
 */
export function exportDownloadableHtmlSnapshot(
  session: PlanningSession,
  project: Project,
  cards: Card[],
  assessmentsMap: Record<string, SessionAssessment>,
  actions: FollowUpAction[],
  comments: CardComment[] = []
) {
  const asOfDate = new Date().toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  const selectedCards = cards.filter((c) => assessmentsMap[c.id]?.decision === 'Selected');
  const reserveCards = cards.filter((c) => assessmentsMap[c.id]?.decision === 'Reserve');
  const deferredCards = cards.filter((c) => assessmentsMap[c.id]?.decision === 'Defer');
  const needsValidationCards = cards.filter((c) => assessmentsMap[c.id]?.decision === 'Needs Validation');
  const cardMap = new Map<string, Card>(cards.map((c) => [c.id, c]));

  const renderCardRow = (c: Card) => {
    const a = assessmentsMap[c.id];
    return `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px 12px; font-family: monospace; font-size: 12px; font-weight: 600; color: #475569;">${escapeHtml(c.id)}</td>
        <td style="padding: 10px 12px; font-size: 13px; font-weight: 500; color: #64748b;">${escapeHtml(c.workstreamName)}</td>
        <td style="padding: 10px 12px; font-size: 14px; font-weight: 600; color: #0f172a;">
          <div>${escapeHtml(c.title)}</div>
          <div style="font-size: 12px; color: #64748b; font-weight: normal; margin-top: 2px;">${escapeHtml(c.description)}</div>
        </td>
        <td style="padding: 10px 12px; text-align: center;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; background: #e0f2fe; color: #0369a1;">${escapeHtml(c.currentStage)}</span>
        </td>
        <td style="padding: 10px 12px; text-align: center;">
          <span style="color: #64748b; text-decoration: line-through; font-size: 12px;">${escapeHtml(c.currentPriority)}</span>
          <span style="font-weight: bold; margin-left: 6px; color: #0f172a;">${escapeHtml(a?.proposedPriority || c.currentPriority)}</span>
        </td>
        <td style="padding: 10px 12px; text-align: center;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700; ${getDecisionStyle(a?.decision)}">
            ${escapeHtml(a?.decision || 'Not Discussed')}
          </span>
        </td>
        <td style="padding: 10px 12px; font-size: 13px; color: #334155;">${escapeHtml(c.internalOwner || 'TBD')}</td>
        <td style="padding: 10px 12px; font-size: 13px; color: #047857; font-weight: 500;">${escapeHtml(a?.milestoneOutcome || c.targetDateOrQuarter)}</td>
        <td style="padding: 10px 12px; font-size: 12px; color: #475569;">${escapeHtml(a?.teamRationale || '-')}</td>
      </tr>
    `;
  };

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(session.name)} - Read-Only Snapshot</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 32px 24px; line-height: 1.5; }
    .container { max-width: 1200px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; overflow: hidden; }
    .header { background: #18191c; color: #ffffff; padding: 28px 36px; border-bottom: 3px solid #d4af37; }
    .snapshot-badge { display: inline-block; background: rgba(212,175,55,0.15); border: 1px solid #d4af37; color: #d4af37; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; padding: 4px 10px; border-radius: 9999px; margin-bottom: 8px; }
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; padding: 24px 36px; background: #fafaf9; border-bottom: 1px solid #e2e8f0; }
    .metric-card { background: #ffffff; padding: 14px 18px; border-radius: 8px; border: 1px solid #e2e8f0; }
    .metric-val { font-size: 24px; font-weight: 700; color: #0f172a; }
    .metric-label { font-size: 12px; color: #64748b; font-weight: 500; text-transform: uppercase; margin-top: 2px; }
    .content { padding: 32px 36px; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th { background: #f1f5f9; padding: 12px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; }
    .section-box { margin-top: 40px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    .footer { padding: 20px 36px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="snapshot-badge">PRD Verified HTML Snapshot &bull; Rev ${session.version}</div>
      <h1 style="margin: 0 0 6px 0; font-size: 26px;">${escapeHtml(session.name)}</h1>
      <p style="margin: 0; color: #94a3b8; font-size: 14px;">
        Project: <strong>${escapeHtml(project.name)}</strong> &bull; Meeting Date: ${escapeHtml(session.date)} (${escapeHtml(session.timeZone)}) &bull; Horizon: <strong>${escapeHtml(session.deliveryHorizon)}</strong> &bull; Facilitator: <strong>${escapeHtml(session.facilitatorName)}</strong>
      </p>
    </div>

    <div class="metrics">
      <div class="metric-card">
        <div class="metric-val" style="color: #15803d;">${selectedCards.length}</div>
        <div class="metric-label">Selected Backlog</div>
      </div>
      <div class="metric-card">
        <div class="metric-val" style="color: #b45309;">${reserveCards.length}</div>
        <div class="metric-label">Reserve Candidates</div>
      </div>
      <div class="metric-card">
        <div class="metric-val" style="color: #6b7280;">${deferredCards.length}</div>
        <div class="metric-label">Deferred / Drop</div>
      </div>
      <div class="metric-card">
        <div class="metric-val" style="color: #dc2626;">${needsValidationCards.length}</div>
        <div class="metric-label">Needs Validation</div>
      </div>
      <div class="metric-card">
        <div class="metric-val" style="color: #2563eb;">${actions.length}</div>
        <div class="metric-label">Action Items</div>
      </div>
      <div class="metric-card">
        <div class="metric-val" style="color: #7c3aed;">${comments.length}</div>
        <div class="metric-label">Comments Logged</div>
      </div>
    </div>

    <div class="content">
      <!-- Agenda Schedule -->
      <div style="margin-bottom: 32px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px 22px;">
        <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 15px; color: #0f172a;">Workshop Agenda & Topics</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 10px;">
          ${session.agenda
            .map(
              (ag) => `
            <div style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: ${ag.completed ? '#15803d' : '#475569'};">
              <span>${ag.completed ? '&#9989;' : '&#9675;'}</span>
              <span style="${ag.completed ? 'text-decoration: line-through;' : 'font-weight: 500;'}">${escapeHtml(ag.title)}</span>
              <span style="font-size: 11px; color: #94a3b8;">(${ag.allocatedMinutes || 15}m)</span>
            </div>
          `
            )
            .join('')}
        </div>
      </div>

      <h2 style="font-size: 18px; margin-top: 0; margin-bottom: 16px; color: #1e293b;">Agreed Working Session Backlog (${cards.length} Total)</h2>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Workstream</th>
            <th>Deliverable & Scope</th>
            <th style="text-align: center;">Stage</th>
            <th style="text-align: center;">Priority</th>
            <th style="text-align: center;">Decision</th>
            <th>Owner</th>
            <th>Milestone / Timing</th>
            <th>Rationale</th>
          </tr>
        </thead>
        <tbody>
          ${cards.map(renderCardRow).join('')}
        </tbody>
      </table>

      <!-- Action Items Section -->
      ${
        actions.length > 0
          ? `
        <div class="section-box">
          <div style="background: #f1f5f9; padding: 12px 18px; font-weight: 700; font-size: 14px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between;">
            <span>Follow-Up Action Items (${actions.length})</span>
            <span style="font-size: 12px; font-weight: normal; color: #64748b;">Accountable Owners & Target Due Dates</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Action ID</th>
                <th>Card ID</th>
                <th>Deliverable</th>
                <th>Action Description</th>
                <th>Accountable Owner</th>
                <th>Due Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${actions
                .map((a) => {
                  const c = cardMap.get(a.cardId);
                  return `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 10px 12px; font-family: monospace; font-size: 12px;">${escapeHtml(a.id)}</td>
                  <td style="padding: 10px 12px; font-family: monospace; font-size: 12px;">${escapeHtml(a.cardId)}</td>
                  <td style="padding: 10px 12px; font-size: 13px; font-weight: 500;">${escapeHtml(c?.title || '')}</td>
                  <td style="padding: 10px 12px; font-size: 13px; font-weight: 600;">${escapeHtml(a.action)}</td>
                  <td style="padding: 10px 12px; font-size: 13px; font-weight: 500;">${escapeHtml(a.owner)}</td>
                  <td style="padding: 10px 12px; font-size: 13px; color: #b45309; font-weight: bold;">${escapeHtml(a.dueDate)}</td>
                  <td style="padding: 10px 12px; text-transform: uppercase; font-size: 11px; font-weight: bold;">${escapeHtml(a.status)}</td>
                </tr>
              `;
                })
                .join('')}
            </tbody>
          </table>
        </div>
      `
          : ''
      }

      <!-- Stakeholder Comments & Discussion Notes Section -->
      ${
        comments.length > 0
          ? `
        <div class="section-box">
          <div style="background: #f1f5f9; padding: 12px 18px; font-weight: 700; font-size: 14px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between;">
            <span>Stakeholder Discussion Notes & Comments (${comments.length})</span>
            <span style="font-size: 12px; font-weight: normal; color: #64748b;">Recorded in Session</span>
          </div>
          <table>
            <thead>
              <tr>
                <th>Deliverable</th>
                <th>Author</th>
                <th>Role</th>
                <th>Comment / Contribution</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              ${comments
                .map((comm) => {
                  const c = cardMap.get(comm.cardId);
                  return `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 10px 12px; font-size: 12px;">
                    <strong style="font-family: monospace; color: #475569;">${escapeHtml(comm.cardId)}</strong>: ${escapeHtml(c?.title || '')}
                  </td>
                  <td style="padding: 10px 12px; font-size: 13px; font-weight: 600;">${escapeHtml(comm.authorName)}</td>
                  <td style="padding: 10px 12px; font-size: 11px; text-transform: uppercase; color: #64748b;">${escapeHtml(comm.authorRole)}</td>
                  <td style="padding: 10px 12px; font-size: 13px; color: #1e293b;">${escapeHtml(comm.content)}</td>
                  <td style="padding: 10px 12px; font-size: 11px; color: #94a3b8; white-space: nowrap;">${new Date(comm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                </tr>
              `;
                })
                .join('')}
            </tbody>
          </table>
        </div>
      `
          : ''
      }
    </div>

    <div class="footer">
      Generated as verified outcome snapshot on <strong>${asOfDate}</strong>. All assessments, notes, and confirmed dispositions are preserved verbatim.
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
  const cleanSessionName = session.name.replace(/[^a-zA-Z0-9]/g, '_');
  downloadBlob(blob, `${cleanSessionName}_Outcome_Snapshot_${formatDate(new Date())}.html`);
}

/**
 * Generates formatted Markdown string for copying to Slack, MS Teams, Email, or Jira
 */
export function generateMeetingSummaryMarkdown(
  session: PlanningSession,
  project: Project,
  cards: Card[],
  assessmentsMap: Record<string, SessionAssessment>,
  actions: FollowUpAction[],
  comments: CardComment[] = []
): string {
  const cardMap = new Map<string, Card>(cards.map((c) => [c.id, c]));

  const selectedCards = cards.filter((c) => assessmentsMap[c.id]?.decision === 'Selected');
  const reserveCards = cards.filter((c) => assessmentsMap[c.id]?.decision === 'Reserve');
  const deferredCards = cards.filter((c) => assessmentsMap[c.id]?.decision === 'Defer');
  const dropCards = cards.filter((c) => assessmentsMap[c.id]?.decision === 'Drop');
  const needsValCards = cards.filter((c) => assessmentsMap[c.id]?.decision === 'Needs Validation');

  let md = `# 🎯 Planning Session Outcome: ${session.name}\n\n`;
  md += `**Project:** ${project.name} | **Target Horizon:** ${session.deliveryHorizon}\n`;
  md += `**Date:** ${session.date} (${session.timeZone}) | **Facilitator:** ${session.facilitatorName}\n`;
  if (session.objective) {
    md += `**Objective:** ${session.objective}\n`;
  }
  md += `\n---\n\n`;

  md += `### 📊 Executive Decision Breakdown\n`;
  md += `- **Selected (In-Scope Commitment):** ${selectedCards.length}\n`;
  md += `- **Reserve (Secondary Buffer):** ${reserveCards.length}\n`;
  md += `- **Deferred (Post-Horizon):** ${deferredCards.length}\n`;
  md += `- **Drop (Out of Scope):** ${dropCards.length}\n`;
  md += `- **Needs Validation (Flagged Gaps):** ${needsValCards.length}\n`;
  md += `- **Total Deliverables Reviewed:** ${cards.length}\n`;
  md += `- **Total Follow-Up Actions:** ${actions.length}\n`;
  md += `- **Total Stakeholder Comments:** ${comments.length}\n\n`;

  if (selectedCards.length > 0) {
    md += `### ✅ Selected High-Priority Deliverables\n`;
    selectedCards.forEach((c) => {
      const a = assessmentsMap[c.id];
      md += `- **[${c.id}] ${c.title}** (${c.workstreamName})\n`;
      md += `  - Priority: \`${a?.proposedPriority || c.currentPriority}\` | Owner: ${c.internalOwner || 'TBD'} | Milestone: ${a?.milestoneOutcome || c.targetDateOrQuarter}\n`;
      if (a?.teamRationale) {
        md += `  - Rationale: _${a.teamRationale}_\n`;
      }
    });
    md += `\n`;
  }

  if (actions.length > 0) {
    md += `### 📋 Follow-Up Action Items (${actions.length})\n`;
    actions.forEach((act, idx) => {
      const c = cardMap.get(act.cardId);
      md += `${idx + 1}. **${act.action}**\n`;
      md += `   - **Owner:** ${act.owner} | **Due Date:** ${act.dueDate} | **Status:** ${act.status.toUpperCase()}\n`;
      md += `   - **Deliverable:** [${act.cardId}] ${c?.title || ''}\n`;
    });
    md += `\n`;
  }

  if (needsValCards.length > 0) {
    md += `### ⚠️ Validation Needs & Gaps (${needsValCards.length})\n`;
    needsValCards.forEach((c) => {
      const a = assessmentsMap[c.id];
      md += `- **[${c.id}] ${c.title}**: ${a?.validationNeeds || 'Requires confirmation'}\n`;
    });
    md += `\n`;
  }

  if (comments.length > 0) {
    md += `### 💬 Stakeholder Discussion Notes (${comments.length})\n`;
    comments.forEach((comm) => {
      const c = cardMap.get(comm.cardId);
      md += `- **${comm.authorName}** (${comm.authorRole}) on _[${comm.cardId}] ${c?.title || ''}_:\n`;
      md += `  > "${comm.content}"\n`;
    });
    md += `\n`;
  }

  md += `---\n_Generated from Product Planner on ${new Date().toLocaleDateString()}_`;
  return md;
}

function getDecisionStyle(decision?: string): string {
  switch (decision) {
    case 'Selected':
      return 'background: #dcfce7; color: #15803d; border: 1px solid #86efac;';
    case 'Reserve':
      return 'background: #fef3c7; color: #b45309; border: 1px solid #fcd34d;';
    case 'Defer':
      return 'background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1;';
    case 'Drop':
      return 'background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5;';
    case 'Needs Validation':
      return 'background: #ffedd5; color: #c2410c; border: 1px solid #fdba74;';
    default:
      return 'background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0;';
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const exportSessionToExcel = exportSessionResultsExcel;
export const exportSessionToHtml = exportDownloadableHtmlSnapshot;
