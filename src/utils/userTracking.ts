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
      // The user object has an 'id' field directly
      return user.id || null;
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
  
  // If no user_id is available but table requires it, proceed without user tracking
  if (table && TABLES_WITH_USER_TRACKING.includes(table)) {
    console.log(`No user_id available, proceeding without user tracking for ${table}`);
    // Return data without user_id - let the database handle the constraint
    return data;
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
          console.log('Validating customer_id:', preparedData.customer_id);
          const { data: customer, error: customerError } = await supabase
            .from('customers')
            .select('id, name')
            .eq('id', preparedData.customer_id)
            .single();
            
          if (customerError) {
            console.error('Error validating customer:', customerError);
            throw new Error(`Customer validation failed: ${customerError.message}`);
          }
          
          if (!customer) {
            throw new Error(`Customer with ID ${preparedData.customer_id} does not exist. Please select a valid customer.`);
          }
          
          console.log('Customer validation successful:', customer);
        } else {
          console.log('No customer_id provided, skipping customer validation');
        }
        
        // Validate that user exists in users table
        if (preparedData.user_id) {
          console.log('Validating user_id:', preparedData.user_id);
          const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, username, name')
            .eq('id', preparedData.user_id)
            .single();
            
          if (userError) {
            console.error('Error validating user:', userError);
            throw new Error(`User validation failed: ${userError.message}`);
          }
          
          if (!user) {
            console.error('User not found in users table:', preparedData.user_id);
            
            // Try to get the current user from Supabase auth
            try {
              const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
              
              if (authError) {
                console.error('Error getting auth user:', authError);
                throw new Error(`User with ID ${preparedData.user_id} does not exist in the users table. Please log in again.`);
              }
              
              if (authUser) {
                console.log('Found user in auth, checking if they exist in users table...');
                
                // Check if the auth user exists in the users table
                const { data: existingUser, error: checkError } = await supabase
                  .from('users')
                  .select('id, username, name')
                  .eq('email', authUser.email)
                  .single();
                
                if (checkError || !existingUser) {
                  console.log('User not found in users table, creating user record...');
                  
                  // Create the user in the users table
                  const newUserData = {
                    id: authUser.id,
                    username: authUser.email?.split('@')[0] || 'user',
                    name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
                    email: authUser.email || '',
                    role: 'Data Entry', // Default role
                    password_hash: 'temp_hash', // Will be updated on first login
                    status: 'active'
                  };
                  
                  const { data: createdUser, error: createError } = await supabase
                    .from('users')
                    .insert(newUserData)
                    .select()
                    .single();
                  
                  if (createError) {
                    console.error('Error creating user:', createError);
                    throw new Error(`Failed to create user record. Please contact an administrator.`);
                  }
                  
                  console.log('User created successfully:', createdUser);
                  // Update the user_id to use the created user's ID
                  preparedData.user_id = createdUser.id;
                } else {
                  console.log('User found in users table:', existingUser);
                  // Update the user_id to use the existing user's ID
                  preparedData.user_id = existingUser.id;
                }
              } else {
                throw new Error(`User with ID ${preparedData.user_id} does not exist in the users table. Please log in again.`);
              }
            } catch (error) {
              console.error('Error handling missing user:', error);
              throw new Error(`User with ID ${preparedData.user_id} does not exist in the users table. Please log in again.`);
            }
          } else {
            console.log('User validation successful:', user);
          }
        } else {
          console.log('No user_id provided, skipping user validation');
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
        
        // Handle user_id - if not available, try to get it from current session
        if (!preparedData.user_id) {
          const userId = getCurrentUserId();
          if (userId) {
            preparedData.user_id = userId;
          } else {
            // If no user_id is available, we'll proceed without it
            console.warn('No user_id available for panel creation');
            delete preparedData.user_id;
          }
        }
        
        // Remove any undefined or null values that might cause issues
        Object.keys(preparedData).forEach(key => {
          if (preparedData[key] === undefined || preparedData[key] === '') {
            delete preparedData[key];
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
      }
      
      const trackedData = addUserTrackingForCreate(preparedData, table);
      console.log(`Creating ${table} with data:`, trackedData);
      
      console.log(`Attempting to insert into ${table} with data:`, trackedData);
      
      // For projects, check if a project with the same name already exists
      if (table === 'projects' && preparedData.name) {
        console.log('Checking for existing project with same name...');
        const { data: existingProjects, error: checkError } = await supabase
          .from('projects')
          .select('id, name, customer_id')
          .eq('name', preparedData.name);
        
        if (checkError) {
          console.error('Error checking for existing projects:', checkError);
        } else if (existingProjects && existingProjects.length > 0) {
          console.log('Found existing projects with same name:', existingProjects);
          throw new Error(`A project with the name "${preparedData.name}" already exists. Please choose a different name.`);
        }
      }
      
      // Log the exact data being sent to help debug 409 errors
      console.log(`=== ${table.toUpperCase()} INSERT DEBUG ===`);
      console.log('Table:', table);
      console.log('Data being inserted:', JSON.stringify(trackedData, null, 2));
      console.log('User ID:', getCurrentUserId());
      console.log('Session available:', !!(await getCurrentUserSession()));
      console.log('=====================================');
      
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
        
        // Log the exact request that failed
        console.error(`Failed request data:`, {
          table: table,
          data: trackedData,
          error: error
        });
        
        // Log the full error object for debugging
        console.error(`Full error object:`, JSON.stringify(error, null, 2));
        
        // Handle specific error codes
        if (error.code === '23505') {
          // Unique constraint violation
          if (table === 'projects') {
            throw new Error(`A project with this name already exists. Please choose a different name.`);
          } else {
            throw new Error(`A record with these details already exists. Please check your input and try again.`);
          }
        } else if (error.code === '23503') {
          // Foreign key constraint violation
          if (table === 'projects' && error.message.includes('customer_id')) {
            throw new Error(`The selected customer does not exist. Please choose a valid customer.`);
          } else {
            throw new Error(`Referenced record does not exist. Please check your selection.`);
          }
        } else {
          throw new Error(`Failed to create ${table}: ${error.message}`);
        }
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

// Test database connectivity and table structure
export const testDatabaseConnection = async () => {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const { data: testData, error: testError } = await supabase
      .from('panels')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('Database connection test failed:', testError);
      return false;
    }
    
    console.log('Database connection test successful');
    
    // Test if we can read from projects table
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
      .limit(1);
    
    if (projectError) {
      console.error('Projects table access test failed:', projectError);
      return false;
    }
    
    console.log('Projects table access test successful');
    return true;
  } catch (error) {
    console.error('Database connection test error:', error);
    return false;
  }
}; 

// Check table structure to understand required fields
export const checkTableStructure = async (tableName: string) => {
  try {
    console.log(`Checking structure for table: ${tableName}`);
    
    // Try to get table information
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(0);
    
    if (error) {
      console.error(`Error checking table structure for ${tableName}:`, error);
      return null;
    }
    
    console.log(`Table ${tableName} structure check successful`);
    return true;
  } catch (error) {
    console.error(`Error checking table structure for ${tableName}:`, error);
    return null;
  }
}; 

// Test minimal panel creation to debug 400 error
export const testMinimalPanelCreation = async () => {
  try {
    console.log('Testing minimal panel creation...');
    
    // Get a valid project ID first
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .limit(1);
    
    if (projectError || !projects || projects.length === 0) {
      console.error('No projects available for testing');
      return false;
    }
    
    const testProjectId = projects[0].id;
    console.log('Using test project ID:', testProjectId);
    
    // Try to create a minimal panel
    const minimalPanelData = {
      name: 'TEST_PANEL_DELETE_ME',
      type: 0,
      status: 1,
      project_id: testProjectId
    };
    
    console.log('Testing with minimal data:', minimalPanelData);
    
    const { data, error } = await supabase
      .from('panels')
      .insert(minimalPanelData)
      .select()
      .single();
    
    if (error) {
      console.error('Minimal panel creation failed:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return false;
    }
    
    console.log('Minimal panel creation successful:', data);
    
    // Clean up the test record
    await supabase
      .from('panels')
      .delete()
      .eq('name', 'TEST_PANEL_DELETE_ME');
    
    return true;
  } catch (error) {
    console.error('Test minimal panel creation error:', error);
    return false;
  }
}; 