import { supabase } from '../lib/supabase';

/**
 * Fetches the project IDs that a user has access to.
 * Administrators have access to all projects.
 * Other users only have access to projects in the user_project_access table.
 * 
 * @param userId - The user's ID
 * @param userRole - The user's role
 * @returns Array of project IDs the user has access to, or null if user has access to all projects
 */
export async function getUserAccessibleProjectIds(
  userId: string | undefined,
  userRole: string | undefined
): Promise<string[] | null> {
  // If no user, return empty array (no access)
  if (!userId) {
    return [];
  }

  // Administrators have access to all projects
  if (userRole === 'Administrator') {
    return null; // null means "all projects"
  }

  try {
    const { data, error } = await supabase
      .from('user_project_access')
      .select('project_id')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user project access:', error);
      return [];
    }

    return data?.map(item => item.project_id) || [];
  } catch (error) {
    console.error('Error fetching user project access:', error);
    return [];
  }
}

/**
 * Checks if a user has access to a specific project
 */
export async function hasProjectAccess(
  userId: string | undefined,
  userRole: string | undefined,
  projectId: string
): Promise<boolean> {
  if (!userId) return false;
  
  // Administrators have access to all projects
  if (userRole === 'Administrator') {
    return true;
  }

  try {
    const { data, error } = await supabase
      .from('user_project_access')
      .select('id')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .maybeSingle();

    if (error) {
      console.error('Error checking project access:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking project access:', error);
    return false;
  }
}
