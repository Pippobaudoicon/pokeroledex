-- Cities can be shared. Each city and its residents live under their own owner,
-- 'city:<city id>', and every member's requests load that owner's records too
-- (worker/api.ts). Existing cities keep their creator as the only member.
CREATE TABLE city_members (
  city_id TEXT NOT NULL,
  email TEXT NOT NULL,
  PRIMARY KEY (city_id, email)
);
CREATE INDEX city_members_email ON city_members (email);
INSERT INTO city_members (city_id, email) SELECT id, owner FROM records WHERE collection = 'cities';
UPDATE records SET owner = 'city:' || (data ->> 'cityId')
  WHERE collection = 'pokemon' AND data ->> 'cityId' IS NOT NULL AND EXISTS (
    SELECT 1 FROM records city WHERE city.collection = 'cities' AND city.owner = records.owner AND city.id = records.data ->> 'cityId');
UPDATE records SET owner = 'city:' || id WHERE collection = 'cities';
