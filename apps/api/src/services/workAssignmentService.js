import { WorkAssignmentEventModel } from '../models/index.js';

export async function recordWorkAssignmentEvent({ workKind, referenceCode, actorId, previousAssignee = null, newAssignee = null, note = '' }) {
  if (String(previousAssignee ?? '') === String(newAssignee ?? '')) return null;
  const eventType = previousAssignee && newAssignee ? 'reassigned' : newAssignee ? 'assigned' : 'unassigned';
  return WorkAssignmentEventModel.create({ WorkKind: workKind, ReferenceCode: referenceCode, EventType: eventType, Actor: actorId, PreviousAssignee: previousAssignee, NewAssignee: newAssignee, Note: note });
}
