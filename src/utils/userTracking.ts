import { supabase } from '../lib/supabase';

// Generate a UUID v4
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Get current user ID from session
export const getCurrentUserId = (): string | null => {
  const userStr = localStorage.getItem('user');
  console.log('getCurrentUserId: userStr from localStorage:', userStr);
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      console.log('getCurrentUserId: parsed user:', user);
      return user.id;
    } catch (error) {
      console.error('Error parsing user from localStorage:', error);
      return null;
    }
  }
  console.log('getCurrentUserId: no user found in localStorage');
  return null;
};

// Get current user session for authenticated requests
export const getCurrentUserSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Error getting session:', error);
      return null;
    }
    return session;
  } catch (error) {
    console.error('Error getting user session:', error);
    return null;
  }
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
  console.log(`addUserTrackingForCreate: userId=${userId}, table=${table}`);
  if (userId && table && TABLES_WITH_USER_TRACKING.includes(table)) {
    const trackedData = {
      ...data,
      user_id: userId
    };
    console.log(`User tracking added for create:`, trackedData);
    return trackedData;
  }
  
  // Fallback: if no user_id is available but table requires it, try to get a default admin user
  if (table && TABLES_WITH_USER_TRACKING.includes(table)) {
    console.log(`No user_id available, attempting to find default admin user for ${table}`);
    // For now, we'll try to proceed without user_id and let the database handle it
    // In production, you might want to throw an error or redirect to login
    const trackedData = {
      ...data,
      // Don't set user_id if not available - let the database handle the constraint
    };
    console.log(`Proceeding without user_id for ${table}:`, trackedData);
    return trackedData;
  }
  
  console.log(`No user tracking added for create: userId=${userId}, table=${table}`);
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
    try {
      // Prepare data with proper types and validation
      let preparedData = { ...data };
      
      // Handle specific table requirements
      if (table === 'projects') {
        // Generate UUID for new projects
        if (!preparedData.id) {
          preparedData.id = generateUUID();
        }
        
        // Ensure numeric fields are properly typed
        if (typeof preparedData.estimated_cost === 'string') {
          preparedData.estimated_cost = parseInt(preparedData.estimated_cost) || 0;
        }
        if (typeof preparedData.estimated_panels === 'string') {
          preparedData.estimated_panels = parseInt(preparedData.estimated_panels) || 0;
        }
        
        // Ensure dates are in correct format
        if (preparedData.start_date) {
          preparedData.start_date = new Date(preparedData.start_date).toISOString().split('T')[0];
        }
        if (preparedData.end_date) {
          preparedData.end_date = new Date(preparedData.end_date).toISOString().split('T')[0];
        }
        
        // Validate required fields
        if (!preparedData.name) {
          throw new Error('Project name is required');
        }
        if (!preparedData.customer_id) {
          throw new Error('Customer is required');
        }
        if (!preparedData.location) {
          throw new Error('Location is required');
        }
        if (!preparedData.start_date) {
          throw new Error('Start date is required');
        }
        
        // Validate that customer exists
        if (preparedData.customer_id) {
          const { data: customer, error: customerError } = await supabase
            .from('customers')
            .select('id')
            .eq('id', preparedData.customer_id)
            .single();
            
          if (customerError || !customer) {
            throw new Error(`Customer with ID ${preparedData.customer_id} does not exist`);
          }
        }
        
        // Remove any undefined or null values that might cause issues
        Object.keys(preparedData).forEach(key => {
          if (preparedData[key] === undefined || preparedData[key] === '') {
            delete preparedData[key];
          }
        });
        
        console.log('Prepared project data:', preparedData);
      }
      
      // Handle customer creation
      if (table === 'customers') {
        // Generate UUID for new customers
        if (!preparedData.id) {
          preparedData.id = generateUUID();
        }
        
        // Validate required fields
        if (!preparedData.name) {
          throw new Error('Customer name is required');
        }
        if (!preparedData.email) {
          throw new Error('Customer email is required');
        }
        
        console.log('Prepared customer data:', preparedData);
      }
      
      // Handle panels creation
      if (table === 'panels') {
        // Generate UUID for new panels - this is required since id is NOT NULL
        if (!preparedData.id) {
          preparedData.id = generateUUID();
        }
        
        // Ensure numeric fields are properly typed
        if (typeof preparedData.type === 'string') {
          preparedData.type = parseInt(preparedData.type) || 0;
        }
        if (typeof preparedData.status === 'string') {
          preparedData.status = parseInt(preparedData.status) || 1;
        }
        if (typeof preparedData.unit_rate_qr_m2 === 'string') {
          preparedData.unit_rate_qr_m2 = parseFloat(preparedData.unit_rate_qr_m2) || null;
        }
        if (typeof preparedData.ifp_qty_area_sm === 'string') {
          preparedData.ifp_qty_area_sm = parseFloat(preparedData.ifp_qty_area_sm) || null;
        }
        if (typeof preparedData.ifp_qty_nos === 'string') {
          preparedData.ifp_qty_nos = parseInt(preparedData.ifp_qty_nos) || null;
        }
        if (typeof preparedData.weight === 'string') {
          preparedData.weight = parseFloat(preparedData.weight) || null;
        }
        
        // Ensure numeric fields are properly formatted for database
        if (preparedData.unit_rate_qr_m2 !== null && preparedData.unit_rate_qr_m2 !== undefined) {
          preparedData.unit_rate_qr_m2 = Number(preparedData.unit_rate_qr_m2);
        }
        if (preparedData.ifp_qty_area_sm !== null && preparedData.ifp_qty_area_sm !== undefined) {
          preparedData.ifp_qty_area_sm = Number(preparedData.ifp_qty_area_sm);
        }
        if (preparedData.ifp_qty_nos !== null && preparedData.ifp_qty_nos !== undefined) {
          preparedData.ifp_qty_nos = Number(preparedData.ifp_qty_nos);
        }
        if (preparedData.weight !== null && preparedData.weight !== undefined) {
          preparedData.weight = Number(preparedData.weight);
        }
        
        // Ensure dates are in correct format
        if (preparedData.issued_for_production_date) {
          preparedData.issued_for_production_date = new Date(preparedData.issued_for_production_date).toISOString().split('T')[0];
        }
        
        // Validate required fields
        if (!preparedData.name) {
          throw new Error('Panel name is required');
        }
        if (!preparedData.project_id) {
          throw new Error('Project is required');
        }
        
        // Validate that project exists
        if (preparedData.project_id) {
          const { data: project, error: projectError } = await supabase
            .from('projects')
            .select('id')
            .eq('id', preparedData.project_id)
            .single();
            
          if (projectError || !project) {
            throw new Error(`Project with ID ${preparedData.project_id} does not exist`);
          }
        }
        
        // Validate building_id if provided
        if (preparedData.building_id) {
          const { data: building, error: buildingError } = await supabase
            .from('buildings')
            .select('id')
            .eq('id', preparedData.building_id)
            .single();
            
          if (buildingError || !building) {
            throw new Error(`Building with ID ${preparedData.building_id} does not exist`);
          }
        }
        
        // Validate facade_id if provided
        if (preparedData.facade_id) {
          const { data: facade, error: facadeError } = await supabase
            .from('facades')
            .select('id')
            .eq('id', preparedData.facade_id)
            .single();
            
          if (facadeError || !facade) {
            throw new Error(`Facade with ID ${preparedData.facade_id} does not exist`);
          }
        }
        
        // Remove any undefined or null values that might cause issues
        Object.keys(preparedData).forEach(key => {
          if (preparedData[key] === undefined || preparedData[key] === '') {
            delete preparedData[key];
          }
        });
        
        // Ensure we have a valid UUID for the ID field
        if (!preparedData.id || typeof preparedData.id !== 'string' || preparedData.id.length !== 36) {
          preparedData.id = generateUUID();
        }
        
        // Validate UUID format for all UUID fields
        const uuidFields = ['id', 'project_id', 'building_id', 'facade_id', 'user_id'];
        uuidFields.forEach(field => {
          if (preparedData[field] && (typeof preparedData[field] !== 'string' || preparedData[field].length !== 36)) {
            console.warn(`Invalid UUID format for ${field}:`, preparedData[field]);
            if (field === 'id') {
              preparedData[field] = generateUUID();
            } else {
              delete preparedData[field]; // Remove invalid UUIDs for optional fields
            }
          }
        });
        
        console.log('Prepared panel data:', preparedData);
      }
      
      // Test connection first for projects table
      if (table === 'projects') {
        console.log('Testing connection to projects table...');
        const { data: testData, error: testError } = await supabase
          .from('projects')
          .select('id')
          .limit(1);
        
        if (testError) {
          console.error('Error testing projects table access:', testError);
          throw new Error(`Cannot access projects table: ${testError.message}`);
        }
        console.log('Projects table access test successful');
      }
      
      // Test connection for panels table
      if (table === 'panels') {
        console.log('Testing connection to panels table...');
        const { data: testData, error: testError } = await supabase
          .from('panels')
          .select('id')
          .limit(1);
        
        if (testError) {
          console.error('Error testing panels table access:', testError);
          throw new Error(`Cannot access panels table: ${testError.message}`);
        }
        console.log('Panels table access test successful');
        
        // Also test if we can read from the projects table since panels reference it
        console.log('Testing connection to projects table for panel creation...');
        const { data: projectTestData, error: projectTestError } = await supabase
          .from('projects')
          .select('id')
          .limit(1);
        
        if (projectTestError) {
          console.error('Error testing projects table access:', projectTestError);
          throw new Error(`Cannot access projects table: ${projectTestError.message}`);
        }
        console.log('Projects table access test successful');
        
        // Test if we can insert a minimal panel record (this will be rolled back)
        console.log('Testing minimal panel insert...');
        const testPanelData = {
          id: generateUUID(),
          name: 'TEST_PANEL_DELETE_ME',
          type: 0,
          status: 1,
          project_id: projectTestData?.[0]?.id
        };
        
        const { error: testInsertError } = await supabase
          .from('panels')
          .insert(testPanelData);
        
        if (testInsertError) {
          console.error('Error testing panel insert:', testInsertError);
          console.error('Test insert error details:', {
            message: testInsertError.message,
            details: testInsertError.details,
            hint: testInsertError.hint,
            code: testInsertError.code
          });
        } else {
          console.log('Test panel insert successful - this indicates permissions are OK');
          // Clean up the test record
          await supabase
            .from('panels')
            .delete()
            .eq('name', 'TEST_PANEL_DELETE_ME');
        }
      }
      
      const trackedData = addUserTrackingForCreate(preparedData, table);
      console.log(`Creating ${table} with data:`, trackedData);
      
      console.log(`Attempting to insert into ${table} with data:`, trackedData);
      
      const { data: result, error } = await supabase
        .from(table)
        .insert(trackedData)
        .select()
        .single();

      if (error) {
        console.error(`Error creating ${table}:`, error);
        console.error(`Error details:`, {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        // Try to get more information about the error
        if (error.code === '42501') {
          console.error('Permission denied - check RLS policies');
        } else if (error.code === '23503') {
          console.error('Foreign key constraint violation');
        } else if (error.code === '23502') {
          console.error('Not null constraint violation');
        } else if (error.code === '23505') {
          console.error('Unique constraint violation');
        } else if (error.code === '22P02') {
          console.error('Invalid text representation');
        }
        
        // For panels table, provide more specific debugging
        if (table === 'panels') {
          console.error('=== PANELS TABLE ERROR DEBUG ===');
          console.error('Attempted data:', trackedData);
          console.error('User ID:', getCurrentUserId());
          console.error('Session available:', !!(await getCurrentUserSession()));
          console.error('================================');
        }
        
        throw error;
      }
      return result;
    } catch (error: any) {
      console.error(`Error in create operation for ${table}:`, error);
      throw error;
    }
  },

  // Update with user tracking
  async update(table: string, id: string, data: any) {
    try {
      // Prepare data with proper types and validation
      let preparedData = { ...data };
      
      // Handle specific table requirements
      if (table === 'projects') {
        // Ensure numeric fields are properly typed
        if (typeof preparedData.estimated_cost === 'string') {
          preparedData.estimated_cost = parseInt(preparedData.estimated_cost) || 0;
        }
        if (typeof preparedData.estimated_panels === 'string') {
          preparedData.estimated_panels = parseInt(preparedData.estimated_panels) || 0;
        }
        
        // Ensure dates are in correct format
        if (preparedData.start_date) {
          preparedData.start_date = new Date(preparedData.start_date).toISOString().split('T')[0];
        }
        if (preparedData.end_date) {
          preparedData.end_date = new Date(preparedData.end_date).toISOString().split('T')[0];
        }
        
        // Remove any undefined or null values that might cause issues
        Object.keys(preparedData).forEach(key => {
          if (preparedData[key] === undefined || preparedData[key] === '') {
            delete preparedData[key];
          }
        });
      }
      
      const trackedData = addUserTrackingForUpdate(preparedData, table);
      console.log(`Updating ${table} with data:`, trackedData);
      
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