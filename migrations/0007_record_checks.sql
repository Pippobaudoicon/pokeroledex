-- Shared city records are read, changed in memory and written back by each request
-- (worker/api.ts). A request first inserts here the city exactly as it loaded it: the row
-- is never kept, and the whole batch rolls back if another request changed that city since,
-- so two members moving items at once cannot lose or duplicate them. The Worker retries.
CREATE TABLE record_checks (
  owner TEXT NOT NULL,
  collection TEXT NOT NULL,
  id TEXT NOT NULL,
  data TEXT NOT NULL
);
CREATE TRIGGER record_checks_verify BEFORE INSERT ON record_checks
BEGIN
  SELECT RAISE(ABORT, 'STALE_RECORD') WHERE NOT EXISTS (SELECT 1 FROM records
    WHERE owner = NEW.owner AND collection = NEW.collection AND id = NEW.id AND data = NEW.data);
  SELECT RAISE(IGNORE);
END;
