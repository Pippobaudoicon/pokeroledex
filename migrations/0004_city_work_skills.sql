-- Cities moved from trainer skills to work skills, and action tags got a value.
-- Ratings with a matching work skill carry over (crafts -> handiwork,
-- medicine -> medicine_production, science); the others have no counterpart and are
-- dropped. Tags become { name, value } with value 0.
UPDATE records SET data = json_set(data,
  '$.skills', json_object(
    'generating_electricity', 0, 'mining', 0,
    'handiwork', coalesce(data ->> '$.skills.crafts', 0),
    'medicine_production', coalesce(data ->> '$.skills.medicine', 0),
    'transporting', 0, 'farming', 0, 'planting', 0,
    'science', coalesce(data ->> '$.skills.science', 0)),
  '$.tags', (SELECT json_group_array(json_object('name', value, 'value', 0)) FROM json_each(records.data, '$.tags')))
WHERE collection = 'cities';
