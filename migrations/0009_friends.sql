-- Friend requests between players, by the email they log in with (worker/access.ts).
-- One row per request, from requester to addressee; accepting it sets accepted to 1.
-- Friends see each other's trainers, can send each other Pokemon and items, and are
-- suggested when inviting city members (docs/friends.md).
CREATE TABLE friends (
  requester TEXT NOT NULL,
  addressee TEXT NOT NULL,
  accepted INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (requester, addressee)
);
CREATE INDEX friends_addressee ON friends (addressee);
