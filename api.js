// TalonSync — Prisma-backed REST API.
//
// This is the first real backend for the app: everything the client does
// today happens in one browser's localStorage (see
// src/services/PersistenceService.ts), which means nothing survives a
// redeploy, nothing syncs across devices, and share links vanish whenever
// the Render service restarts. This file gives every one of those
// operations a durable, server-verified equivalent — it deliberately
// mirrors src/services/types.ts's IPersistenceService method-for-method, so
// swapping the frontend over later is a mechanical exercise, not a redesign.
//
// IMPORTANT — this is additive. Nothing here is wired into the running
// frontend yet (PersistenceService.ts still uses localStorage exclusively).
// Mounting this router just makes the new endpoints exist; flipping the
// client over to them is a separate, deliberately-gated next step.
//
// Everything under this router requires a signed-in Clerk session
// (server.js only mounts it behind requireAuth()) except the guest-facing
// join-by-token endpoint, which is intentionally public — a guest has no
// Clerk account.

import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { clerkClient, getAuth } from '@clerk/express';
import { prisma } from './db.js';

export const apiRouter = Router();

// ---------------------------------------------------------------------------
// Enum translation
// ---------------------------------------------------------------------------
// Every enum in prisma/schema.prisma uses the same string values as
// src/types.ts EXCEPT WorkshopDisposition: two of its six values carry
// spaces on the frontend ('Needs Validation', 'Not Discussed') but Postgres
// enum labels can't contain spaces, so the schema declares them
// 'NeedsValidation' / 'NotDiscussed'. These two functions are the only
// enum translation this API needs.
const DISPOSITION_TO_DB = { 'Needs Validation': 'NeedsValidation', 'Not Discussed': 'NotDiscussed', 'Parking Lot': 'ParkingLot' };
const DISPOSITION_FROM_DB = { NeedsValidation: 'Needs Validation', NotDiscussed: 'Not Discussed', ParkingLot: 'Parking Lot' };
const toDbDisposition = (v) => DISPOSITION_TO_DB[v] || v;
const fromDbDisposition = (v) => DISPOSITION_FROM_DB[v] || v;

const iso = (d) => (d ? new Date(d).toISOString() : undefined);

// PlanningSession.date and FollowUpAction.dueDate are DateTime columns in
// Postgres (needed for sane sorting/comparison), but the frontend treats
// both as plain "YYYY-MM-DD" strings — fed directly into <input type="date">
// (which silently renders blank given anything else) and displayed as-is in
// several places (e.g. SessionRoom's "Due: {action.dueDate}"). Serializing
// them with the full `iso()` helper above round-trips a clean
// "2026-09-24" into "2026-09-24T00:00:00.000Z", which is what actually
// showed up in the UI once sessions started coming from the real backend
// instead of localStorage (which just stored the original string verbatim).
// This strips it back down to the date-only portion these fields need.
const dateOnly = (d) => (d ? new Date(d).toISOString().slice(0, 10) : undefined);

// ---------------------------------------------------------------------------
// Plan / trial / invite-limit logic
// ---------------------------------------------------------------------------
// Basic (free) workspaces can create session share links for 3 weeks from
// workspace creation; Pro/Enterprise have no trial ceiling. The 25-guest
// per-session cap (workspace.maxSessionGuests) applies regardless of tier —
// it's a room-size/clutter guard as much as a monetization lever.
const TRIAL_DAYS = 21;

function trialInfo(workspace) {
  const startedAt = new Date(workspace.trialStartedAt);
  const daysElapsed = (Date.now() - startedAt.getTime()) / (1000 * 60 * 60 * 24);
  const trialDaysRemaining = Math.max(0, Math.ceil(TRIAL_DAYS - daysElapsed));
  const trialActive = daysElapsed < TRIAL_DAYS;
  return { trialDaysRemaining, trialActive };
}

function canCreateInvite(workspace) {
  if (workspace.planTier !== 'Basic') return true;
  return trialInfo(workspace).trialActive;
}

// ---------------------------------------------------------------------------
// Serialization — Prisma rows -> the exact shapes src/types.ts expects
// ---------------------------------------------------------------------------
function serializeWorkstream(w) {
  return {
    id: w.id,
    projectId: w.projectId,
    name: w.name,
    leadName: w.leadName,
    leadEmail: w.leadEmail || undefined,
    displayOrder: w.displayOrder,
    color: w.color || undefined,
  };
}

function serializeProject(p) {
  return {
    id: p.id,
    workspaceId: p.workspaceId,
    name: p.name,
    description: p.description,
    targetHorizon: p.targetHorizon,
    impactLabelName: p.impactLabelName,
    workstreams: (p.workstreams || []).map(serializeWorkstream),
    createdAt: iso(p.createdAt),
    updatedAt: iso(p.updatedAt),
  };
}

