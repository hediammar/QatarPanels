export const PANEL_STATUSES = [
  "Issued For Production",
  "Produced", 
  "Inspected",
  "Approved Material",
  "Rejected Material",
  "Issued",
  "Proceed for Delivery",
  "Delivered",
  "Installed",
  "Approved Final",
  "Broken at Site",
  "On Hold",
  "Cancelled",
] as const;

export type PanelStatus = (typeof PANEL_STATUSES)[number];

// Define the valid status flow - each status can only move to specific next statuses
export const STATUS_FLOW: Record<number, number[]> = {
  0: [1, 11, 12], // Issued For Production -> Produced, On Hold, Cancelled
  1: [2, 11, 12], // Produced -> Inspected, On Hold, Cancelled
  2: [3, 4, 11, 12], // Inspected -> Approved Material, Rejected Material, On Hold, Cancelled
  3: [5, 11, 12], // Approved Material -> Issued, On Hold, Cancelled
  4: [0, 11, 12], // Rejected Material -> Issued For Production (rework), On Hold, Cancelled
  5: [6, 11, 12], // Issued -> Proceed for Delivery, On Hold, Cancelled
  6: [7, 11, 12], // Proceed for Delivery -> Delivered, On Hold, Cancelled
  7: [8, 11, 12], // Delivered -> Installed, On Hold, Cancelled
  8: [9, 11, 12], // Installed -> Approved Final, On Hold, Cancelled
  9: [11, 12], // Approved Final -> On Hold, Cancelled (final status)
  10: [0, 11, 12], // Broken at Site -> Issued For Production (rework), On Hold, Cancelled
  11: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12], // On Hold -> can resume to any status except itself, or cancel
  12: [], // Cancelled -> terminal status, no further transitions
};

// Special statuses that can be set from any status (emergency/administrative)
export const SPECIAL_STATUSES = [11, 12]; // On Hold, Cancelled

/**
 * Validates if a status transition is allowed
 * @param currentStatus - The current status index
 * @param newStatus - The proposed new status index
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateStatusTransition(currentStatus: number, newStatus: number): { isValid: boolean; error?: string } {
  // Same status is not allowed
  if (currentStatus === newStatus) {
    return { isValid: false, error: "Cannot change to the same status" };
  }

  // Special statuses (On Hold, Cancelled) can be set from any status
  if (SPECIAL_STATUSES.includes(newStatus)) {
    return { isValid: true };
  }

  // Check if the transition is allowed in the status flow
  const allowedTransitions = STATUS_FLOW[currentStatus];
  if (!allowedTransitions.includes(newStatus)) {
    const currentStatusName = PANEL_STATUSES[currentStatus];
    const newStatusName = PANEL_STATUSES[newStatus];
    const allowedStatusNames = allowedTransitions.map(index => PANEL_STATUSES[index]);
    
    return { 
      isValid: false, 
      error: `Cannot change from "${currentStatusName}" to "${newStatusName}". Allowed transitions: ${allowedStatusNames.join(", ")}` 
    };
  }

  return { isValid: true };
}

/**
 * Gets all valid next statuses for a given current status
 * @param currentStatus - The current status index
 * @returns Array of valid next status indices
 */
export function getValidNextStatuses(currentStatus: number): number[] {
  return STATUS_FLOW[currentStatus] || [];
}

/**
 * Gets all valid next status names for a given current status
 * @param currentStatus - The current status index
 * @returns Array of valid next status names
 */
export function getValidNextStatusNames(currentStatus: number): string[] {
  return getValidNextStatuses(currentStatus).map(index => PANEL_STATUSES[index]);
}

/**
 * Checks if a status is terminal (no further transitions allowed)
 * @param status - The status index to check
 * @returns True if the status is terminal
 */
export function isTerminalStatus(status: number): boolean {
  return STATUS_FLOW[status].length === 0;
}

/**
 * Checks if a status is special (can be set from any status)
 * @param status - The status index to check
 * @returns True if the status is special
 */
export function isSpecialStatus(status: number): boolean {
  return SPECIAL_STATUSES.includes(status);
}
