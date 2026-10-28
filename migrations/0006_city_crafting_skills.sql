-- Cities move from the 8 work skills to the crafting and support skills (docs/crafting-plan.md).
-- Each stored assignment moves to the closest new skill. Residents whose species cannot work
-- the new skill are dropped when the city is read, so they show up unassigned.
UPDATE records SET data = json_set(data, '$.assignments', (
  SELECT json_group_object(key, CASE value
    WHEN 'skill:medicine_production' THEN 'skill:apothecary'
    WHEN 'skill:farming' THEN 'skill:apothecary'
    WHEN 'skill:planting' THEN 'skill:apothecary'
    WHEN 'skill:handiwork' THEN 'skill:craftsmanship'
    WHEN 'skill:generating_electricity' THEN 'skill:technology'
    WHEN 'skill:mining' THEN 'skill:metallurgy'
    WHEN 'skill:science' THEN 'skill:research'
    WHEN 'skill:transporting' THEN 'skill:foraging'
    ELSE value END)
  FROM json_each(records.data, '$.assignments')))
WHERE collection = 'cities' AND json_type(data, '$.assignments') = 'object';