function serializeCard(c) {
  return {
    id: c.id,
    projectId: c.projectId,
    workstreamId: c.workstreamId,
    workstreamName: c.workstream ? c.workstream.name : '',
    title: c.title,
    description: c.description,
    currentPriority: c.currentPriority,
    currentStage: c.currentStage,
    internalOwner: c.internalOwner,
    internalOwnerEmail: c.internalOwnerEmail || undefined,
    isInternalOwnerLinked: c.isInternalOwnerLinked,
    deliveryPartnerOwner: c.deliveryPartnerOwner || '',
    deliveryPartnerOwnerEmail: c.deliveryPartnerOwnerEmail || undefined,
    isDeliveryPartnerOwnerLinked: c.isDeliveryPartnerOwnerLinked,
    targetDateOrQuarter: c.targetDateOrQuarter || '',
    dependencies: c.dependencies || '',
    storyPoints: c.storyPoints ?? undefined,
    customFields: c.customFields || {},
    sourceMeta: c.sourceMeta || {},
    createdAt: iso(c.createdAt),
    updatedAt: iso(c.updatedAt),
  };
}

function serializeSession(s) {
  return {
    id: s.id,
    projectId: s.projectId,
    name: s.name,
    date: dateOnly(s.date) || '',
    timeZone: s.timeZone,
    objective: s.objective || '',
    deliveryHorizon: s.deliveryHorizon || '',
    agenda: s.agenda || [],
    stage: s.stage,
    closedAt: s.closedAt ? iso(s.closedAt) : undefined,
    facilitatorId: s.facilitatorId,
    facilitatorName: s.facilitator ? s.facilitator.name : '',
    activeCardId: s.activeCardId || undefined,
    activeWorkstreamId: s.activeWorkstreamId || undefined,
    isVotingActive: s.isVotingActive,
    version: s.version,
    versionSnapshots: (s.snapshots || []).map(serializeSnapshot),
    createdAt: iso(s.createdAt),
    updatedAt: iso(s.updatedAt),
  };
}

function serializeFeedback(f) {
  return {
    id: f.id,
    sessionId: f.sessionId,
    rating: f.rating,
    submittedAt: iso(f.submittedAt),
  };
}

function serializeSnapshot(v) {
  return {
    version: v.version,
    closedAt: iso(v.closedAt),
    closedBy: v.closedBy,
    summary: v.summary || '',
    assessmentsCount: v.assessmentsCount,
    selectedCount: v.selectedCount,
    actionsCount: v.actionsCount,
    dataSnapshot: v.dataSnapshot,
  };
}

function serializeAssessment(a) {
  return {
    sessionId: a.sessionId,
    cardId: a.cardId,
    proposedPriority: a.proposedPriority,
    businessValue: a.businessValue,
    memberImpact: a.memberImpact,
    urgency: a.urgency,
    effort: a.effort,
    storyPoints: a.storyPoints ?? undefined,
    workstreamRank: a.workstreamRank ?? null,
    decision: fromDbDisposition(a.decision),
    milestoneOutcome: a.milestoneOutcome || '',
    teamRationale: a.teamRationale || '',
    validationNeeds: a.validationNeeds || '',
    lastEditedBy: a.lastEditedBy,
    lastEditedAt: iso(a.lastEditedAt),
    version: a.version,
  };
}

function serializeAction(a) {
  return {
    id: a.id,
    sessionId: a.sessionId,
    cardId: a.cardId,
    action: a.action,
    owner: a.owner,
    dueDate: dateOnly(a.dueDate) || '',
    status: a.status,
    createdAt: iso(a.createdAt),
  };
}

function serializeComment(c) {
  return {
    id: c.id,
    sessionId: c.sessionId,
    cardId: c.cardId,
    authorId: c.authorId,
    authorName: c.author ? c.author.name : '',
    authorRole: c.authorRole,
    content: c.content,
    createdAt: iso(c.createdAt),
    updatedAt: c.updatedAt ? iso(c.updatedAt) : undefined,
    parentId: c.parentId || undefined,
    isImported: c.isImported,
  };
}

function serializeLog(l) {
  return {
    id: l.id,
    sessionId: l.sessionId,
    cardId: l.cardId || undefined,
    userId: l.userId,
    userName: l.user ? l.user.name : '',
    action: l.action,
    field: l.field || undefined,
    previousValue: l.previousValue || undefined,
    newValue: l.newValue || undefined,
    timestamp: iso(l.timestamp),
  };
}

// ---------------------------------------------------------------------------
// Auth bootstrap
// ---------------------------------------------------------------------------
// The app is single-tenant today (one team — Britto's — no multi-workspace
// UI exists anywhere in the codebase), so "authorization" here means: is
// this a real, signed-in Clerk user? Every signed-in user is a member of
// the one workspace and can read/write anything in it. That's not a step
// down from what's live today (localStorage has zero cross-device access
// control at all) — it's the first real gate this app has ever had. Per-role
// write restrictions (e.g. a Viewer shouldn't be able to edit cards) are a
// further layer, not part of this change.
let workspaceBootstrap = null;
async function getOrCreateWorkspace() {
  if (workspaceBootstrap) return workspaceBootstrap;
  workspaceBootstrap = (async () => {
    const existing = await prisma.workspace.findFirst();
    if (existing) return existing;
    return prisma.workspace.create({
      data: { name: 'TalonSync Workspace', organization: 'TalonSync' },
    });
  })();
  return workspaceBootstrap;
}

