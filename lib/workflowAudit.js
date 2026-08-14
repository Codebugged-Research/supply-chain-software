import { v4 as uuidv4 } from 'uuid'

export const WORKFLOW_TYPES = Object.freeze({
  DEMAND_CONSENSUS: 'DEMAND_CONSENSUS',
  PRODUCTION_SIGNOFF: 'PRODUCTION_SIGNOFF',
  SUPPLY_RISK_RESOLUTION: 'SUPPLY_RISK_RESOLUTION',
})

export const WORKFLOW_STEP_TEMPLATES = Object.freeze({
  [WORKFLOW_TYPES.DEMAND_CONSENSUS]: [
    { stepSequence: 1, stepCode: 'CATEGORY_REVIEW', assignedRole: 'Category Manager', assignedUserId: 'category.manager@boat.com' },
    { stepSequence: 2, stepCode: 'SALES_REVIEW', assignedRole: 'Sales Head', assignedUserId: 'sales.manager@boat.com' },
    { stepSequence: 3, stepCode: 'SOP_REVIEW', assignedRole: 'S&OP Lead', assignedUserId: 'sop.lead@boat.com' },
    { stepSequence: 4, stepCode: 'FINANCE_REVIEW', assignedRole: 'Finance', assignedUserId: 'finance.controller@boat.com' },
  ],
  [WORKFLOW_TYPES.PRODUCTION_SIGNOFF]: [
    { stepSequence: 1, stepCode: 'SUPPLY_PLAN_SUBMIT', assignedRole: 'Supply Planner', assignedUserId: 'supply.planner@boat.com' },
    { stepSequence: 2, stepCode: 'PROCUREMENT_REVIEW', assignedRole: 'Procurement', assignedUserId: 'procurement.manager@boat.com' },
    { stepSequence: 3, stepCode: 'PLANT_REVIEW', assignedRole: 'Plant', assignedUserId: 'plant.manager@boat.com' },
    { stepSequence: 4, stepCode: 'SOP_APPROVAL', assignedRole: 'S&OP Lead', assignedUserId: 'sop.lead@boat.com' },
  ],
  [WORKFLOW_TYPES.SUPPLY_RISK_RESOLUTION]: [
    { stepSequence: 1, stepCode: 'RISK_RESOLUTION', assignedRole: 'Supply Planner', assignedUserId: 'supply.planner@boat.com' },
  ],
})

export function actorUserId(actor, role) {
  if (actor && String(actor).includes('@')) return String(actor)
  return `${String(role || 'workflow.user').toLowerCase().replaceAll(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '')}@boat.com`
}

export function demandAuditTrail(events = []) {
  return [...events].sort((a, b) => a.sequence - b.sequence).map((event) => ({
    auditId: event.auditId,
    action: event.action,
    actorRole: event.actorRole,
    actor: event.actorUserId,
    oldValue: event.oldValue,
    newValue: event.newValue,
    reason: event.comment || event.reasonCode,
    at: event.occurredAt,
  }))
}

export function productionTransitionHistory(events = []) {
  return [...events].sort((a, b) => a.sequence - b.sequence).map((event) => ({
    step: event.sequence,
    fromStatus: event.oldValue,
    toStatus: event.newValue,
    actor: event.actorUserId,
    actorRole: event.actorRole,
    notes: event.comment || null,
    at: event.occurredAt,
    auditId: event.auditId,
  }))
}

export function makeAuditEvent({
  workflowId,
  workflowType,
  stepSequence,
  entityType,
  entityId,
  action,
  fieldPath,
  oldValue,
  newValue,
  actor,
  actorRole,
  reasonCode = null,
  comment = null,
  occurredAt = new Date().toISOString(),
  sequence,
}) {
  return {
    auditId: `AUD-${uuidv4().slice(0, 8).toUpperCase()}`,
    workflowId,
    workflowType,
    stepSequence,
    entityType,
    entityId,
    action,
    fieldPath,
    oldValue,
    newValue,
    actorUserId: actorUserId(actor, actorRole),
    actorRole,
    reasonCode,
    comment,
    occurredAt,
    sequence,
    source: 'USER',
    dataVersion: 'DM-2026-W33-V1',
    generationSeed: 20250701,
  }
}

// This is the single persistence path used by Demand consensus and Production
// sign-off. Module-specific planning records remain separate subjects, while
// workflow state, steps, and audit events always use the shared collections.
export async function persistWorkflowSnapshot(db, {
  subjectCollection,
  subjectFilter,
  subject,
  instance,
  steps,
  event,
}) {
  const clean = (value) => {
    const copy = { ...value }
    delete copy._id
    delete copy.auditTrail
    delete copy.history
    return copy
  }

  const latest = await db.collection('entity_audit_events')
    .find({ workflowId: instance.workflowId })
    .sort({ sequence: -1 })
    .limit(1)
    .next()
  const auditEvent = makeAuditEvent({ ...event, sequence: Number(latest?.sequence || 0) + 1 })

  await db.collection(subjectCollection).replaceOne(subjectFilter, clean(subject), { upsert: true })
  await db.collection('workflow_instances').replaceOne({ workflowId: instance.workflowId }, clean(instance), { upsert: true })
  for (const step of steps) {
    await db.collection('workflow_steps').replaceOne(
      { workflowId: step.workflowId, stepSequence: step.stepSequence },
      clean(step),
      { upsert: true },
    )
  }
  await db.collection('entity_audit_events').insertOne(auditEvent)
  return auditEvent
}
