// Resolve only slots returned by the availability endpoint. A date change must not
// leave an invisible selection from another day eligible for Continue.
export function deriveSlotSelection(slotGroups, slotId, selectedDateKey, isLoaded) {
  if (!isLoaded) return { activeGroup: null, selectedSlot: null };
  const selectedGroup = slotGroups.find((group) => group.daySlots.some((slot) => slot._id === slotId));
  const activeGroup = slotGroups.find((group) => group.dateKey === selectedDateKey) ?? selectedGroup ?? slotGroups[0] ?? null;
  const selectedSlot = activeGroup?.daySlots.find((slot) => slot._id === slotId) ?? null;
  return { activeGroup, selectedSlot };
}