// Finds or creates the local User row for the signed-in Clerk identity.
// Runs on every request (cheap — indexed unique lookup by clerkUserId) so a
// user created in Clerk after this service last restarted is picked up
// immediately, not just at boot.
async function attachUser(req, res, next) {
  try {
    if (!prisma) {
      return res.status(503).json({ error: 'Database is not configured on this server yet' });
    }
    const { userId: clerkUserId } = getAuth(req);
    if (!clerkUserId) return res.status(401).json({ error: 'Not signed in' });

    let user = await prisma.user.findUnique({ where: { clerkUserId } });
    if (!user) {
      const workspace = await getOrCreateWorkspace();
      const clerkUser = await clerkClient.users.getUser(clerkUserId);
      const email =
        clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)
          ?.emailAddress ||
        clerkUser.emailAddresses[0]?.emailAddress ||
        `${clerkUserId}@talonsync.local`;
      const name =
        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
        clerkUser.username ||
        email.split('@')[0];

      // A user can already exist by email (e.g. seeded, or created via a
      // different sign-in method before) without a clerkUserId attached yet
      // — link the two instead of colliding on the unique email constraint.
      user = await prisma.user.upsert({
        where: { email },
        create: {
          clerkUserId,
          name,
          email,
          workspaceId: workspace.id,
          isVerified: true,
        },
        update: { clerkUserId, isVerified: true },
      });
    }

    req.dbUser = user;
    next();
  } catch (err) {
    next(err);
  }
}

apiRouter.use(attachUser);

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------
const workstreamInput = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  leadName: z.string().default(''),
  leadEmail: z.string().optional().nullable(),
  displayOrder: z.number().int().default(0),
  color: z.string().optional().nullable(),
});

const projectInput = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  description: z.string().default(''),
  targetHorizon: z.string().default(''),
  impactLabelName: z.string().default('Customer Impact'),
  workstreams: z.array(workstreamInput).default([]),
});

