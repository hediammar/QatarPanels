import { supabase } from '../lib/supabase';

// Get current user ID from session
export const getCurrentUserId = (): string | null => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      return user.id;
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
      return null;
    }
  }
  return null;
};

// Tables that support user tracking
const TABLES_WITH_USER_TRACKING = ['panels', 'projects', 'buildings', 'customers', 'facades'];

// Add user tracking to any data object
export const addUserTracking = (data: any): any => {
  const userId = getCurrentUserId();
  if (userId) {
    return {
      ...data,
      user_id: userId
    };
  }
  return data;
};

// Add user tracking for new records
export const addUserTrackingForCreate = (data: any, table?: string): any => {
  const userId = getCurrentUserId();
  if (userId && table && TABLES_WITH_USER_TRACKING.includes(table)) {
    return {
      ...data,
      user_id: userId
    };
  }
  return data;
};

// Add user tracking for updates
export const addUserTrackingForUpdate = (data: any, table?: string): any => {
  const userId = getCurrentUserId();
  console.log(`Adding user tracking for ${table}: userId=${userId}`);
  if (userId && table && TABLES_WITH_USER_TRACKING.includes(table)) {
    const trackedData = {
      ...data,
      user_id: userId
    };
    console.log(`User tracking added:`, trackedData);
    return trackedData;
  }
  console.log(`No user tracking added for ${table}`);
  return data;
};

// Generic CRUD operations with user tracking
export const crudOperations = {
  // Create with user tracking
  async create(table: string, data: any) {
    const trackedData = addUserTrackingForCreate(data, table);
    const { data: result, error } = await supabase
      .from(table)
      .insert(trackedData)
      .select()
      .single();

    if (error) {
      console.error(`Error creating ${table}:`, error);
      throw error;
    }
    return result;
  },

  // Update with user tracking
  async update(table: string, id: string, data: any) {
    try {
      const trackedData = addUserTrackingForUpdate(data, table);
      const { data: result, error } = await supabase
        .from(table)
        .update(trackedData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`Error updating ${table}:`, error);
        throw error;
      }
      return result;
    } catch (error: any) {
      // If the error is related to user_id column not existing, try without user tracking
      if (error.message && (error.message.includes('user_id') || error.message.includes('updated_at') || error.message.includes('created_at'))) {
        console.warn(`user_id or timestamp columns not found in ${table}, updating without user tracking`);
        const { data: result, error: retryError } = await supabase
          .from(table)
          .update(data)
          .eq('id', id)
          .select()
          .single();

        if (retryError) {
          console.error(`Error updating ${table} without user tracking:`, retryError);
          throw retryError;
        }
        return result;
      }
      throw error;
    }
  },

  // Delete with user tracking (soft delete or log)
  async delete(table: string, id: string) {
    try {
      // For soft delete, update status instead of deleting
      const trackedData = addUserTrackingForUpdate({ status: 'deleted' }, table);
      const { error } = await supabase
        .from(table)
        .update(trackedData)
        .eq('id', id);

      if (error) {
        console.error(`Error soft deleting ${table}:`, error);
        throw error;
      }
    } catch (error: any) {
      // If soft delete fails, try hard delete
      console.warn(`Soft delete failed for ${table}, trying hard delete:`, error);
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error(`Error deleting ${table}:`, deleteError);
        throw deleteError;
      }
    }
  },

  // Get with user tracking info
  async get(table: string, id?: string) {
    if (id) {
      const { data, error } = await supabase
        .from(table)
        .select(`
          *,
          users!user_id(id, name, username)
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error(`Error getting ${table}:`, error);
        throw error;
      }
      return data;
    } else {
      const { data, error } = await supabase
        .from(table)
        .select(`
          *,
          users!user_id(id, name, username)
        `);

      if (error) {
        console.error(`Error getting ${table}:`, error);
        throw error;
      }
      return data;
    }
  }
}; 