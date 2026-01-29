export const PANEL_STATUSES = [
  "Issued For Production",
  "Produced", 
  "Proceed for Delivery",
  "Delivered",
  "Approved Material",
  "Rejected Material",
  "Installed",
  "Inspected",
  "Approved Final",
  "On Hold",
  "Cancelled",
  "Broken at Site",
] as const;

export type PanelStatus = (typeof PANEL_STATUSES)[number];

// Define the valid status flow - each status can only move to specific next statuses
export const STATUS_FLOW: Record<number, number[]> = {
  0: [1, 9, 10], // Issued For Production -> Produced, On Hold, Cancelled
  1: [2, 9, 10], // Produced -> Proceed for Delivery, On Hold, Cancelled
  2: [3, 9, 10], // Proceed for Delivery -> Delivered, On Hold, Cancelled
  3: [4, 5, 9, 10], // Delivered -> Approved Material, Rejected Material, On Hold, Cancelled
  4: [6, 9, 10], // Approved Material -> Installed, On Hold, Cancelled
  5: [0, 9, 10], // Rejected Material -> Issued For Production (rework), On Hold, Cancelled
  6: [7, 9, 10], // Installed -> Inspected, On Hold, Cancelled
  7: [8, 9, 10], // Inspected -> Approved Final, On Hold, Cancelled
  8: [9, 10], // Approved Final -> On Hold, Cancelled (final status)
  9: [0, 1, 2, 3, 4, 5, 6, 7, 8, 11, 10], // On Hold -> can resume to any status except itself, or cancel
  10: [], // Cancelled -> terminal status, no further transitions
  11: [0, 9, 10], // Broken at Site -> Issued For Production (rework), On Hold, Cancelled
};

// Special statuses that can be set from any status (emergency/administrative)
export const SPECIAL_STATUSES = [9, 10, 11]; // On Hold, Cancelled, Broken at Site

// Role-based status change restrictions based on the table
// Each role can only change to specific statuses (following the status flow logic)
export const ROLE_STATUS_RESTRICTIONS: Record<string, number[]> = {
  'Data Entry': [9, 10], // On Hold, Cancelled (only these two statuses)
  'Production engineer': [1], // Produced
  'Site Engineer': [7], // Inspected
  'QC Site': [4, 5, 8, 11], // Approved Material, Rejected Material, Approved Final, Broken at Site
  'QC Factory': [2], // Proceed for Delivery
  'Store Site': [3, 11], // Delivered, Broken at Site
  'Foreman Site': [6], // Installed
};

/**
 * Validates if a status transition is allowed based on user role
 * @param currentStatus - The current status index
 * @param newStatus - The proposed new status index
 * @param userRole - The user's role
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateStatusTransitionWithRole(
  currentStatus: number, 
  newStatus: number, 
  userRole: string
): { isValid: boolean; error?: string } {
  // Validate input parameters
  if (currentStatus === undefined || currentStatus === null || newStatus === undefined || newStatus === null) {
    return { isValid: false, error: "Invalid status values provided" };
  }

  // Validate that status indices are within bounds
  if (currentStatus < 0 || currentStatus >= PANEL_STATUSES.length || newStatus < 0 || newStatus >= PANEL_STATUSES.length) {
    return { isValid: false, error: "Status index out of bounds" };
  }

  // Broken at Site: only Store Site and QC Site, and only after panel has been Delivered
  const brokenAtSiteStatusIndex = PANEL_STATUSES.indexOf('Broken at Site');
  const deliveredStatusIndex = PANEL_STATUSES.indexOf('Delivered');
  const currentStatusAllowsBrokenAtSite = currentStatus >= deliveredStatusIndex && currentStatus !== 10; // 10 = Cancelled
  if (newStatus === brokenAtSiteStatusIndex) {
    if (userRole !== 'Administrator' && userRole !== 'Store Site' && userRole !== 'QC Site') {
      return { isValid: false, error: 'Only Store Site and QC Site roles can change status to "Broken at Site"' };
    }
    if (!currentStatusAllowsBrokenAtSite) {
      return { isValid: false, error: '"Broken at Site" can only be set after the panel has been put to Delivered' };
    }
  }

  // Admin can do everything without restrictions
  if (userRole === 'Administrator') {
    return validateStatusTransition(currentStatus, newStatus);
  }

  // Data Entry can only change to On Hold (9) and Cancelled (10)
  if (userRole === 'Data Entry') {
    const allowedStatuses = ROLE_STATUS_RESTRICTIONS['Data Entry'];
    if (!allowedStatuses.includes(newStatus)) {
      const newStatusName = PANEL_STATUSES[newStatus];
      const allowedStatusNames = allowedStatuses.map(index => PANEL_STATUSES[index]);
      return { 
        isValid: false, 
        error: `Data Entry role can only change status to: ${allowedStatusNames.join(", ")}` 
      };
    }
    return validateStatusTransition(currentStatus, newStatus);
  }

  // Check if user has permission to change to this specific status
  const allowedStatuses = ROLE_STATUS_RESTRICTIONS[userRole];
  if (!allowedStatuses) {
    return { isValid: false, error: `Role "${userRole}" is not authorized to change panel status` };
  }

  // Check if the new status is in the role's allowed statuses
  if (!allowedStatuses.includes(newStatus)) {
    const newStatusName = PANEL_STATUSES[newStatus];
    const allowedStatusNames = allowedStatuses.map(index => PANEL_STATUSES[index]);
    return { 
      isValid: false, 
      error: `Role "${userRole}" cannot change status to "${newStatusName}". Allowed statuses: ${allowedStatusNames.join(", ")}` 
    };
  }

  // Now check if the transition follows the status flow logic
  return validateStatusTransition(currentStatus, newStatus);
}

/**
 * Gets valid next statuses for a given current status and user role
 * @param currentStatus - The current status index
 * @param userRole - The user's role
 * @returns Array of valid next status indices
 */
