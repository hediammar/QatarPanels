const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xpwvyqhkxucpqvncyprw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhwd3Z5cWhreHVjcHF2bmN5cHJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjYxNjcsImV4cCI6MjA2ODYwMjE2N30.lMllGoiCHJBbYHs_8CCgIewbXpAOcMmx6ZWRkBh-zQI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCustomerCreation() {
  console.log('=== CUSTOMER CREATION TEST ===');
  
  try {
    // Test 1: Check if customers table exists and get its structure
    console.log('\n1. Checking customers table structure...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('customers')
      .select('*')
      .limit(0);
    
    if (tableError) {
      console.error('❌ Error accessing customers table:', tableError);
      return;
    }
    console.log('✅ Customers table accessible');
    
    // Test 2: Get existing customers
    console.log('\n2. Fetching existing customers...');
    const { data: existingCustomers, error: fetchError } = await supabase
      .from('customers')
      .select('id, name, email, phone')
      .order('name');
    
    if (fetchError) {
      console.error('❌ Error fetching customers:', fetchError);
      return;
    }
    
    console.log(`✅ Found ${existingCustomers.length} existing customers:`);
    existingCustomers.forEach(customer => {
      console.log(`   - ${customer.name} (${customer.email})`);
    });
    
    // Test 3: Try to create a test customer
    console.log('\n3. Testing customer creation...');
    const testCustomerData = {
      name: `Test Customer ${Date.now()}`,
      email: `test${Date.now()}@example.com`,
      phone: '+1234567890'
    };
    
    console.log('Creating customer with data:', testCustomerData);
    
    const { data: newCustomer, error: createError } = await supabase
      .from('customers')
      .insert(testCustomerData)
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Error creating customer:', createError);
      console.error('Error details:', {
        message: createError.message,
        details: createError.details,
        hint: createError.hint,
        code: createError.code
      });
      
      // If it's a unique constraint violation, try with different data
      if (createError.code === '23505' || createError.code === '409') {
        console.log('\n4. Trying with different data...');
        const alternativeData = {
          name: `Alternative Customer ${Date.now()}`,
          email: `alt${Date.now()}@example.com`,
          phone: '+9876543210'
        };
        
        console.log('Creating customer with alternative data:', alternativeData);
        
        const { data: altCustomer, error: altError } = await supabase
          .from('customers')
          .insert(alternativeData)
          .select()
          .single();
        
        if (altError) {
          console.error('❌ Error creating alternative customer:', altError);
        } else {
          console.log('✅ Alternative customer created successfully:', altCustomer);
          
          // Clean up - delete the test customer
          console.log('\n5. Cleaning up test customer...');
          const { error: deleteError } = await supabase
            .from('customers')
            .delete()
            .eq('id', altCustomer.id);
          
          if (deleteError) {
            console.error('❌ Error deleting test customer:', deleteError);
          } else {
            console.log('✅ Test customer cleaned up successfully');
          }
        }
      }
    } else {
      console.log('✅ Customer created successfully:', newCustomer);
      
      // Clean up - delete the test customer
      console.log('\n4. Cleaning up test customer...');
      const { error: deleteError } = await supabase
        .from('customers')
        .delete()
        .eq('id', newCustomer.id);
      
      if (deleteError) {
        console.error('❌ Error deleting test customer:', deleteError);
      } else {
        console.log('✅ Test customer cleaned up successfully');
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testCustomerCreation();
