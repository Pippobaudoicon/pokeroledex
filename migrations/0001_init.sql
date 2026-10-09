-- User-created records: pokemon, trainers, campaigns, feedback and campaign-custom
-- moves, items, abilities, natures and pokemon-templates. `data` holds the record JSON.
-- `seq` keeps insertion order, which list endpoints return.
CREATE TABLE records (
  seq INTEGER PRIMARY KEY,
  collection TEXT NOT NULL,
  id TEXT NOT NULL,
  data TEXT NOT NULL,
  UNIQUE (collection, id)
);
