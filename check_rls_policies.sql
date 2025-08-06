-- Check for Row Level Security (RLS) policies that might be causing 409 Conflict error
-- RLS policies can sometimes interfere with DELETE operations

-- Step 1: Check if RLS is enabled on the panels table
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'panels';

-- Step 2: Check for any RLS policies on the panels table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'panels';

-- Step 3: Check for any RLS policies on related tables
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('panel_status_histories', 'projects', 'users');

-- Step 4: Check if there are any triggers that might be causing issues
SELECT 
    trigger_name, 
    event_manipulation, 
    action_statement,
    action_timing,
    action_orientation
FROM information_schema.triggers 
WHERE event_object_table = 'panels' 
ORDER BY trigger_name;

-- Step 5: Check for any constraints that might be causing issues
SELECT 
    tc.constraint_name,
    tc.table_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'panels'
ORDER BY tc.constraint_type, tc.constraint_name;

-- Step 6: Check if there are any functions that might be called during DELETE
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_definition LIKE '%panels%'
AND routine_definition LIKE '%DELETE%'; 