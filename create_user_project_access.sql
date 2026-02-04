-- Create user_project_access junction table for project access control
-- This table stores which users have access to which projects

CREATE TABLE IF NOT EXISTS public.user_project_access (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    project_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT user_project_access_pkey PRIMARY KEY (id),
    CONSTRAINT user_project_access_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT user_project_access_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT user_project_access_unique UNIQUE (user_id, project_id)
) TABLESPACE pg_default;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_project_access_user_id ON public.user_project_access USING btree (user_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_user_project_access_project_id ON public.user_project_access USING btree (project_id) TABLESPACE pg_default;

-- Disable RLS for this table (matching the pattern used by other tables in this project)
-- This allows all authenticated and anonymous users to perform CRUD operations
ALTER TABLE public.user_project_access DISABLE ROW LEVEL SECURITY;

-- Alternative: If you want to enable RLS with permissive policies, uncomment below:
-- ALTER TABLE public.user_project_access ENABLE ROW LEVEL SECURITY;
-- 
-- -- Allow all operations for anon and authenticated roles
-- CREATE POLICY "Allow all operations on user_project_access" ON public.user_project_access
--     FOR ALL
--     TO anon, authenticated
--     USING (true)
--     WITH CHECK (true);

-- Comments for documentation
COMMENT ON TABLE public.user_project_access IS 'Junction table for user-project access control';
COMMENT ON COLUMN public.user_project_access.user_id IS 'Reference to the user';
COMMENT ON COLUMN public.user_project_access.project_id IS 'Reference to the project the user has access to';

-- Grant permissions to anon and authenticated roles
GRANT ALL ON public.user_project_access TO anon;
GRANT ALL ON public.user_project_access TO authenticated;
GRANT ALL ON public.user_project_access TO service_role;
