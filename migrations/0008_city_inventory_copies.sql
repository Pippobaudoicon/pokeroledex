-- City storage only shares reference item IDs; campaign items are stored as self-contained
-- copies (worker/api.ts, addToInventory). Earlier deposits kept the depositor's campaign
-- itemId, which other members cannot resolve. Copy those items inline from a current member's
-- collection (the oldest record if several members have that ID). Snapshot rows are already
-- read as copies; rows whose item no member has any more show as "Unavailable item".
UPDATE records SET data = json_set(data, '$.inventory', (
  SELECT json_group_array(json(CASE WHEN source IS NULL THEN value ELSE json_patch(json_remove(value, '$.itemId'), json_object(
    'name', json(source -> '$.name'), 'source', json(source -> '$.source'), 'category', json(source -> '$.category'),
    'pocket', json(source -> '$.pocket'), 'description', json(source -> '$.description'), 'oneUse', json(source -> '$.oneUse'),
    'PMD', json(source -> '$.PMD'), 'trainerPrice', json(source -> '$.trainerPrice'), 'pmdPrice', json(source -> '$.pmdPrice'),
    'image', json(source -> '$.image'))) END))
  FROM (
    SELECT entry.value, CASE WHEN entry.type = 'object' AND json_type(entry.value, '$.itemSnapshot') IS NULL THEN (
      SELECT item.data FROM records item JOIN city_members member ON member.email = item.owner
      WHERE member.city_id = records.id AND item.collection = 'items' AND item.id = entry.value ->> '$.itemId'
      ORDER BY item.seq LIMIT 1) END AS source
    FROM json_each(records.data, '$.inventory') entry
  )))
WHERE collection = 'cities' AND json_type(data, '$.inventory') = 'array' AND json_array_length(data, '$.inventory') > 0;
