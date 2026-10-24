-- City actions are plain names again: residents are assigned to them and their values are
-- derived from those residents, so 0004's { name, value } tags become their names. Skill and
-- action values are no longer stored; the stored `skills` are ignored and recalculated.
UPDATE records SET data = json_set(data, '$.tags', (
  SELECT json_group_array(name) FROM (
    SELECT CASE type WHEN 'object' THEN json_extract(value, '$.name') ELSE value END AS name
    FROM json_each(records.data, '$.tags')
    WHERE type IN ('object', 'text')
  ) WHERE name IS NOT NULL AND trim(name) <> ''))
WHERE collection = 'cities' AND json_type(data, '$.tags') = 'array';