apiRouter.get('/projects', async (req, res, next) => {
  try {
    const workspace = await getOrCreateWorkspace();
    const projects = await prisma.project.findMany({
      where: { workspaceId: workspace.id },
      include: { workstreams: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json(projects.map(serializeProject));
  } catch (err) {
    next(err);
  }
});

// Plan/trial/invite-limit status for the signed-in user's workspace — the
// frontend (ShareSessionModal) uses this to show "X of 25 invites used" /
// "trial ends in N days" instead of the limits only ever showing up as a
// surprise 403.
apiRouter.get('/workspace/plan', async (req, res, next) => {
  try {
    const workspace = await getOrCreateWorkspace();
    const { trialDaysRemaining, trialActive } = trialInfo(workspace);
    res.json({
      planTier: workspace.planTier,
      trialStartedAt: iso(workspace.trialStartedAt),
      trialDaysRemaining,
      trialActive,
      maxSessionGuests: workspace.maxSessionGuests,
      canInvite: canCreateInvite(workspace),
    });
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/projects/:id', async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: { workstreams: true },
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(serializeProject(project));
  } catch (err) {
    next(err);
  }
});

// Mirrors saveProject's create-or-update-by-id semantics, plus upserting the
// project's whole workstreams array in the same call (the frontend always
// hands over the full Project object, workstreams included).
apiRouter.post('/projects', async (req, res, next) => {
  try {
    const parsed = projectInput.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid project payload', details: parsed.error.issues });
    }
    const workspace = await getOrCreateWorkspace();
    const { id, workstreams, ...fields } = parsed.data;

    const project = await prisma.project.upsert({
      where: { id: id || '__none__' },
      // Must keep `id` here: the frontend generates its own project id
      // (`proj-${Date.now()}`) up front and immediately uses it for the
      // session and every imported card *before* this response ever comes
      // back (see App.tsx's handleImportComplete). Omitting it let Prisma's
      // @default(cuid()) mint a different id than the one the client had
      // already committed to, so every following write keyed on the
      // client's id (saveSession, replaceCardsForProject) hit a foreign-key
      // violation against a project row that existed under a different id,
      // silently fell back to local storage, and left the real backend
      // with a correctly-named project/workstreams but zero cards.
      create: { ...fields, id, workspaceId: workspace.id },
      update: fields,
    });

    const keepIds = workstreams.filter((w) => w.id).map((w) => w.id);
    await prisma.workstream.deleteMany({
      where: { projectId: project.id, id: { notIn: keepIds.length ? keepIds : ['__none__'] } },
    });
    for (const w of workstreams) {
      const { id: wId, ...wFields } = w;
      await prisma.workstream.upsert({
        where: { id: wId || '__none__' },
        // Same fix as the project upsert above: keep the client-supplied
        // workstream id so cards whose workstreamId was computed
        // client-side (ExcelImportWizard / App.tsx) actually match a real
        // row instead of a freshly auto-generated one.
        create: { ...wFields, id: wId, projectId: project.id },
        update: wFields,
      });
    }

    const full = await prisma.project.findUnique({
      where: { id: project.id },
      include: { workstreams: true },
    });
    res.json(serializeProject(full));
  } catch (err) {
    next(err);
  }
});

// Not part of a stated v1 feature (no "delete project" button exists yet
// today's UI), but IPersistenceService/PersistenceService.ts already declares
// deleteProject and App.tsx already calls it — this was simply missing from
// the initial /api/db build. Cascades to workstreams/sessions/cards (and
// their own assessments/actions/comments/logs) via the schema's existing
// onDelete: Cascade relations.
apiRouter.delete('/projects/:id', async (req, res, next) => {
  try {
    await prisma.project.delete({ where: { id: req.params.id } }).catch((err) => {
      // P2025 = "record to delete does not exist" — deleting an id that's
      // already gone (double-click, retry, id only ever existed in a
      // client's stale localStorage copy) is a no-op, not a failure. Any
      // other error (DB unreachable, etc.) should surface for real instead
      // of being reported back to the client as a false success.
      if (err?.code !== 'P2025') throw err;
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

apiRouter.put('/projects/:projectId/workstreams/:workstreamId', async (req, res, next) => {
  try {
    const parsed = workstreamInput.safeParse({ ...req.body, id: req.params.workstreamId });
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid workstream payload', details: parsed.error.issues });
    }
    const { id, ...fields } = parsed.data;
    const ws = await prisma.workstream.upsert({
      where: { id },
      create: { ...fields, id, projectId: req.params.projectId },
      update: fields,
    });
    res.json(serializeWorkstream(ws));
  } catch (err) {
    next(err);
  }
});

apiRouter.delete('/projects/:projectId/workstreams/:workstreamId', async (req, res, next) => {
  try {
    await prisma.workstream.delete({ where: { id: req.params.workstreamId } }).catch(() => {});
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------
const cardInput = z.object({
  id: z.string().min(1).optional(),
  workstreamId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().default(''),
  currentPriority: z.enum(['P0', 'P1', 'P2', 'P3', 'Unprioritized']).default('Unprioritized'),
  currentStage: z.string().min(1),
  internalOwner: z.string().default(''),
  internalOwnerEmail: z.string().optional().nullable(),
  isInternalOwnerLinked: z.boolean().default(false),
  deliveryPartnerOwner: z.string().optional().nullable(),
  deliveryPartnerOwnerEmail: z.string().optional().nullable(),
  isDeliveryPartnerOwnerLinked: z.boolean().default(false),
  targetDateOrQuarter: z.string().optional().nullable(),
  dependencies: z.string().optional().nullable(),
  storyPoints: z.number().int().optional().nullable(),
  customFields: z.record(z.string(), z.unknown()).default({}),
  sourceMeta: z.record(z.string(), z.unknown()).default({}),
});

apiRouter.get('/projects/:projectId/cards', async (req, res, next) => {
  try {
    const cards = await prisma.card.findMany({
      where: { projectId: req.params.projectId },
      include: { workstream: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json(cards.map(serializeCard));
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/cards/:id', async (req, res, next) => {
  try {
    const card = await prisma.card.findUnique({
      where: { id: req.params.id },
      include: { workstream: true },
    });
    if (!card) return res.status(404).json({ error: 'Card not found' });
    res.json(serializeCard(card));
  } catch (err) {
    next(err);
  }
});

// Creates a brand new card (mirrors createCard — always inserts, never
// updates an existing id).
apiRouter.post('/projects/:projectId/cards', async (req, res, next) => {
  try {
    const parsed = cardInput.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid card payload', details: parsed.error.issues });
    }
    const { id, ...fields } = parsed.data;
    const card = await prisma.card.create({
      data: { ...fields, id: id || crypto.randomUUID(), projectId: req.params.projectId },
      include: { workstream: true },
    });
    res.status(201).json(serializeCard(card));
  } catch (err) {
    next(err);
  }
});

// Bulk upsert (mirrors saveCards — an array of new-or-updated cards).
apiRouter.post('/projects/:projectId/cards/bulk', async (req, res, next) => {
  try {
    const parsed = z.array(cardInput).max(5000).safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid bulk card payload', details: parsed.error.issues });
    }
    const saved = [];
    for (const c of parsed.data) {
      const { id, ...fields } = c;
      const card = await prisma.card.upsert({
        where: { id: id || '__none__' },
        create: { ...fields, id: id || crypto.randomUUID(), projectId: req.params.projectId },
        update: fields,
        include: { workstream: true },
      });
      saved.push(card);
    }
    res.json(saved.map(serializeCard));
  } catch (err) {
    next(err);
  }
});

// Full re-import (mirrors replaceCardsForProject — wipes every existing
// card for this project and inserts the given set instead). Cards cascade
// their own assessments/actions/comments on delete (see schema's onDelete:
// Cascade), so this can't leave orphaned session data behind.
apiRouter.put('/projects/:projectId/cards/replace', async (req, res, next) => {
  try {
    const parsed = z.array(cardInput).max(5000).safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid card payload', details: parsed.error.issues });
    }
    await prisma.$transaction(async (tx) => {
      await tx.card.deleteMany({ where: { projectId: req.params.projectId } });
      for (const c of parsed.data) {
        const { id, ...fields } = c;
        await tx.card.create({
          data: { ...fields, id: id || crypto.randomUUID(), projectId: req.params.projectId },
        });
      }
    });
    const cards = await prisma.card.findMany({
      where: { projectId: req.params.projectId },
      include: { workstream: true },
    });
    res.json(cards.map(serializeCard));
  } catch (err) {
    next(err);
  }
});

apiRouter.delete('/projects/:projectId/cards', async (req, res, next) => {
  try {
    await prisma.card.deleteMany({ where: { projectId: req.params.projectId } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Mirrors saveCard/updateCard — both take a COMPLETE Card object in the
// existing IPersistenceService contract (never a partial patch), so this
// uses the same full cardInput schema as create. That matters: cardInput's
// optional fields carry zod .default(...) fallbacks (e.g. currentPriority
// defaults to 'Unprioritized'), which is correct for "this is the whole
// object" but would silently overwrite untouched fields back to their
// default if this endpoint accepted a partial body instead.
apiRouter.put('/cards/:id', async (req, res, next) => {
  try {
    const parsed = cardInput.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid card payload', details: parsed.error.issues });
    }
    const { id, ...fields } = parsed.data;
    const card = await prisma.card.update({
      where: { id: req.params.id },
      data: fields,
      include: { workstream: true },
    });
    res.json(serializeCard(card));
  } catch (err) {
    next(err);
  }
});

apiRouter.delete('/cards/:id', async (req, res, next) => {
  try {
    await prisma.card.delete({ where: { id: req.params.id } }).catch(() => {});
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Planning sessions
// ---------------------------------------------------------------------------
const sessionInput = z.object({
  id: z.string().min(1).optional(),
  projectId: z.string().min(1),
  name: z.string().min(1),
  date: z.string(),
  timeZone: z.string().default('UTC'),
  objective: z.string().optional().nullable(),
  deliveryHorizon: z.string().optional().nullable(),
  agenda: z.array(z.record(z.string(), z.unknown())).default([]),
  stage: z.enum(['preparation', 'live', 'review', 'closed', 'reopened']).default('preparation'),
  activeCardId: z.string().optional().nullable(),
  activeWorkstreamId: z.string().optional().nullable(),
  isVotingActive: z.boolean().default(false),
  version: z.number().int().default(1),
});

const sessionInclude = { facilitator: true, snapshots: true };

apiRouter.get('/sessions', async (req, res, next) => {
  try {
    const where = req.query.projectId ? { projectId: String(req.query.projectId) } : {};
    const sessions = await prisma.planningSession.findMany({
      where,
      include: sessionInclude,
      orderBy: { createdAt: 'desc' },
    });
    res.json(sessions.map(serializeSession));
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/sessions/:id', async (req, res, next) => {
  try {
    const session = await prisma.planningSession.findUnique({
      where: { id: req.params.id },
      include: sessionInclude,
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(serializeSession(session));
  } catch (err) {
    next(err);
  }
});

// Mirrors saveSession's create-or-update-by-id semantics. facilitatorId is
// always the calling user unless the session already exists (an update
// never reassigns the original facilitator).
apiRouter.post('/sessions', async (req, res, next) => {
  try {
    const parsed = sessionInput.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid session payload', details: parsed.error.issues });
    }
    const { id, date, ...fields } = parsed.data;
    const data = { ...fields, date: new Date(date) };

    const session = await prisma.planningSession.upsert({
      where: { id: id || '__none__' },
      create: { ...data, id: id || crypto.randomUUID(), facilitatorId: req.dbUser.id },
      update: data,
      include: sessionInclude,
    });
    res.json(serializeSession(session));
  } catch (err) {
    next(err);
  }
});

apiRouter.delete('/sessions/:id', async (req, res, next) => {
  try {
    // Cascades to assessments/actions/comments/logs/snapshots via the
    // schema's onDelete: Cascade — no manual cleanup needed, unlike the
    // localStorage version which has to sweep 4 other keys by hand.
    await prisma.planningSession.delete({ where: { id: req.params.id } }).catch(() => {});
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/sessions/:id/duplicate', async (req, res, next) => {
  try {
    const original = await prisma.planningSession.findUnique({ where: { id: req.params.id } });
    if (!original) return res.status(404).json({ error: 'Original session not found' });

    const assessments = await prisma.sessionAssessment.findMany({ where: { sessionId: original.id } });

    const duplicated = await prisma.$transaction(async (tx) => {
      const created = await tx.planningSession.create({
        data: {
          projectId: original.projectId,
          name: `${original.name} (Copy)`,
          date: original.date,
          timeZone: original.timeZone,
          objective: original.objective,
          deliveryHorizon: original.deliveryHorizon,
          agenda: original.agenda,
          stage: 'preparation',
          facilitatorId: original.facilitatorId,
          version: 1,
        },
      });
      for (const a of assessments) {
        await tx.sessionAssessment.create({
          data: {
            sessionId: created.id,
            cardId: a.cardId,
            proposedPriority: a.proposedPriority,
            businessValue: a.businessValue,
            memberImpact: a.memberImpact,
            urgency: a.urgency,
            effort: a.effort,
            storyPoints: a.storyPoints,
            workstreamRank: a.workstreamRank,
            decision: a.decision,
            milestoneOutcome: a.milestoneOutcome,
            teamRationale: a.teamRationale,
            validationNeeds: a.validationNeeds,
            lastEditedBy: a.lastEditedBy,
            version: 1,
          },
        });
      }
      return tx.planningSession.findUnique({ where: { id: created.id }, include: sessionInclude });
    });

    res.status(201).json(serializeSession(duplicated));
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/sessions/:id/close', async (req, res, next) => {
  try {
    const { closedBy, summary } = z
      .object({ closedBy: z.string().min(1), summary: z.string().default('') })
      .parse(req.body);

    const session = await prisma.planningSession.findUnique({ where: { id: req.params.id } });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const assessments = await prisma.sessionAssessment.findMany({ where: { sessionId: session.id } });
    const actions = await prisma.followUpAction.findMany({ where: { sessionId: session.id } });
    const selectedCount = assessments.filter((a) => a.decision === 'Selected').length;
    const closedAt = new Date();

    const snapshot = await prisma.$transaction(async (tx) => {
      const created = await tx.versionSnapshot.create({
        data: {
          sessionId: session.id,
          version: session.version,
          closedAt,
          closedBy,
          summary,
          assessmentsCount: assessments.length,
          selectedCount,
          actionsCount: actions.length,
          dataSnapshot: {
            assessments: assessments.map(serializeAssessment),
            actions: actions.map(serializeAction),
          },
        },
      });
      await tx.planningSession.update({
        where: { id: session.id },
        data: { stage: 'closed', closedAt },
      });
      return created;
    });

    res.json(serializeSnapshot(snapshot));
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/sessions/:id/reopen', async (req, res, next) => {
  try {
    const session = await prisma.planningSession.findUnique({ where: { id: req.params.id } });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const updated = await prisma.planningSession.update({
      where: { id: session.id },
      data: { stage: 'reopened', version: (session.version || 1) + 1 },
      include: sessionInclude,
    });
    res.json(serializeSession(updated));
  } catch (err) {
    next(err);
  }
});

// --- Post-close participant feedback ------------------------------------
// Deliberately anonymous (no userId captured) — see the model comment in
// schema.prisma. One participant can submit more than once (e.g. if they
// change their mind); no dedupe, since there's no identity to dedupe on.
const feedbackInput = z.object({ rating: z.number().int().min(1).max(5) });

apiRouter.post('/sessions/:id/feedback', async (req, res, next) => {
  try {
    const parsed = feedbackInput.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid feedback payload', details: parsed.error.issues });
    }
    const feedback = await prisma.sessionFeedback.create({
      data: { sessionId: req.params.id, rating: parsed.data.rating },
    });
    res.status(201).json(serializeFeedback(feedback));
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/sessions/:id/feedback', async (req, res, next) => {
  try {
    const rows = await prisma.sessionFeedback.findMany({
      where: { sessionId: req.params.id },
      orderBy: { submittedAt: 'asc' },
    });
    res.json(rows.map(serializeFeedback));
  } catch (err) {
    next(err);
  }
});

// --- Durable share links -----------------------------------------------
// Replaces the in-memory `shareStore` Map that used to live in server.js —
// that Map was wiped on every redeploy/restart, so a link a facilitator
// shared five minutes before a Render restart would just 404 for every
// guest who clicked it after. A joinToken on the session itself survives
// restarts because it's a normal column in Postgres.
apiRouter.post('/sessions/:id/share', async (req, res, next) => {
  try {
    const session = await prisma.planningSession.findUnique({ where: { id: req.params.id } });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const workspace = await getOrCreateWorkspace();
    if (!canCreateInvite(workspace)) {
      return res.status(403).json({
        error: 'Your free trial has ended. Upgrade to Pro to keep sharing sessions.',
        planTier: workspace.planTier,
        trialActive: false,
      });
    }

    const token = crypto.randomBytes(9).toString('base64url'); // short, URL-safe
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await prisma.planningSession.update({
      where: { id: session.id },
      data: { joinToken: token, joinTokenExpiresAt: expiresAt },
    });
    res.json({ token, url: `/?join=${token}`, expiresAt: expiresAt.toISOString() });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Session assessments (with optimistic-concurrency conflict detection —
// mirrors PersistenceService.saveAssessment's exact contract: if the
// version the caller last saw is behind what's already stored, the write
// is rejected with the current row instead of silently overwriting it).
// ---------------------------------------------------------------------------
const assessmentInput = z.object({
  proposedPriority: z.enum(['P0', 'P1', 'P2', 'P3', 'Unprioritized']).default('Unprioritized'),
  businessValue: z.enum(['High', 'Medium', 'Low', 'Unknown']).default('Unknown'),
  memberImpact: z.enum(['High', 'Medium', 'Low', 'Unknown']).default('Unknown'),
  urgency: z.enum(['High', 'Medium', 'Low', 'Unknown']).default('Unknown'),
  effort: z.enum(['Small', 'Medium', 'Large', 'Unknown']).default('Unknown'),
  storyPoints: z.number().int().optional().nullable(),
  workstreamRank: z.number().int().optional().nullable(),
  decision: z
    .enum(['Selected', 'Reserve', 'Defer', 'Drop', 'Needs Validation', 'Not Discussed', 'Parking Lot'])
    .default('Not Discussed'),
  milestoneOutcome: z.string().optional().nullable(),
  teamRationale: z.string().optional().nullable(),
  validationNeeds: z.string().optional().nullable(),
  lastEditedBy: z.string().min(1),
  version: z.number().int().default(0),
});

apiRouter.get('/sessions/:id/assessments', async (req, res, next) => {
  try {
    const rows = await prisma.sessionAssessment.findMany({ where: { sessionId: req.params.id } });
    const result = {};
    rows.forEach((r) => {
      result[r.cardId] = serializeAssessment(r);
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/sessions/:id/assessments/:cardId', async (req, res, next) => {
  try {
    const row = await prisma.sessionAssessment.findUnique({
      where: { sessionId_cardId: { sessionId: req.params.id, cardId: req.params.cardId } },
    });
    res.json(row ? serializeAssessment(row) : null);
  } catch (err) {
    next(err);
  }
});

apiRouter.put('/sessions/:id/assessments/:cardId', async (req, res, next) => {
  try {
    const parsed = assessmentInput.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid assessment payload', details: parsed.error.issues });
    }
    const key = { sessionId_cardId: { sessionId: req.params.id, cardId: req.params.cardId } };
    const existing = await prisma.sessionAssessment.findUnique({ where: key });

    if (existing && existing.version > parsed.data.version) {
      return res.json({ success: false, conflict: serializeAssessment(existing) });
    }

    const { version, decision, ...rest } = parsed.data;
    const data = { ...rest, decision: toDbDisposition(decision), version: (existing?.version || 0) + 1 };

    const saved = await prisma.sessionAssessment.upsert({
      where: key,
      create: { ...data, sessionId: req.params.id, cardId: req.params.cardId },
      update: data,
    });
    res.json({ success: true, saved: serializeAssessment(saved) });
  } catch (err) {
    next(err);
  }
});

// Applies an assessment that arrived from a peer via live Socket.IO sync —
// the sender already ran it through the versioned PUT above and resolved
// any conflict on their end, so this is a plain apply with only a
// stale-write guard (never let a late/out-of-order message clobber a
// version this row has already moved past).
apiRouter.post('/sessions/:id/assessments/:cardId/sync', async (req, res, next) => {
  try {
    const parsed = assessmentInput.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid assessment payload', details: parsed.error.issues });
    }
    const key = { sessionId_cardId: { sessionId: req.params.id, cardId: req.params.cardId } };
    const existing = await prisma.sessionAssessment.findUnique({ where: key });
    if (existing && existing.version > parsed.data.version) {
      return res.json({ applied: false });
    }
    const { decision, ...rest } = parsed.data;
    const data = { ...rest, decision: toDbDisposition(decision) };
    await prisma.sessionAssessment.upsert({
      where: key,
      create: { ...data, sessionId: req.params.id, cardId: req.params.cardId },
      update: data,
    });
    res.json({ applied: true });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Follow-up actions
// ---------------------------------------------------------------------------
const actionInput = z.object({
  id: z.string().min(1).optional(),
  cardId: z.string().min(1),
  action: z.string().min(1),
  owner: z.string().default(''),
  dueDate: z.string().optional().nullable(),
  status: z.enum(['open', 'in_progress', 'completed']).default('open'),
});

apiRouter.get('/sessions/:id/actions', async (req, res, next) => {
  try {
    const rows = await prisma.followUpAction.findMany({ where: { sessionId: req.params.id } });
    res.json(rows.map(serializeAction));
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/sessions/:id/actions', async (req, res, next) => {
  try {
    const parsed = actionInput.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid action payload', details: parsed.error.issues });
    }
    const { id, dueDate, ...fields } = parsed.data;
    const data = { ...fields, dueDate: dueDate ? new Date(dueDate) : null };
    const action = await prisma.followUpAction.upsert({
      where: { id: id || '__none__' },
      create: { ...data, id: id || crypto.randomUUID(), sessionId: req.params.id },
      update: data,
    });
    res.json(serializeAction(action));
  } catch (err) {
    next(err);
  }
});

apiRouter.delete('/actions/:id', async (req, res, next) => {
  try {
    await prisma.followUpAction.delete({ where: { id: req.params.id } }).catch(() => {});
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------
// cardId is NOT part of this schema — the route it's used on is nested
// under /cards/:cardId/comments, so cardId always comes from the URL param
// (see the handler below). Requiring it in the body too would just be
// redundant validation the caller has to satisfy for a value the handler
// overwrites anyway.
const commentInput = z.object({
  authorRole: z.enum(['workspace_admin', 'project_lead', 'facilitator', 'editor', 'contributor', 'viewer']),
  content: z.string().min(1),
  parentId: z.string().optional().nullable(),
  isImported: z.boolean().default(false),
});

// All comments across every card in a session (mirrors
// getAllSessionComments, used by the session close-out export, which needs
// the full discussion record, not just one card's thread).
apiRouter.get('/sessions/:id/comments', async (req, res, next) => {
  try {
    const rows = await prisma.cardComment.findMany({
      where: { sessionId: req.params.id },
      include: { author: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json(rows.map(serializeComment));
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/sessions/:id/cards/:cardId/comments', async (req, res, next) => {
  try {
    const rows = await prisma.cardComment.findMany({
      where: { sessionId: req.params.id, cardId: req.params.cardId },
      include: { author: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json(rows.map(serializeComment));
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/sessions/:id/cards/:cardId/comments', async (req, res, next) => {
  try {
    const parsed = commentInput.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid comment payload', details: parsed.error.issues });
    }
    const comment = await prisma.cardComment.create({
      data: {
        ...parsed.data,
        sessionId: req.params.id,
        cardId: req.params.cardId,
        authorId: req.dbUser.id,
      },
      include: { author: true },
    });
    res.status(201).json(serializeComment(comment));
  } catch (err) {
    next(err);
  }
});

// Applies a comment that arrived via live sync from a peer who already
// created it through the endpoint above — idempotent upsert-by-id, exactly
// like the localStorage version's applyCommentSync.
apiRouter.post('/sessions/:id/comments/sync', async (req, res, next) => {
  try {
    const { id, cardId, authorId, authorRole, content, parentId, isImported } = req.body || {};
    if (!id || !cardId || !authorId || !content) {
      return res.status(400).json({ error: 'Invalid comment sync payload' });
    }
    const existing = await prisma.cardComment.findUnique({ where: { id } });
    if (existing) return res.json({ applied: false });
    await prisma.cardComment.create({
      data: {
        id,
        sessionId: req.params.id,
        cardId,
        authorId,
        authorRole,
        content,
        parentId: parentId || null,
        isImported: !!isImported,
      },
    });
    res.json({ applied: true });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Activity logs
// ---------------------------------------------------------------------------
apiRouter.get('/sessions/:id/activity', async (req, res, next) => {
  try {
    const rows = await prisma.activityLog.findMany({
      where: { sessionId: req.params.id },
      include: { user: true },
      orderBy: { timestamp: 'desc' },
      take: 200,
    });
    res.json(rows.map(serializeLog));
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/sessions/:id/activity', async (req, res, next) => {
  try {
    const parsed = z
      .object({
        cardId: z.string().optional().nullable(),
        action: z.string().min(1),
        field: z.string().optional().nullable(),
        previousValue: z.string().optional().nullable(),
        newValue: z.string().optional().nullable(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid activity payload', details: parsed.error.issues });
    }
    const log = await prisma.activityLog.create({
      data: { ...parsed.data, sessionId: req.params.id, userId: req.dbUser.id },
      include: { user: true },
    });
    res.status(201).json(serializeLog(log));
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Apply agreed priorities/targets back to the project's cards
// ---------------------------------------------------------------------------
apiRouter.post('/sessions/:id/apply-agreed', async (req, res, next) => {
  try {
    const { appliedBy } = z.object({ appliedBy: z.string().min(1) }).parse(req.body);
    const session = await prisma.planningSession.findUnique({ where: { id: req.params.id } });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const assessments = await prisma.sessionAssessment.findMany({ where: { sessionId: session.id } });
    const assessmentByCard = new Map(assessments.map((a) => [a.cardId, a]));
    const cards = await prisma.card.findMany({ where: { projectId: session.projectId } });

    let updatedCount = 0;
    await prisma.$transaction(async (tx) => {
      for (const card of cards) {
        const assessment = assessmentByCard.get(card.id);
        if (!assessment) continue;
        const data = {};
        if (assessment.proposedPriority && assessment.proposedPriority !== 'Unprioritized') {
          if (card.currentPriority !== assessment.proposedPriority) {
            data.currentPriority = assessment.proposedPriority;
          }
        }
        if (assessment.milestoneOutcome && assessment.milestoneOutcome.trim() !== '') {
          data.targetDateOrQuarter = assessment.milestoneOutcome;
        }
        if (Object.keys(data).length > 0) {
          await tx.card.update({ where: { id: card.id }, data });
          updatedCount++;
        }
      }
      await tx.activityLog.create({
        data: {
          sessionId: session.id,
          userId: req.dbUser.id,
          action: `Applied agreed workshop priorities and milestone targets to ${updatedCount} project cards`,
        },
      });
    });

    res.json({
      updatedCount,
      message: `Successfully applied agreed priorities and targets to ${updatedCount} cards in project backlog.`,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Guest join-by-token (public — no Clerk session). Mounted separately in
// server.js OUTSIDE requireAuth(), same as the old GET /api/share/:code.
// ---------------------------------------------------------------------------
export const joinRouter = Router();

joinRouter.get('/join/:token', async (req, res, next) => {
  try {
    if (!prisma) {
      return res.status(503).json({ error: 'Database is not configured on this server yet' });
    }
    const session = await prisma.planningSession.findUnique({
      where: { joinToken: req.params.token },
      include: { project: { include: { workstreams: true } }, facilitator: true, snapshots: true },
    });
    if (!session || (session.joinTokenExpiresAt && session.joinTokenExpiresAt < new Date())) {
      return res.status(404).json({ error: 'Invitation link not found or expired' });
    }

    // A closed session isn't an invalid link — the facilitator may reopen
    // it later — but there's nothing for a new guest to join right now.
    // Flagged separately (sessionClosed: true) so the frontend can show a
    // clear "this session has ended" screen instead of a generic
    // invalid-link error, and so this doesn't count against the guest cap.
    if (session.stage === 'closed') {
      return res.status(410).json({
        error: 'This session has ended.',
        sessionClosed: true,
        sessionName: session.name,
        projectName: session.project?.name,
      });
    }

    // Enforce the per-session guest cap (default 25 — see Workspace.maxSessionGuests).
    // Counts join-link opens, not verified unique people (see the schema
    // comment on guestJoinCount) — a reasonable v1 given guests have no account.
    const workspace = await getOrCreateWorkspace();
    if (session.guestJoinCount >= workspace.maxSessionGuests) {
      return res.status(403).json({
        error: `This session has reached its ${workspace.maxSessionGuests}-guest limit.`,
      });
    }
    await prisma.planningSession.update({
      where: { id: session.id },
      data: { guestJoinCount: { increment: 1 } },
    });

    const cards = await prisma.card.findMany({
      where: { projectId: session.projectId },
      include: { workstream: true },
    });
    res.json({
      project: serializeProject(session.project),
      session: serializeSession(session),
      cards: cards.map(serializeCard),
      guestsJoined: session.guestJoinCount + 1,
      maxSessionGuests: workspace.maxSessionGuests,
    });
  } catch (err) {
    next(err);
  }
});
