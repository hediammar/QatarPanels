import { supabase } from '../lib/supabase';

/**
 * Fetches the immediate previous status from panel status history (one step back only).
 * Used by admins to revert to the status before the current one.
 * History is never updated or removed - reverts add new entries.
 * @param panelId - The ID of the panel
 * @param currentStatus - The current status (excluded from results)
 * @returns Promise with the previous status index, or null if none
 */
export async function fetchPreviousStatus(
  panelId: string,
  currentStatus: number
): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .from('panel_status_histories')
      .select('status')
      .eq('panel_id', panelId)
      .order('created_at', { ascending: false })
      .limit(2);

    if (error) {
      console.error('Error fetching panel status history:', error);
      return null;
    }

    if (!data || data.length < 2) return null;

    // Second row is the immediate previous status
    const prev = data[1].status;
    return prev !== currentStatus ? prev : null;
  } catch (error) {
    console.error('Error fetching previous status:', error);
    return null;
  }
}

/**
 * Creates a panel status history record
 * @param panelId - The ID of the panel
 * @param status - The new status (number)
 * @param userId - The ID of the user making the change
 * @param notes - Optional notes about the status change
 * @param imageUrl - Optional image URL
 * @param createdAt - Optional custom date (defaults to current date)
 * @returns Promise with the created history record or error
 */
export async function createPanelStatusHistory(
  panelId: string,
  status: number,
  userId: string,
  notes?: string | null,
  imageUrl?: string | null,
  createdAt?: Date
): Promise<{ data: any; error: any }> {
  try {
    const historyData = {
      panel_id: panelId,
      status: status,
      created_at: createdAt ? createdAt.toISOString() : new Date().toISOString(),
      user_id: userId,
      image_url: imageUrl || null,
      notes: notes || null
    };

    const { data, error } = await supabase
      .from('panel_status_histories')
      .insert(historyData)
      .select()
      .single();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Syncs the timestamp of the latest status history row for a given (panel_id, status).
 *
 * This is used for the special case where a panel has an explicit business date/time
 * (e.g. "Issued for Production Date") that must match the timeline entry timestamp.
 *
 * - If a history row exists: update the latest row's created_at
 * - If none exists: create a new history row
 */
export async function syncLatestPanelStatusHistoryTimestamp(
  panelId: string,
  status: number,
  userId: string,
  createdAt: Date,
  options?: {
    notes?: string | null;
    imageUrl?: string | null;
  }
): Promise<{ data: any; error: any }> {
  try {
    const { data: existingRows, error: fetchError } = await supabase
      .from('panel_status_histories')
      .select('id, created_at')
      .eq('panel_id', panelId)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      return { data: null, error: fetchError };
    }

    const existing = Array.isArray(existingRows) ? existingRows[0] : null;

    if (existing?.id) {
      const { data, error } = await supabase
        .from('panel_status_histories')
        .update({ created_at: createdAt.toISOString() })
        .eq('id', existing.id)
        .select()
        .single();

      return { data, error };
    }

    // No existing row -> create one
    return await createPanelStatusHistory(
      panelId,
      status,
      userId,
      options?.notes ?? null,
      options?.imageUrl ?? null,
      createdAt
    );
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Creates panel status history records for multiple panels (bulk operation)
 * @param panels - Array of panel data with id, status, and user_id
 * @param notes - Optional notes for all panels
 * @param createdAt - Optional custom date (defaults to current date)
 * @returns Promise with the created history records or error
 */
export async function createBulkPanelStatusHistory(
  panels: Array<{ id: string; status: number; user_id: string }>,
  notes?: string | null,
  createdAt?: Date
): Promise<{ data: any; error: any }> {
  try {
    const historyData = panels.map(panel => ({
      panel_id: panel.id,
      status: panel.status,
      created_at: createdAt ? createdAt.toISOString() : new Date().toISOString(),
      user_id: panel.user_id,
      image_url: null,
      notes: notes || null
    }));

    const { data, error } = await supabase
      .from('panel_status_histories')
      .insert(historyData)
      .select();

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}
