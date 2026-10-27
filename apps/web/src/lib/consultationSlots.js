// Resolve only slots returned by the availability endpoint. A date change must not
// leave an invisible selection from another day eligible for Continue.
export function deriveSlotSelection(slotGroups, slotId, selectedDateKey, isLoaded) {
  if (!isLoaded) return { activeGroup: null, selectedSlot: null };
  const selectedGroup = slotGroups.find((group) => group.daySlots.some((slot) => slot._id === slotId));
  const activeGroup = slotGroups.find((group) => group.dateKey === selectedDateKey) ?? selectedGroup ?? slotGroups[0] ?? null;
  const selectedSlot = activeGroup?.daySlots.find((slot) => slot._id === slotId) ?? null;
  return { activeGroup, selectedSlot };
}

// Wizard steps. Each step is short enough to fit one screen.
export const CONSULTATION_STEPS = Object.freeze({ choice: 1, matter: 2, time: 3, details: 4 });

// Availability is a prerequisite, not a dead-end step. Failed/loading requests must never be
// mistaken for an empty calendar. With no open times the time step is skipped (request flow).
export function deriveConsultationFlow({ step, hasChoice, selectedSlot, isLoaded, error, slotCount }) {
  const { choice, matter, time, details } = CONSULTATION_STEPS;
  const isAvailabilityReady = isLoaded && !error;
  const isRequestFlow = Boolean(isAvailabilityReady && slotCount === 0);
  const steps = isRequestFlow ? [choice, matter, details] : [choice, matter, time, details];
  let activeStep = hasChoice && isAvailabilityReady ? step : choice;
  if (isRequestFlow && activeStep === time) activeStep = details;
  if (!isRequestFlow && activeStep === details && !selectedSlot) activeStep = time;
  const stepIndex = steps.indexOf(activeStep);
  return {
    isAvailabilityReady,
    isRequestFlow,
    activeStep,
    currentStep: stepIndex + 1,
    stepCount: steps.length,
    nextStep: steps[stepIndex + 1] ?? activeStep,
    previousStep: steps[Math.max(0, stepIndex - 1)],
  };
}
