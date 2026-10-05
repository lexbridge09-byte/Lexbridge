import { STAFF_ROLES, STATUS_HISTORY_LIMIT, ServiceRequestModel, UserModel } from '../models/index.js';

/*
  One implementation of "change a service request" used by both desks: the owner's admin panel
  and the 2nd owner's team desk. input = { AssignedTo?, Status?, Note? }; request = a mongoose
  document. Returns what changed so the caller can notify.
*/
export async function applyRequestUpdate(request, input, actor) {
  let hasAssignmentChanged = false;
  if (input.AssignedTo !== undefined) {
    if (input.AssignedTo !== null) {
      const assignee = await UserModel.exists({ _id: input.AssignedTo, Role: { $in: STAFF_ROLES } });
      if (!assignee) {
        return { error: 400, message: 'Work can only be assigned to a LexBridge team member.' };
      }
      if (String(request.AssignedTo ?? '') !== String(input.AssignedTo)) hasAssignmentChanged = true;
    } else if (request.AssignedTo) {
      hasAssignmentChanged = true;
    }
    request.AssignedTo = input.AssignedTo;
    request.AssignedBy = input.AssignedTo === null ? null : actor.id;
    request.AssignedAt = input.AssignedTo === null ? null : new Date();
    // A fresh assignment moves early-stage requests to 'assigned'; reassignment never regresses progress
    if (hasAssignmentChanged && input.AssignedTo !== null && ['submitted', 'under-review'].includes(request.Status)) {
      request.Status = 'assigned';
    }
    // Unassigning returns the request to the review queue
    if (input.AssignedTo === null && request.Status === 'assigned') request.Status = 'under-review';
  }

  const hasStatusChanged = Boolean(input.Status) && input.Status !== request.Status;
  const note = input.Note ?? '';
  if (hasStatusChanged) request.Status = input.Status;
  if (hasStatusChanged || note || hasAssignmentChanged) {
    request.StatusHistory.push({ Status: request.Status, Note: note, changedAt: new Date() });
    const overflowCount = request.StatusHistory.length - STATUS_HISTORY_LIMIT;
    if (overflowCount > 0) request.StatusHistory.splice(0, overflowCount);
  }

  return { hasStatusChanged, note, hasAssignmentChanged };
}

export async function loadRequestForUpdate(referenceCode) {
  return ServiceRequestModel.findOne({ ReferenceCode: referenceCode });
}