// Roles that are allowed to set status to "Broken at Site" (and only after panel is Delivered)
const ROLES_CAN_SET_BROKEN_AT_SITE = ['Store Site', 'QC Site'];
const DELIVERED_STATUS_INDEX = 3;
const CANCELLED_STATUS_INDEX = 10;
// Broken at Site only appears when current status is Delivered (3) or any status after (4-9), not Cancelled (10)
export function canShowBrokenAtSiteForCurrentStatus(currentStatus: number): boolean {
  return currentStatus >= DELIVERED_STATUS_INDEX && currentStatus !== CANCELLED_STATUS_INDEX;
}

export function getValidNextStatusesForRole(currentStatus: number, userRole: string): number[] {
  const brokenAtSiteStatusIndex = PANEL_STATUSES.indexOf('Broken at Site');

  // Admin can do everything (all statuses), but we filter Broken at Site for Admin in the dialog when status < Delivered
  if (userRole === 'Administrator') {
    return getValidNextStatuses(currentStatus);
  }

  // Data Entry can only change to On Hold (9) and Cancelled (10)
  if (userRole === 'Data Entry') {
    const allowedStatuses = ROLE_STATUS_RESTRICTIONS['Data Entry'];
    // Get valid next statuses from status flow and filter to only allowed ones
    const validNextStatuses = getValidNextStatuses(currentStatus);
    return validNextStatuses.filter(status => allowedStatuses.includes(status));
  }

  // Get role's allowed statuses
  const allowedStatuses = ROLE_STATUS_RESTRICTIONS[userRole];
  if (!allowedStatuses) {
    return [];
  }

  // Get valid next statuses from status flow
  let validNextStatuses = getValidNextStatuses(currentStatus);

  // Broken at Site: only for Store Site and QC Site, and only after panel has been Delivered
  if (
    ROLES_CAN_SET_BROKEN_AT_SITE.includes(userRole) &&
    allowedStatuses.includes(brokenAtSiteStatusIndex) &&
    canShowBrokenAtSiteForCurrentStatus(currentStatus)
  ) {
    validNextStatuses = [...validNextStatuses, brokenAtSiteStatusIndex];
  }

  // Filter to only include statuses that the role is allowed to change to
  return validNextStatuses.filter(status => allowedStatuses.includes(status));
}

/**
 * Validates if a status transition is allowed
 * @param currentStatus - The current status index
 * @param newStatus - The proposed new status index
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateStatusTransition(currentStatus: number, newStatus: number): { isValid: boolean; error?: string } {
  // Validate input parameters
  if (currentStatus === undefined || currentStatus === null || newStatus === undefined || newStatus === null) {
    return { isValid: false, error: "Invalid status values provided" };
  }

  // Validate that status indices are within bounds
  if (currentStatus < 0 || currentStatus >= PANEL_STATUSES.length || newStatus < 0 || newStatus >= PANEL_STATUSES.length) {
    return { isValid: false, error: "Status index out of bounds" };
  }

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
  if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
    const currentStatusName = PANEL_STATUSES[currentStatus];
    const newStatusName = PANEL_STATUSES[newStatus];
    const allowedStatusNames = allowedTransitions ? allowedTransitions.map(index => PANEL_STATUSES[index]) : [];
    
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
