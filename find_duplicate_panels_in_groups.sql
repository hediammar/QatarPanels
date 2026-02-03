-- Find panels that appear multiple times in panel_group_memberships
-- Excluding panel group id = "0c76217d-a36d-4d4e-86e4-3e429f895d22"
-- Since there's a unique constraint on (panel_id, panel_group_id), 
-- a panel can only appear once per group, so multiple occurrences means the panel is in multiple groups

SELECT 
    pgm.panel_id,
    p.panel_number,
    COUNT(*) as occurrence_count,
    STRING_AGG(pgm.panel_group_id::text, ', ') as panel_group_ids,
    STRING_AGG(pg.name, ', ') as panel_group_names
FROM 
    public.panel_group_memberships pgm
    INNER JOIN public.panels p ON pgm.panel_id = p.id
    INNER JOIN public.panel_groups pg ON pgm.panel_group_id = pg.id
WHERE 
    pgm.panel_group_id != '0c76217d-a36d-4d4e-86e4-3e429f895d22'::uuid
GROUP BY 
    pgm.panel_id, p.panel_number
HAVING 
    COUNT(*) > 1
ORDER BY 
    occurrence_count DESC, p.panel_number;
