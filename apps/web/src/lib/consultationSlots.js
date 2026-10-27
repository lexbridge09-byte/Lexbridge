// Resolve only slots returned by the availability endpoint. A date change must not
// leave an invisible selection from another day eligible for Continue.
export function deriveSlotSelection(slotGroups, slotId, selectedDateKey, isLoaded) {
  if (!isLoaded) return { activeGroup: null, selectedSlot: null };
  const selectedGroup = slotGroups.find((group) => group.daySlots.some((slot) => slot._id === slotId));
  const activeGroup = slotGroups.find((group) => group.dateKey === selectedDateKey) ?? selectedGroup ?? slotGroups[0] ?? null;
  const selectedSlot = activeGroup?.daySlots.find((slot) => slot._id === slotId) ?? null;
  return { activeGroup, selectedSlot };
}

// Availability is a prerequisite, not a dead-end step. Failed/loading requests
// must never be mistaken for an empty calendar.
export function deriveConsultationFlow({ step, hasChoice, selectedSlot, isLoaded, error, slotCount }) {
  const isAvailabilityReady = isLoaded && !error;
  const isRequestFlow = Boolean(isAvailabilityReady && slotCount === 0);
  const steps = isRequestFlow ? [1, 3] : [1, 2, 3];
  let activeStep = hasChoice && isAvailabilityReady ? step : 1;
  if (isRequestFlow && activeStep === 2) activeStep = 3;
  if (!isRequestFlow && activeStep === 3 && !selectedSlot) activeStep = 2;
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
