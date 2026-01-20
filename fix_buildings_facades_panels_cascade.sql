-- Enforce true cascade deletion chain:
-- Project -> Building -> Facade -> Panels
--
-- This script is robust to differing FK constraint names:
-- it drops any existing FK constraints on the relevant columns,
-- then recreates them with ON DELETE CASCADE.

-- projects -> buildings
DO $$
DECLARE
  r RECORD;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'buildings'
      AND column_name = 'project_id'
  ) THEN
    FOR r IN
      SELECT tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'buildings'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'project_id'
    LOOP
      EXECUTE format('ALTER TABLE public.buildings DROP CONSTRAINT %I', r.constraint_name);
    END LOOP;

    EXECUTE 'ALTER TABLE public.buildings
      ADD CONSTRAINT buildings_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES public.projects(id)
      ON DELETE CASCADE';

    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_buildings_project_id ON public.buildings(project_id)';
  END IF;
END $$;

-- buildings -> facades
DO $$
DECLARE
  r RECORD;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'facades'
      AND column_name = 'building_id'
  ) THEN
    FOR r IN
      SELECT tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'facades'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'building_id'
    LOOP
      EXECUTE format('ALTER TABLE public.facades DROP CONSTRAINT %I', r.constraint_name);
    END LOOP;

    EXECUTE 'ALTER TABLE public.facades
      ADD CONSTRAINT facades_building_id_fkey
      FOREIGN KEY (building_id) REFERENCES public.buildings(id)
      ON DELETE CASCADE';

    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_facades_building_id ON public.facades(building_id)';
  END IF;
END $$;

-- facades -> panels
DO $$
DECLARE
  r RECORD;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'panels'
      AND column_name = 'facade_id'
  ) THEN
    FOR r IN
      SELECT tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'panels'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'facade_id'
    LOOP
      EXECUTE format('ALTER TABLE public.panels DROP CONSTRAINT %I', r.constraint_name);
    END LOOP;

    EXECUTE 'ALTER TABLE public.panels
      ADD CONSTRAINT panels_facade_id_fkey
      FOREIGN KEY (facade_id) REFERENCES public.facades(id)
      ON DELETE CASCADE';

    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_panels_facade_id ON public.panels(facade_id)';
  END IF;
END $$;

-- buildings -> panels (if you also store building_id on panels, cascade it too)
DO $$
DECLARE
  r RECORD;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'panels'
      AND column_name = 'building_id'
  ) THEN
    FOR r IN
      SELECT tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'panels'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'building_id'
    LOOP
      EXECUTE format('ALTER TABLE public.panels DROP CONSTRAINT %I', r.constraint_name);
    END LOOP;

    EXECUTE 'ALTER TABLE public.panels
      ADD CONSTRAINT panels_building_id_fkey
      FOREIGN KEY (building_id) REFERENCES public.buildings(id)
      ON DELETE CASCADE';

    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_panels_building_id ON public.panels(building_id)';
  END IF;
END $$;
