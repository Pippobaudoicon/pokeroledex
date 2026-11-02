-- Records belong to the email Cloudflare Access logged the request in with
-- (worker/access.ts). Records from before logins belong to 'local-user', which is
-- also the only user of `pnpm dev`. Ids stay unique per owner, so two people can
-- import the same shared campaign.
CREATE TABLE records_by_owner (
  seq INTEGER PRIMARY KEY,
  owner TEXT NOT NULL,
  collection TEXT NOT NULL,
  id TEXT NOT NULL,
  data TEXT NOT NULL,
  UNIQUE (owner, collection, id)
);
INSERT INTO records_by_owner (seq, owner, collection, id, data) SELECT seq, 'local-user', collection, id, data FROM records;
DROP TABLE records;
ALTER TABLE records_by_owner RENAME TO records;
