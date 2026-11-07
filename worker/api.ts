// JSON API. Reference data is read-only; user records live in D1 under the owner's
// email (migrations/, worker/access.ts). Shared cities and their residents live under
// 'city:<id>' and are loaded for every member (city_members). Each request loads these
// records, works on them in memory and writes back only the records it changed; a city
// changed by someone else meanwhile makes the request run again (migrations/0007).
import { ATTRIBUTES, CRAFTING_SKILLS, RANKS, SKILLS, SOCIALS, TRAINER_SKILLS } from '../shared/types.ts';
import { canAssign, cityLimits, cityValues, isCitySkill, residentBonus, type ResidentWork } from '../shared/cities.ts';
import { canWork, checkCityRecipe, checkFaces, cityRecipe, countSuccesses, craftBlockers, isUnlocked, itemRecipe, orderCost, orderRoom, orderSteps, orderUsage, overCapacity, researchBlockers, rollDice, TIERS, type Recipe } from '../shared/crafting.ts';
import { ITEM_EXCEPTIONS, speciesWorkProfile } from '../shared/crafting-data.ts';
import type { City, CityOrder, CityResearched, GenerateEncounterBody, Habitat, Pokemon, PokemonTemplate, Rank, Stats, Trainer } from '../shared/types.ts';
import { matchesEncounterFilters } from '../shared/encounters.ts';
import { isHabitat, isHabitatFilter, matchesHabitats, normalizeHabitats } from '../shared/habitats.ts';
import type { Env } from './index.ts';
import { askRulebook } from './ask.ts';
import { IssueError, openIssue } from './github.ts';
import { fetchOldData } from './import.ts';
import { loadReference, type Reference } from './reference.ts';

// Stored and reference records are handled generically by collection name.
type Json = Record<string, any>;
type Row = Json & { id: string };
type Collections = Record<string, Row[]>;

const referenceNames = ['pokemon-templates', 'moves', 'items', 'abilities', 'natures'];
const collectionNames = ['pokemon', 'trainers', 'cities', 'campaigns', 'feedback', 'issues', ...referenceNames];
const blankStats = () => Object.fromEntries([...ATTRIBUTES, ...SOCIALS, ...SKILLS, ...TRAINER_SKILLS, 'happiness', 'loyalty', 'will'].map(key => [key, 0])) as Stats;

class HttpError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

function fail(status: number, message: string): never {
  throw new HttpError(status, message);
}

// Seeded generators that pick from the reference data and rank point budgets.
function randomSource(seed: unknown) {
  let state = Number(seed) >>> 0 || 1;
  return () => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

async function readBody(request: Request): Promise<Json> {
  let text = '';
  const decoder = new TextDecoder();
  if (request.body) for await (const chunk of request.body) {
    text += decoder.decode(chunk, { stream: true });
    if (text.length > 2_000_000) fail(413, 'Request is too large.');
  }
  text += decoder.decode();
  let body: unknown;
  try { body = text ? JSON.parse(text) : {}; }
  catch { fail(400, 'Invalid JSON.'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Request body must be an object.');
  return body as Json;
}

const cityOwner = (cityId: string) => `city:${cityId}`;
// Habitat corrections for core Pokémon, shared by every player (docs/habitats.md). Emails
// always contain '@', so this owner never collides with a person's records.
const GLOBAL_OWNER = 'global';
const HABITAT_OVERRIDES = 'habitat-overrides';

/** Records a stored record points to; a Pokemon's custom entries may belong to another account. */
function references(name: string, record: Row): [string, unknown][] {
  if (name === 'pokemon') return [['pokemon-templates', record.pokemonTemplateId], ['abilities', record.abilityId],
    ['natures', record.natureId], ['items', record.heldItemId], ...(record.moveIds ?? []).map((id: unknown): [string, unknown] => ['moves', id])];
  const result: [string, unknown][] = [['campaigns', record.campaignId]];
  if (name === 'pokemon-templates') {
    for (const key of ['abilityOneId', 'abilityTwoId', 'hiddenAbilityId', 'eventAbilityId']) result.push(['abilities', record[key]]);
    for (const move of record.possibleMoves ?? []) result.push(['moves', move.moveId]);
  }
  return result;
}

function reply(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function handleApi(request: Request, env: Env, url: URL, owner: string): Promise<Response> {
  try {
    const [name, action, id, member] = url.pathname.replace(/^\/api\/*/, '').split('/').filter(Boolean).map(decodeURIComponent);
    const method = request.method;
    const body = ['POST', 'PATCH', 'PUT'].includes(method) ? await readBody(request) : {};
    const reference = await loadReference(env.ASSETS, url.origin);
    if (name === 'rankup-attributes' && method === 'GET') {
      const budget = reference.rankAttributes[action as Rank];
      return reply(budget?.rank ? budget : null);
    }
    if (name === 'me' && method === 'GET') return reply({ email: owner });
    if (name === 'import' && method === 'POST') {
      if (typeof body.token !== 'string' || !body.token.trim()) fail(400, 'Paste the login token from pokeroledex.nl.');
      const { collections, missing, skipped } = await fetchOldData(body.token.trim().replace(/^bearer\s+/i, ''), owner, reference);
      // One statement however many records there are; D1 limits queries per request.
      const rows = Object.entries(collections).flatMap(([collection, records]) => records.map(record => ({ collection, id: record.id, data: JSON.stringify(record) })));
      // Sheets that now live in one of the person's cities stay there instead of being copied back.
      await env.DB.prepare(`INSERT INTO records (owner, collection, id, data)
        SELECT ?, value ->> 'collection', value ->> 'id', value ->> 'data' FROM json_each(?)
        WHERE NOT (value ->> 'collection' = 'pokemon' AND EXISTS (SELECT 1 FROM records resident
          WHERE resident.collection = 'pokemon' AND resident.id = value ->> 'id'
          AND resident.owner IN (SELECT 'city:' || city_id FROM city_members WHERE email = ?)))
        ON CONFLICT (owner, collection, id) DO UPDATE SET data = excluded.data`).bind(owner, JSON.stringify(rows), owner).run();
      return reply({ counts: Object.fromEntries(Object.entries(collections).map(([name, records]) => [name, records.length])), missing, skipped });
    }
    if (name === 'rulebook' && action === 'ask' && method === 'POST') {
      const { status, ...result } = await askRulebook(env, body.question);
      return reply(status === 200 ? result : { status, payload: result.message }, status);
    }
    if (name === 'issues' && method === 'POST') return reply(await openIssue(env, owner, body), 201);
    // Give one of your own Pokemon (not a city resident) to a player who already has records or
    // a city here. It leaves your trainers; it gets a new id if theirs is taken, as two people
    // can import the same campaign.
    if (name === 'pokemon' && action && id === 'send' && method === 'POST') {
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      if (email === owner) fail(400, 'This Pokemon is already yours.');
      // Reserved owners such as 'global' and 'city:<id>' hold records too, but are not players.
      if (!email.includes('@')) fail(400, 'Enter the email address of the player to send it to.');
      const { results: known } = await env.DB.prepare(`SELECT 1 FROM records WHERE owner = ?
        UNION ALL SELECT 1 FROM city_members WHERE email = ? LIMIT 1`).bind(email, email).all();
      if (!known.length) fail(404, `No player uses ${email || 'that email'} here.`);
      const { results: [row] } = await env.DB.prepare(`SELECT data, EXISTS (SELECT 1 FROM records copy
          WHERE copy.owner = ? AND copy.collection = 'pokemon' AND copy.id = records.id) AS taken
        FROM records WHERE owner = ? AND collection = 'pokemon' AND id = ?`).bind(email, owner, action).all<{ data: string; taken: number }>();
      if (!row) fail(404, 'Pokemon not found. City residents must be taken into My Pokemon first.');
      const record: Row = { ...JSON.parse(row.data), userId: email, trainerId: null, cityId: null };
      if (row.taken) record.id = crypto.randomUUID();
      await env.DB.prepare('UPDATE records SET owner = ?, id = ?, data = ? WHERE owner = ? AND collection = ? AND id = ?')
        .bind(email, record.id, JSON.stringify(record), owner, 'pokemon', action).run();
      return reply({ id: record.id, email });
    }
    if (!collectionNames.includes(name)) return reply({ payload: 'Unknown local API endpoint.' }, 404);
    // A city another member changed since it was loaded rolls the batch back (migrations/0007);
    // the request then runs again on fresh records, so its checks see the other change.
    for (let attempt = 1; ; attempt++) {
      const db: Collections = Object.fromEntries(collectionNames.map(name => [name, []]));
      // The stored owner of each loaded record, so changes are written back to the right place.
      const partitions = new Map<Row, string>();
      const loaded = new Map<Row, string>();
      const habitatOverrides = new Map<string, Habitat[]>();
      const { results } = await env.DB.prepare(`SELECT owner, collection, data FROM records
        WHERE owner = ? OR owner IN (SELECT 'city:' || city_id FROM city_members WHERE email = ?)
          OR (owner = ? AND collection = ?) ORDER BY seq`)
        .bind(owner, owner, GLOBAL_OWNER, HABITAT_OVERRIDES).all<{ owner: string; collection: string; data: string }>();
      for (const row of results) {
        const record = JSON.parse(row.data);
        if (row.owner === GLOBAL_OWNER) {
          if (Array.isArray(record.habitats)) habitatOverrides.set(record.id, record.habitats.filter(isHabitat));
          continue;
        }
        db[row.collection].push(record);
        partitions.set(record, row.owner);
        if (row.collection === 'cities') loaded.set(record, row.data);
      }
      const members = new Map<string, string[]>();
      const { results: memberRows } = await env.DB.prepare(`SELECT city_id, email FROM city_members
        WHERE city_id IN (SELECT city_id FROM city_members WHERE email = ?) ORDER BY rowid`).bind(owner).all<{ city_id: string; email: string }>();
      for (const row of memberRows) members.set(row.city_id, [...members.get(row.city_id) ?? [], row.email]);
      const foreign = await loadForeign(db, reference as unknown as Collections);
      const templatesInUse = method === 'DELETE' && ['campaigns', 'pokemon-templates'].includes(name) ? await templatesUsedElsewhere() : new Set<string>();
      const checks = new Map<Row, D1PreparedStatement>();
      const writes: D1PreparedStatement[] = [];
      const response = route({ db, partitions, loaded, checks, members, foreign, templatesInUse, habitatOverrides }, reference, writes, method, name, action, id, member, body);
      if (!writes.length) return response;
      try {
        await env.DB.batch([...checks.values(), ...writes]);
        return response;
      } catch (error) {
        if (!String((error as Error)?.message).includes('STALE_RECORD')) throw error;
        if (attempt === 5) fail(409, 'Someone else changed this city at the same time. Reload and try again.');
        // A random pause keeps requests that collided from colliding again.
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50 * attempt));
      }
    }
  } catch (error) {
    const status = error instanceof HttpError || error instanceof IssueError ? error.status : 500;
    return reply({ status, payload: (error as Error).message }, status);
  }

  // Pokemon move between accounts through shared cities, but their custom species, moves,
  // abilities and items stay in the creator's campaign. Load just those entries, read-only,
  // so the sheet still shows them; the campaigns themselves stay private. Entries that a
  // custom species refers to are only taken from the account that owns that species.
  async function loadForeign(db: Collections, reference: Collections): Promise<Collections> {
    const foreign: Collections = {};
    if (!db.pokemon.length) return foreign;
    const known = new Set<string>();
    for (const source of [db, reference]) for (const [name, records] of Object.entries(source)) {
      if (Array.isArray(records)) for (const record of records) known.add(`${name}\0${record.id}`);
    }
    let pending: { name: string; record: Row; owner: string | null }[] = db.pokemon.map(record => ({ name: 'pokemon', record, owner: null }));
    for (let round = 0; round < 3 && pending.length; round++) {
      const wanted = new Map<string, [string, string, string | null]>();
      for (const { name, record, owner } of pending) for (const [kind, id] of references(name, record)) {
        if (typeof id === 'string' && id && !known.has(`${kind}\0${id}`)) wanted.set(`${kind}\0${id}\0${owner}`, [kind, id, owner]);
      }
      if (!wanted.size) break;
      const { results } = await env.DB.prepare(`SELECT records.owner, records.collection, records.data FROM records
        JOIN json_each(?) wanted ON records.collection = wanted.value ->> '$[0]' AND records.id = wanted.value ->> '$[1]'
          AND (wanted.value ->> '$[2]' IS NULL OR records.owner = wanted.value ->> '$[2]')
        ORDER BY records.seq`).bind(JSON.stringify([...wanted.values()])).all<{ owner: string; collection: string; data: string }>();
      pending = [];
      for (const row of results) {
        const record: Row = JSON.parse(row.data);
        const key = `${row.collection}\0${record.id}`;
        if (known.has(key)) continue;
        known.add(key);
        (foreign[row.collection] ??= []).push(record);
        pending.push({ name: row.collection, record, owner: row.owner });
      }
    }
    return foreign;
  }

  // Custom species of this person that sheets elsewhere (other accounts, cities they left)
  // still use, and that no other account has a copy of.
  async function templatesUsedElsewhere() {
    const { results } = await env.DB.prepare(`SELECT DISTINCT template.id FROM records pokemon
      JOIN records template ON template.owner = ? AND template.collection = 'pokemon-templates' AND template.id = pokemon.data ->> 'pokemonTemplateId'
      WHERE pokemon.collection = 'pokemon' AND NOT EXISTS (SELECT 1 FROM records copy
        WHERE copy.collection = 'pokemon-templates' AND copy.id = template.id AND copy.owner <> ?)`)
      .bind(owner, owner).all<{ id: string }>();
    return new Set(results.map(row => row.id));
  }

  function upsert(partition: string, name: string, record: Row) {
    return env.DB.prepare('INSERT INTO records (owner, collection, id, data) VALUES (?, ?, ?, ?) ON CONFLICT (owner, collection, id) DO UPDATE SET data = excluded.data')
      .bind(partition, name, record.id, JSON.stringify(record));
  }

  function route(state: { db: Collections; partitions: Map<Row, string>; loaded: Map<Row, string>; checks: Map<Row, D1PreparedStatement>;
    members: Map<string, string[]>; foreign: Collections; templatesInUse: Set<string>; habitatOverrides: Map<string, Habitat[]> },
    reference: Reference, writes: D1PreparedStatement[],
    method: string, name: string, action: string | undefined, id: string | undefined, member: string | undefined, body: Json): Response {
    const { db, partitions, loaded, checks, members, foreign, templatesInUse, habitatOverrides } = state;
    const referenceRows = reference as unknown as Collections;

    // Cities and their residents are stored under the city; everything else under the person.
    function partitionFor(name: string, record: Row) {
      if (name === 'cities') return cityOwner(record.id);
      if (name === 'pokemon' && record.cityId) return cityOwner(record.cityId);
      return owner;
    }

    /** Writes to a city only apply if nobody changed it since this request loaded it. */
    function check(record: Row) {
      const data = loaded.get(record);
      if (data === undefined || checks.has(record)) return;
      checks.set(record, env.DB.prepare('INSERT INTO record_checks (owner, collection, id, data) VALUES (?, ?, ?, ?)')
        .bind(partitions.get(record), 'cities', record.id, data));
    }

    function put(name: string, record: Row) {
      check(record);
      const target = partitionFor(name, record);
      const current = partitions.get(record);
      if (current && current !== target) {
        if (db[name].some(other => other !== record && other.id === record.id && partitions.get(other) === target)) fail(409, 'A record with that ID already exists there.');
        writes.push(env.DB.prepare('UPDATE records SET owner = ?, data = ? WHERE owner = ? AND collection = ? AND id = ?')
          .bind(target, JSON.stringify(record), current, name, record.id));
      } else {
        writes.push(upsert(target, name, record));
      }
      partitions.set(record, target);
    }

    function drop(name: string, record: Row) {
      check(record);
      writes.push(env.DB.prepare('DELETE FROM records WHERE owner = ? AND collection = ? AND id = ?').bind(partitions.get(record) ?? owner, name, record.id));
    }

    function find(name: string, id: unknown): Row | null {
      return db[name]?.find(record => record.id === id) ?? referenceRows[name]?.find(record => record.id === id) ?? null;
    }

    /** Like find, but also sees the read-only custom entries that visible Pokemon use. */
    function lookup(name: string, id: unknown): Row | null {
      return find(name, id) ?? foreign[name]?.find(record => record.id === id) ?? null;
    }

    function template(record: Row | null): Row | null {
      if (!record) return null;
      const override = record.campaignId ? undefined : habitatOverrides.get(record.id);
      const normalized = { ...record, habitats: normalizeHabitats(override ?? record.habitats ?? []), ...(override && { habitatsEdited: true }) };
      if (!record.campaignId) return normalized;
      const result: Row = { ...normalized, campaign: lookup('campaigns', record.campaignId) };
      for (const key of ['abilityOne', 'abilityTwo', 'hiddenAbility', 'eventAbility']) {
        result[key] = lookup('abilities', record[`${key}Id`]);
      }
      result.possibleMoves = (record.possibleMoves ?? []).map((move: Row) => ({
        ...move, move: lookup('moves', move.moveId),
      })).filter((move: Row) => move.move);
      return result;
    }

    function referenceRecord(name: string, record: Row) {
      if (name === 'pokemon-templates') return template(record);
      return record?.campaignId ? { ...record, campaign: lookup('campaigns', record.campaignId) } : record;
    }

    function selected(name: string, body: Json = {}) {
      const campaignIds: string[] = body.campaignIds ?? [];
      return [
        ...(body.includeCore === false ? [] : referenceRows[name] ?? []),
        ...db[name].filter(record => campaignIds.includes(record.campaignId)),
      ].map(record => referenceRecord(name, record)!);
    }

    function pokemon(record: Row): Pokemon {
      return { ...record,
        pokemonTemplate: template(lookup('pokemon-templates', record.pokemonTemplateId)),
        ability: lookup('abilities', record.abilityId), nature: lookup('natures', record.natureId),
        heldItem: lookup('items', record.heldItemId), trainer: find('trainers', record.trainerId),
        moves: (record.moveIds ?? []).map((id: string) => lookup('moves', id)).filter(Boolean),
      } as Pokemon;
    }

    /** The item an inventory entry points at. City storage only shares reference IDs, so it never
     * resolves to the viewer's own item that happens to have the same ID. */
    function inventoryItem(itemId: unknown, shared: boolean): Row | null {
      return shared ? referenceRows.items.find(item => item.id === itemId) ?? null : find('items', itemId);
    }

    function inventory(entries: Row[] | undefined, shared = false) {
      return (entries ?? []).map((entry: Row) => {
        // Older generated rewards used snapshots with account-scoped item IDs.
        if (entry.itemSnapshot) entry = { ...customInventoryFields(entry.itemSnapshot), id: entry.id, quantity: entry.quantity };
        let item: Row | null = entry.itemId ? inventoryItem(entry.itemId, shared) : { ...entry, id: `custom-${entry.id}` };
        // A stored campaign item whose owner is gone (see migrations/0008) stays visible so the leader can discard it.
        if (!item && shared) item = { id: `custom-${entry.id}`, name: 'Unavailable item', description: 'The original item is no longer available.' };
        return { ...entry, item };
      }).filter((entry: Row) => entry.item);
    }

    function trainer(record: Row): Trainer {
      return { ...record, nature: find('natures', record.natureId),
        pokemon: db.pokemon.filter(p => p.trainerId === record.id).map(pokemon),
        inventory: inventory(record.inventory),
      } as Trainer;
    }

    /**
     * Current members' crafting orders, with lines for reference items only. The shared order of
     * older cities (`order`) becomes the leader's draft.
     */
    function cityOrders(city: Row): Record<string, CityOrder> {
      const list = members.get(city.id) ?? [];
      const known = (line: Json) => reference.items.some(item => item.id === line.itemId);
      const stored = { ...(city.orders ?? {}) } as Record<string, Json>;
      if (Array.isArray(city.order) && city.order.length && list[0] && !stored[list[0]]) stored[list[0]] = { items: city.order };
      const orders: Record<string, CityOrder> = {};
      for (const email of list) {
        const order = stored[email];
        if (!order) continue;
        const items = ((order.items ?? []) as Json[]).filter(known).map(line => ({ itemId: line.itemId, quantity: line.quantity }));
        const research = ((order.research ?? []) as Json[]).filter(known).map(line => ({ itemId: line.itemId, steps: line.steps }));
        if (items.length || research.length) orders[email] = { items, research, submitted: !!order.submitted };
      }
      return orders;
    }

    function hydrate(name: string, record: Row) {
      if (name === 'pokemon') return pokemon(record);
      if (name === 'trainers') return trainer(record);
      if (name === 'cities') {
        const tags = (record.tags ?? []) as string[];
        const rank = (RANKS as readonly unknown[]).includes(record.rank) ? record.rank : 'UNRANKED';
        const stored = (record.assignments ?? {}) as Json;
        const residents = db.pokemon.filter(p => p.cityId === record.id);
        const work = Object.fromEntries(residents.map(p => [p.id, residentWork(p)]));
        const assignments = Object.fromEntries(residents.filter(p => canAssign(stored[p.id], tags, work[p.id].profile)).map(p => [p.id, stored[p.id]]));
        const bonuses = Object.fromEntries(residents.map(p => [p.id, work[p.id].bonus]));
        const profiles = Object.fromEntries(residents.map(p => [p.id, work[p.id].profile]));
        const { skills: _skills, tagValues: _tagValues, catalysts: _catalysts, order: _order, ...rest } = record;
        return { ...rest, rank, limits: cityLimits(rank), tags, assignments, bonuses, profiles,
          ...cityValues(rank, tags, assignments, work), inventory: inventory(record.inventory, true), research: record.research ?? {},
          orders: cityOrders(record),
          recipes: Object.fromEntries(Object.entries((record.recipes ?? {}) as Json).filter(([itemId]) => reference.items.some(item => item.id === itemId))),
          members: members.get(record.id) ?? [] };
      }
      return referenceRecord(name, record);
    }

    // Other accounts' custom entries are readable only through a Pokemon that already uses
    // them, so a sheet may only point at entries this person can see.
    function checkPokemonReferences(body: Json) {
      for (const [key, collection, label] of [['abilityId', 'abilities', 'ability'], ['natureId', 'natures', 'nature'], ['heldItemId', 'items', 'held item']]) {
        if (body[key] != null && !lookup(collection, body[key])) fail(400, `Choose a valid ${label}.`);
      }
      if ('moveIds' in body && (!Array.isArray(body.moveIds) || body.moveIds.some((id: unknown) => !lookup('moves', id)))) fail(400, 'Choose valid moves.');
      if ('shiny' in body && typeof body.shiny !== 'boolean') fail(400, 'Shiny must be true or false.');
    }

    function newPokemon(body: Json): Row {
      const species = lookup('pokemon-templates', body.pokemonTemplateId);
      if (!species) fail(400, 'Choose a valid Pokemon template.');
      if (body.rank !== undefined && !(RANKS as readonly unknown[]).includes(body.rank)) fail(400, 'Choose a valid rank.');
      const stats = { ...blankStats(), ...body.stats };
      return { id: crypto.randomUUID(), userId: owner, rank: 'UNRANKED', gender: 'N',
        noOfBattles: 0, trainingPoints: 0, moveIds: [], abilityId: species.abilityOne?.id ?? species.abilityOneId,
        natureId: null, heldItemId: null, trainerId: null, cityId: null, shiny: false,
        ...body, ...nicknameFields(body), stats,
        currentHp: body.currentHp ?? species.baseHp + species.baseStats.vitality + stats.vitality,
        currentWill: body.currentWill ?? 3 + species.baseStats.insight + stats.insight,
      };
    }

    function nicknameFields(body: Json): Json {
      if (!('nickname' in body)) return {};
      if (typeof body.nickname !== 'string') fail(400, 'Pokemon nickname must be text.');
      return { nickname: body.nickname.trim() };
    }

    /** A resident's bonus, the work profile of its species and its types; see shared/cities.ts. */
    function residentWork(p: Row): ResidentWork {
      const species = lookup('pokemon-templates', p.pokemonTemplateId) as PokemonTemplate | null;
      if (!species) return { bonus: 0, profile: {}, types: [] };
      return {
        bonus: residentBonus(species, id => lookup('pokemon-templates', id) as PokemonTemplate | null),
        profile: speciesWorkProfile(species, reference['pokemon-templates']),
        types: species.types,
      };
    }

    function customInventoryFields(item: Json): Json {
      return {
        name: item.name, source: item.source, category: item.category, pocket: item.pocket,
        description: item.description, oneUse: item.oneUse, PMD: item.PMD, trainerPrice: item.trainerPrice,
        pmdPrice: item.pmdPrice, image: item.image,
      };
    }

    /** Only reference IDs are shared across accounts; custom items move as self-contained copies. */
    function addToInventory(entries: Row[], entry: Json, quantity: number, fromCity = false) {
      if (entry.itemSnapshot) entry = customInventoryFields(entry.itemSnapshot);
      else if (entry.itemId) {
        const item = inventoryItem(entry.itemId, fromCity);
        if (!item) fail(400, 'That inventory item is no longer available.');
        if (!referenceRows.items.includes(item)) entry = customInventoryFields(item);
      }
      const same = entry.itemId ? entries.find(candidate => candidate.itemId === entry.itemId && !candidate.itemSnapshot) : undefined;
      if (same) {
        same.quantity += quantity;
        return;
      }
      const { id: _id, item: _item, quantity: _quantity, ...fields } = entry;
      entries.push({ ...fields, id: crypto.randomUUID(), quantity });
    }

    function residentLimit(rank: unknown) {
      return cityLimits((RANKS as readonly unknown[]).includes(rank) ? rank as Rank : 'UNRANKED').residents;
    }

    // Skill and action values are derived from assigned residents (hydrate), so stored
    // `skills` and `tagValues` from older records and clients are ignored.
    function cityFields(body: Json, city: Row | null = null): Json {
      const fields: Json = {};
      if ('name' in body) {
        if (typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 100) fail(400, 'City name must be 1 to 100 characters.');
        fields.name = body.name.trim();
      }
      if ('rank' in body) {
        if (!(RANKS as readonly unknown[]).includes(body.rank)) fail(400, 'Choose a valid city rank.');
        // Only enforce the cap when the rank actually changes, so cities that predate the cap still save.
        const currentRank = city && (RANKS as readonly unknown[]).includes(city.rank) ? city.rank : 'UNRANKED';
        const residents = city && body.rank !== currentRank ? db.pokemon.filter(p => p.cityId === city.id).length : 0;
        if (residents > residentLimit(body.rank)) fail(409, `This city has ${residents} residents; that rank allows ${residentLimit(body.rank)}. Move some residents out first.`);
        fields.rank = body.rank;
      }
      if ('tags' in body) {
        if (!Array.isArray(body.tags) || body.tags.length > 50 || body.tags.some((tag: unknown) => typeof tag !== 'string' || !tag.trim() || tag.trim().length > 80)) fail(400, 'Use up to 50 action tags, each 1 to 80 characters.');
        fields.tags = [...new Set(body.tags.map((tag: string) => tag.trim()))];
      }
      const tags = (fields.tags ?? city?.tags ?? []) as string[];
      const assignments: Json = { ...city?.assignments };
      if ('assignments' in body) {
        if (!body.assignments || typeof body.assignments !== 'object' || Array.isArray(body.assignments)) fail(400, 'City assignments must be an object.');
        for (const [id, target] of Object.entries(body.assignments as Json)) {
          const resident = city && db.pokemon.find(p => p.id === id && p.cityId === city.id);
          if (!resident) fail(400, 'Only residents of this city can be assigned to its skills and actions.');
          if (target !== null) {
            const { profile } = residentWork(resident);
            const skill = typeof target === 'string' && target.startsWith('skill:') ? target.slice(6) : null;
            if (skill && isCitySkill(skill) && !canWork(profile, skill)) {
              const species = lookup('pokemon-templates', resident.pokemonTemplateId);
              fail(400, `${resident.nickname || species?.name || 'This Pokémon'} cannot work ${skill[0].toUpperCase()}${skill.slice(1)}.`);
            }
            if (!canAssign(target, tags, profile)) fail(400, 'Choose a city skill or one of the city\'s actions.');
          }
          if (target === null) delete assignments[id];
          else assignments[id] = target;
        }
      }
      if ('assignments' in body || 'tags' in body) {
        fields.assignments = Object.fromEntries(Object.entries(assignments).filter(([id, target]) => {
          const resident = db.pokemon.find(p => p.id === id);
          return canAssign(target, tags, resident ? residentWork(resident).profile : {});
        }));
      }
      return fields;
    }

    function assignment(body: Json): Json {
      const update: Json = {};
      for (const [key, collection] of [['cityId', 'cities'], ['trainerId', 'trainers']]) {
        if (!(key in body)) continue;
        const value = body[key];
        if (value !== null && (typeof value !== 'string' || !db[collection].some(record => record.id === value))) fail(400, `Choose a valid ${collection === 'cities' ? 'city' : 'trainer'}.`);
        update[key] = value;
      }
      if (update.cityId && update.trainerId) fail(400, 'A Pokemon cannot belong to both a city and a trainer.');
      if (update.cityId) update.trainerId = null;
      if (update.trainerId) update.cityId = null;
      return update;
    }

    function checkCapacity(cityId: string) {
      const city = db.cities.find(record => record.id === cityId)!;
      const limit = residentLimit(city.rank);
      if (db.pokemon.filter(p => p.cityId === cityId).length >= limit) fail(409, `${city.name} is full: its rank allows ${limit} residents. Raise the city rank or move a resident out first.`);
    }

    /** Clears the skill or action a resident worked on before it leaves its city. */
    function leaveCity(p: Row) {
      const city = p.cityId ? db.cities.find(record => record.id === p.cityId) : null;
      if (!city?.assignments?.[p.id]) return;
      const { [p.id]: _removed, ...rest } = city.assignments;
      city.assignments = rest;
      put('cities', city);
    }

    function generate(name: string, body: Json, isEncounter = false) {
      if (name === 'pokemon' && 'habitats' in body &&
          (!Array.isArray(body.habitats) || !body.habitats.every(isHabitatFilter))) {
        fail(400, 'Choose valid habitat categories or specific habitats.');
      }
      const random = randomSource(body.seed ?? Date.now());
      const choose = <T>(list: T[]) => list[Math.floor(random() * list.length)];
      const count = Number(body.numberToGenerate ?? 1);
      const maximum = isEncounter ? 12 : 100;
      if (!Number.isInteger(count) || count < 1 || count > maximum) fail(400, `Generate between 1 and ${maximum} at a time.`);
      let candidates = selected(name === 'pokemon' ? 'pokemon-templates' : 'items', body);
      const ranks: readonly string[] = RANKS;
      if (name === 'items') {
        candidates = candidates.filter(item => (!body.categories?.length || body.categories.includes(item.category)) &&
          (!body.pockets?.length || body.pockets.includes(item.pocket)));
      } else if (isEncounter) {
        candidates = candidates.filter(entry => matchesEncounterFilters(entry as PokemonTemplate, body as GenerateEncounterBody));
      } else {
        if (!ranks.includes(body.rank)) fail(400, 'Choose a valid rank.');
        candidates = candidates.filter(p => body.pokemonTemplateId ? p.id === body.pokemonTemplateId :
          matchesHabitats(p.habitats, body.habitats) &&
          (body.includeLegendary === 'ALL' || (body.includeLegendary === 'ONLY' ? p.legendary : !p.legendary)) &&
          (body.rankOrBelow ? ranks.indexOf(p.recommendedRank) <= ranks.indexOf(body.rank) : p.recommendedRank === body.rank));
      }
      if (!candidates.length) {
        if (isEncounter) return [];
        fail(400, 'No entries match these filters.');
      }
      const resultCount = isEncounter && body.allowDuplicates === false ? Math.min(count, candidates.length) : count;
      return Array.from({ length: resultCount }, () => {
        const entry = isEncounter && body.allowDuplicates === false
          ? candidates.splice(Math.floor(random() * candidates.length), 1)[0]
          : choose(candidates);
        if (name === 'items') return entry;
        const generatedRank = isEncounter ? entry.recommendedRank : body.rank;
        const stats = blankStats();
        const allocate = (keys: readonly (keyof Stats)[], points: number, limit: (key: keyof Stats) => number) => {
          for (let n = 0; n < points; n++) {
            let available = keys.filter(key => stats[key] < limit(key));
            if (!available.length) break;
            if ((body.rankUpMethod ?? (isEncounter ? 'RANDOM' : undefined)) !== 'RANDOM' && keys === ATTRIBUTES) {
              available.sort((a, b) => entry.baseStats[b] - entry.baseStats[a]);
              if (body.rankUpMethod === 'MIN_MAX') available = available.slice(0, 1);
              else available = available.slice(0, 2);
            }
            stats[choose(available)]++;
          }
        };
        for (const rank of RANKS.slice(1, ranks.indexOf(generatedRank) + 1)) {
          const budget = reference.rankAttributes[rank];
          if (!budget?.rank) continue;
          allocate(ATTRIBUTES, budget.attributePoints, key => entry.maxStats[key] - entry.baseStats[key]);
          allocate(SOCIALS, budget.socialPoints, () => 4);
          allocate(SKILLS, budget.skillPoints, () => budget.skillLimit);
        }
        const moveRank = isEncounter && generatedRank === 'UNRANKED' ? 'STARTER' : generatedRank;
        const availableMoves: string[] = [...new Set<string>(entry.possibleMoves.filter((move: Row) =>
          (!isEncounter || ranks.includes(move.rank)) && ranks.indexOf(move.rank) <= ranks.indexOf(moveRank)).map((move: Row) => move.move.id))];
        const moveIds: string[] = [];
        while (availableMoves.length && moveIds.length < 6) {
          moveIds.push(availableMoves.splice(Math.floor(random() * availableMoves.length), 1)[0]);
        }
        const abilities = [entry.abilityOne, entry.abilityTwo].filter(Boolean);
        return pokemon(newPokemon({ pokemonTemplateId: entry.id, rank: generatedRank, stats, moveIds,
          abilityId: choose(abilities)?.id, natureId: choose(reference.natures).id,
          gender: ['M', 'F', 'N'].includes(entry.genderType) ? entry.genderType : choose(['M', 'F']),
        }));
      });
    }

    if (method === 'POST' && action === 'generate' && ['pokemon', 'items'].includes(name)) return reply(generate(name, body));
    if (method === 'POST' && name === 'pokemon' && action === 'encounter') return reply(generate(name, body, true));
    if (referenceNames.includes(name)) {
      if (method === 'POST' && ['filtered', 'campaigns', 'all'].includes(action!)) {
        const result = selected(name, action === 'all' ? { ...body, campaignIds: [id] } : body);
        // Lists do not need the large nested moves; detail endpoints retain them.
        return reply(name === 'pokemon-templates' && action !== 'all' ? result.map(({ possibleMoves, ...record }) => record) : result);
      }
      // Compact lists for the catalog filters: names for pickers, and the templates that learn a move.
      if (method === 'POST' && action === 'names') {
        return reply(selected(name, body).map(record => ({ id: record.id, name: record.name, campaignName: record.campaign?.name ?? null })));
      }
      if (method === 'POST' && name === 'pokemon-templates' && action === 'learns') {
        return reply(selected(name, body).filter(record => record.possibleMoves.some((move: Row) => move.move.id === id)).map(record => record.id));
      }
      if (method === 'GET' && action === 'find-many') {
        return reply((id ?? '').split(',').map(value => template(find(name, value))).filter(Boolean));
      }
    }
    // Core Pokémon get a shared override, removed again once it matches the reference data;
    // your own campaign Pokémon are changed directly.
    if (name === 'pokemon-templates' && action && id === 'habitats' && method === 'PUT') {
      if (!Array.isArray(body.habitats) || !body.habitats.every(isHabitat)) fail(400, 'Choose valid specific habitats.');
      const habitats = normalizeHabitats(body.habitats);
      const core = referenceRows['pokemon-templates'].find(record => record.id === action);
      if (core) {
        if (habitats.join() === normalizeHabitats(core.habitats ?? []).join()) {
          habitatOverrides.delete(core.id);
          writes.push(env.DB.prepare('DELETE FROM records WHERE owner = ? AND collection = ? AND id = ?').bind(GLOBAL_OWNER, HABITAT_OVERRIDES, core.id));
        } else {
          habitatOverrides.set(core.id, habitats);
          writes.push(upsert(GLOBAL_OWNER, HABITAT_OVERRIDES, { id: core.id, habitats }));
        }
        return reply(template(core));
      }
      const own = db[name].find(record => record.id === action);
      if (!own) fail(404, 'Only core Pokémon and your own campaign Pokémon can have their habitats changed.');
      own.habitats = habitats;
      put(name, own);
      return reply(template(own));
    }
    if (name === 'cities' && action && id === 'members' && method === 'POST') {
      const city = find('cities', action);
      if (!city) fail(404, 'City not found.');
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Enter a valid email address.');
      const current = members.get(city.id) ?? [];
      if (current.includes(email)) fail(409, `${email} is already a member of this city.`);
      writes.push(env.DB.prepare('INSERT INTO city_members (city_id, email) VALUES (?, ?)').bind(city.id, email));
      members.set(city.id, [...current, email]);
      return reply(hydrate(name, city), 201);
    }
    // The longest-standing member (the creator, unless they left) leads the city and can remove others.
    if (name === 'cities' && action && id === 'members' && member && method === 'DELETE') {
      const city = find('cities', action);
      if (!city) fail(404, 'City not found.');
      const current = members.get(city.id) ?? [];
      if (current[0] !== owner) fail(403, 'Only the city leader can remove members.');
      if (member === owner) fail(400, 'Leave the city instead of removing yourself.');
      if (!current.includes(member)) fail(404, `${member} is not a member of this city.`);
      writes.push(env.DB.prepare('DELETE FROM city_members WHERE city_id = ? AND email = ?').bind(city.id, member));
      members.set(city.id, current.filter(email => email !== member));
      if (city.orders?.[member]) {
        const { [member]: _removed, ...orders } = city.orders;
        city.orders = orders;
        put(name, city);
      }
      return reply(hydrate(name, city));
    }
    // Crafting (docs/crafting-plan.md). Each member fills their own crafting order within the city's
    // skills and submits it; the leader edits, approves (crafts it into storage and adds its research
    // steps) or sends it back. The leader also rolls research, whose dice may come from a physical roll.
    // Recipes include the city's own edits (`recipes`), unless `base` asks for the default.
    function referenceRecipe(itemId: unknown, city: Row, base = false): { item: Row; recipe: Recipe } | null {
      const item = typeof itemId === 'string' ? reference.items.find(entry => entry.id === itemId) : undefined;
      if (!item) return null;
      const recipe = itemRecipe(item, ITEM_EXCEPTIONS[item.name]);
      return { item, recipe: base ? recipe : cityRecipe(recipe, city.recipes?.[item.id]) };
    }
    function orderLines(city: Row, order: CityOrder) {
      return order.items.flatMap(line => {
        const found = referenceRecipe(line.itemId, city);
        return found ? [{ ...found, quantity: line.quantity }] : [];
      });
    }
    function researchLines(city: Row, order: CityOrder) {
      return order.research.flatMap(line => {
        const found = referenceRecipe(line.itemId, city);
        return found ? [{ ...found, steps: line.steps }] : [];
      });
    }
    /** Stores the members' orders, dropping empty ones and the shared order of older cities. */
    function saveOrders(city: Row, orders: Record<string, CityOrder>) {
      city.orders = Object.fromEntries(Object.entries(orders).filter(([, order]) => order.items.length || order.research.length));
      delete city.order;
      put('cities', city);
    }
    /** The order a request changes: your own, or as the leader a member's submitted one. */
    function changeableOrder(city: Row, orders: Record<string, CityOrder>, requested: unknown) {
      const member = requested ?? owner;
      if (typeof member !== 'string' || !(members.get(city.id) ?? []).includes(member)) fail(400, 'Choose a member of this city.');
      const order: CityOrder = orders[member] ?? { items: [], research: [], submitted: false };
      if (member !== owner) {
        if (!isLeader(city)) fail(403, 'Only the city leader can change another member\'s order.');
        if (!order.submitted) fail(409, `${member} has not submitted their order yet.`);
      } else if (order.submitted && !isLeader(city)) fail(409, 'Your order is waiting for the leader. Withdraw it to change it.');
      return { member, order };
    }
    const craftingState = (current: City) => ({ rank: current.rank, skills: current.skills, catalysts: current.catalysts, research: current.research });
    const isLeader = (city: Row) => (members.get(city.id) ?? [])[0] === owner;
    const capitalized = (skill: string) => `${skill[0].toUpperCase()}${skill.slice(1)}`;

    if (name === 'cities' && action && id === 'order' && method === 'POST') {
      const city = find('cities', action);
      if (!city) fail(404, 'City not found.');
      const found = referenceRecipe(body.itemId, city);
      if (!found) fail(400, 'Choose a reference item.');
      const research = 'steps' in body;
      const value = research ? body.steps : body.quantity;
      if (!Number.isInteger(value) || value < 0 || value > 999) fail(400, research ? 'Choose from 0 to 999 research steps.' : 'Choose a quantity from 0 to 999.');
      const orders = cityOrders(city);
      const { member, order } = changeableOrder(city, orders, body.member);
      const { item, recipe } = found;
      const current = hydrate(name, city) as City;
      if (research) {
        const before = order.research.find(line => line.itemId === item.id)?.steps ?? 0;
        // Lowering is always allowed. Steps past what the recipe still needs are allowed too, and lost on approval.
        if (value > before) {
          const blockers = researchBlockers(recipe, craftingState(current));
          if (blockers.length) fail(409, `${item.name}: ${blockers.join(' ')}`);
          const used = orderSteps(order.research.filter(line => line.itemId !== item.id));
          if (used + value > current.skills.research) {
            fail(409, `${item.name}: the order can hold ${Math.max(0, current.skills.research - used)} research steps with Research ${current.skills.research}.`);
          }
        }
        order.research = order.research.some(line => line.itemId === item.id)
          ? order.research.map(line => line.itemId === item.id ? { ...line, steps: value } : line)
          : [...order.research, { itemId: item.id, steps: value }];
        order.research = order.research.filter(line => line.steps > 0);
      } else {
        const lines = orderLines(city, order);
        const before = lines.find(line => line.item.id === item.id)?.quantity ?? 0;
        // Lowering a line is always allowed, so an order that no longer fits can be trimmed.
        if (value > before) {
          const blockers = craftBlockers(recipe, craftingState(current));
          if (blockers.length) fail(409, `${item.name}: ${blockers.join(' ')}`);
          const used = orderUsage(lines.filter(line => line.item.id !== item.id));
          const short = CRAFTING_SKILLS.find(skill => used[skill] + orderCost(recipe, skill) * value > current.skills[skill]);
          if (short) {
            const fits = orderRoom(recipe, current.skills, used);
            fail(409, `${item.name}: the order can hold ${fits} with ${capitalized(short)} ${current.skills[short]} (each uses ${orderCost(recipe, short)}).`);
          }
        }
        order.items = order.items.some(line => line.itemId === item.id)
          ? order.items.map(line => line.itemId === item.id ? { ...line, quantity: value } : line)
          : [...order.items, { itemId: item.id, quantity: value }];
        order.items = order.items.filter(line => line.quantity > 0);
      }
      orders[member] = order;
      saveOrders(city, orders);
      return reply(hydrate(name, city));
    }
    if (name === 'cities' && action && id === 'submit' && method === 'POST') {
      const city = find('cities', action);
      if (!city) fail(404, 'City not found.');
      if (typeof body.submitted !== 'boolean') fail(400, 'Choose to submit or withdraw your order.');
      const orders = cityOrders(city);
      const order = orders[owner];
      if (!order) fail(409, 'The crafting order is empty.');
      order.submitted = body.submitted;
      saveOrders(city, orders);
      return reply(hydrate(name, city));
    }
    // Sending an order back returns it to its member as a draft to change.
    if (name === 'cities' && action && id === 'reject' && method === 'POST') {
      const city = find('cities', action);
      if (!city) fail(404, 'City not found.');
      if (!isLeader(city)) fail(403, 'Only the city leader can send orders back.');
      const orders = cityOrders(city);
      const order = typeof body.member === 'string' ? orders[body.member] : undefined;
      if (!order?.submitted) fail(409, 'That order is not waiting for approval.');
      order.submitted = false;
      saveOrders(city, orders);
      return reply(hydrate(name, city));
    }
    // Approving adds the order's research steps first (capped at what each recipe needs; the rest is
    // lost), then crafts its items into storage. The leader approves their own order without submitting it.
    if (name === 'cities' && action && id === 'approve' && method === 'POST') {
      const city = find('cities', action);
      if (!city) fail(404, 'City not found.');
      if (!isLeader(city)) fail(403, 'Only the city leader can approve orders.');
      const member = body.member ?? owner;
      if (typeof member !== 'string' || !(members.get(city.id) ?? []).includes(member)) fail(400, 'Choose a member of this city.');
      const orders = cityOrders(city);
      const order = orders[member];
      if (!order) fail(409, 'The crafting order is empty.');
      if (member !== owner && !order.submitted) fail(409, `${member} has not submitted their order yet.`);
      const current = hydrate(name, city) as City;
      const state = craftingState(current);

      const steps = researchLines(city, order);
      const requested = orderSteps(steps);
      if (requested > current.skills.research) fail(409, `The order asks for ${requested} research steps; Research is ${current.skills.research}.`);
      const research: Record<string, number> = { ...current.research };
      const researched: CityResearched[] = [];
      for (const { item, recipe, steps: count } of steps) {
        const needed = TIERS[recipe.tier].research?.steps ?? 0;
        const before = research[item.id] ?? 0;
        if (!isUnlocked(recipe, research)) {
          const blockers = researchBlockers(recipe, { ...state, research });
          if (blockers.length) fail(409, `${item.name}: ${blockers.join(' ')}`);
          research[item.id] = Math.min(needed, before + count);
        }
        const total = research[item.id] ?? 0;
        researched.push({ itemId: item.id, steps: count, added: total - before, total, needed, unlocked: isUnlocked(recipe, research) });
      }

      const lines = orderLines(city, order);
      for (const { item, recipe } of lines) {
        const blockers = craftBlockers(recipe, { ...state, research });
        if (blockers.length) fail(409, `${item.name}: ${blockers.join(' ')}`);
      }
      const usage = orderUsage(lines);
      const over = overCapacity(current.skills, usage);
      if (over.length) fail(409, `The order needs more than the city has: ${over.map(skill => `${capitalized(skill)} ${usage[skill]} of ${current.skills[skill]}`).join(', ')}.`);

      city.research = research;
      city.inventory ??= [];
      // Order lines count crafts; each craft makes the recipe's yield.
      const crafted = lines.map(({ item, recipe, quantity }) => ({ itemId: item.id, quantity: quantity * recipe.yield }));
      for (const { itemId, quantity } of crafted) addToInventory(city.inventory, { itemId }, quantity);
      delete orders[member];
      saveOrders(city, orders);
      return reply({ city: hydrate(name, city), member, crafted, researched });
    }
    // The leader edits a recipe for the city: its tier, the skills one craft uses and how many items it makes.
    if (name === 'cities' && action && id === 'recipe' && method === 'POST') {
      const city = find('cities', action);
      if (!city) fail(404, 'City not found.');
      if (!isLeader(city)) fail(403, 'Only the city leader can edit recipes.');
      const found = referenceRecipe(body.itemId, city, true);
      if (!found) fail(400, 'Choose a reference item.');
      const { item, recipe } = found;
      if (!('recipe' in body)) fail(400, 'Send the recipe changes or null.');
      const checked = checkCityRecipe(recipe, body.recipe);
      if ('error' in checked) fail(recipe.craftable ? 400 : 409, `${item.name}: ${checked.error}`);
      const { [item.id]: _previous, ...rest } = (city.recipes ?? {}) as Json;
      city.recipes = checked.recipe ? { ...rest, [item.id]: checked.recipe } : rest;
      put(name, city);
      return reply(hydrate(name, city));
    }
    if (name === 'cities' && action && id === 'research' && method === 'POST') {
      const city = find('cities', action);
      if (!city) fail(404, 'City not found.');
      if (!isLeader(city)) fail(403, 'Only the city leader can research.');
      const found = referenceRecipe(body.itemId, city);
      if (!found) fail(400, 'Choose a reference item.');
      const { item, recipe } = found;
      const current = hydrate(name, city) as City;
      const blockers = researchBlockers(recipe, craftingState(current));
      if (blockers.length) fail(409, `${item.name}: ${blockers.join(' ')}`);
      const pool = current.skills.research;
      const problem = body.faces === undefined ? null : checkFaces(body.faces, pool);
      if (problem) fail(400, problem);
      const faces: number[] = body.faces ?? rollDice(pool, () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32);
      const successes = countSuccesses(faces);
      const needed = TIERS[recipe.tier].research!.steps;
      const steps = Math.min(needed, (city.research?.[item.id] ?? 0) + successes);
      if (successes) {
        city.research = { ...city.research, [item.id]: steps };
        put(name, city);
      }
      return reply({ city: hydrate(name, city), roll: { itemId: item.id, pool, faces, successes, steps, needed, unlocked: steps >= needed } });
    }
    // GM override: the leader sets a recipe's research steps directly, whatever the city's rank or Research.
    if (name === 'cities' && action && id === 'steps' && method === 'POST') {
      const city = find('cities', action);
      if (!city) fail(404, 'City not found.');
      if (!isLeader(city)) fail(403, 'Only the city leader can set research steps.');
      const found = referenceRecipe(body.itemId, city);
      if (!found) fail(400, 'Choose a reference item.');
      const { item, recipe } = found;
      if (!recipe.craftable) fail(409, `${item.name}: ${recipe.note ? `${recipe.note}: not craftable.` : 'This item cannot be crafted.'}`);
      const needed = TIERS[recipe.tier].research?.steps;
      if (!needed) fail(409, `${item.name}: This recipe needs no research.`);
      if (!Number.isInteger(body.steps) || body.steps < 0 || body.steps > needed) fail(400, `Choose from 0 to ${needed} steps.`);
      const { [item.id]: _previous, ...rest } = city.research ?? {};
      city.research = body.steps ? { ...rest, [item.id]: body.steps } : rest;
      put(name, city);
      return reply(hydrate(name, city));
    }
    // The leader can add or remove stored items directly, e.g. to adjust the city's stock as GM.
    if (name === 'cities' && action && id === 'stock' && method === 'POST') {
      const city = find('cities', action);
      if (!city) fail(404, 'City not found.');
      if (!isLeader(city)) fail(403, 'Only the city leader can add items to storage.');
      const item = find('items', body.itemId);
      if (!item) fail(400, 'Choose an item from your collection.');
      if (!Number.isInteger(body.quantity) || body.quantity < 1 || body.quantity > 999) fail(400, 'Choose a quantity from 1 to 999.');
      city.inventory ??= [];
      addToInventory(city.inventory, { itemId: item.id }, body.quantity);
      put(name, city);
      return reply(hydrate(name, city));
    }
    if (name === 'cities' && action && id === 'discard' && method === 'POST') {
      const city = find('cities', action);
      if (!city) fail(404, 'City not found.');
      if (!isLeader(city)) fail(403, 'Only the city leader can remove items from storage.');
      if (!Number.isInteger(body.quantity) || body.quantity < 1) fail(400, 'Choose how many to remove.');
      const entry = (city.inventory ?? []).find((candidate: Row) => candidate.id === body.entryId);
      if (!entry) fail(404, 'That item is not in the city storage.');
      if (entry.quantity < body.quantity) fail(409, `Only ${entry.quantity} available.`);
      entry.quantity -= body.quantity;
      if (!entry.quantity) city.inventory = city.inventory.filter((candidate: Row) => candidate !== entry);
      put(name, city);
      return reply(hydrate(name, city));
    }
    // Any member can move items between one of their trainers and the city.
    if (name === 'cities' && action && id === 'inventory' && method === 'POST') {
      const city = find('cities', action);
      if (!city) fail(404, 'City not found.');
      const trainerRecord = db.trainers.find(record => record.id === body.trainerId);
      if (!trainerRecord) fail(400, 'Choose one of your trainers.');
      if (body.direction !== 'deposit' && body.direction !== 'withdraw') fail(400, 'Choose to deposit or withdraw.');
      if (!Number.isInteger(body.quantity) || body.quantity < 1) fail(400, 'Choose how many to move.');
      const [from, to] = body.direction === 'deposit' ? [trainerRecord, city] : [city, trainerRecord];
      const entry = (from.inventory ?? []).find((candidate: Row) => candidate.id === body.entryId);
      if (!entry) fail(404, body.direction === 'deposit' ? 'That item is not in the trainer\'s inventory.' : 'That item is not in the city storage.');
      if (entry.quantity < body.quantity) fail(409, `Only ${entry.quantity} available.`);
      entry.quantity -= body.quantity;
      if (!entry.quantity) from.inventory = from.inventory.filter((candidate: Row) => candidate !== entry);
      to.inventory ??= [];
      addToInventory(to.inventory, entry, body.quantity, from === city);
      put('cities', city);
      put('trainers', trainerRecord);
      return reply({ city: hydrate(name, city), trainer: hydrate('trainers', trainerRecord) });
    }
    if (method === 'GET') {
      if (name === 'pokemon' && action === 'all') return reply(db.pokemon.map(pokemon));
      if (!action || action === 'minimal') {
        const records = referenceNames.includes(name) ? [...referenceRows[name], ...db[name]] :
          name === 'pokemon' ? db.pokemon.filter(record => !record.cityId) : db[name];
        if (name === 'pokemon' && action === 'minimal') return reply(records.map(record => {
          const species = lookup('pokemon-templates', record.pokemonTemplateId)!;
          return { id: record.id, name: record.nickname || species.name, number: species.number, dexID: species.dexID,
            image: species.image, types: species.types, rank: record.rank, shiny: record.shiny === true };
        }));
        return reply(records.map(record => hydrate(name, record)));
      }
      const record = find(name, action);
      if (!record) fail(404, 'Record not found.');
      return reply(hydrate(name, record));
    }
    if (method === 'POST' && !action) {
      let record: Row = { ...body, id: body.id ?? body._id ?? crypto.randomUUID(), userId: owner };
      if (name === 'pokemon-templates' && 'habitats' in body) {
        if (!Array.isArray(body.habitats) || !body.habitats.every(isHabitat)) fail(400, 'Choose valid specific habitats.');
        record.habitats = normalizeHabitats(body.habitats);
      }
      if (name === 'pokemon') {
        checkPokemonReferences(body);
        const destination = assignment(body);
        if (destination.cityId) checkCapacity(destination.cityId);
        record = newPokemon({ ...record, ...destination });
      }
      if (name === 'cities') {
        const fields = cityFields(body);
        if (!fields.name) fail(400, 'Choose a city name.');
        record = { id: crypto.randomUUID(), userId: owner, rank: 'UNRANKED', tags: [], assignments: {}, inventory: [], research: {}, orders: {}, ...fields };
        writes.push(env.DB.prepare('INSERT INTO city_members (city_id, email) VALUES (?, ?)').bind(record.id, owner));
        members.set(record.id, [owner]);
      }
      if (name === 'trainers') record = { rank: 'UNRANKED', name: '', age: 0, gender: 'N', money: 0,
        natureId: null, inventory: [], ...record, stats: { ...blankStats(), ...body.stats }, currentHp: 5, currentWill: 4 };
      if (name === 'campaigns') record = { allowedUserIds: [], ...record, isCore: false };
      if (name === 'feedback') record.createdAt = new Date().toISOString();
      if (name === 'moves') record.category = body.category ?? body.Category;
      if (name === 'items') record.pmdPrice = body.pmdPrice ?? body.PMDPrice;
      if (referenceNames.includes(name) && !find('campaigns', body.campaignId)) fail(400, 'Choose a local campaign.');
      if (find(name, record.id)) fail(409, 'A record with that ID already exists.');
      db[name].push(record);
      put(name, record);
      return reply(hydrate(name, record), 201);
    }
    if ((method === 'PATCH' || method === 'PUT') && (!action || find(name, action))) {
      const record = db[name].find(record => record.id === (action ?? body.id ?? body._id));
      if (!record) fail(404, 'Local record not found. Reference data is read-only; create a custom entry in a campaign.');
      if (name === 'pokemon' && body.pokemonTemplateId && !lookup('pokemon-templates', body.pokemonTemplateId)) fail(400, 'Pokemon template not found.');
      if (name === 'pokemon' && body.rank !== undefined && !(RANKS as readonly unknown[]).includes(body.rank)) fail(400, 'Choose a valid rank.');
      if (name === 'pokemon') checkPokemonReferences(body);
      const update = { ...body };
      if (name === 'pokemon-templates' && 'habitats' in body) {
        if (!Array.isArray(body.habitats) || !body.habitats.every(isHabitat)) fail(400, 'Choose valid specific habitats.');
        update.habitats = normalizeHabitats(body.habitats);
      }
      delete update.id; delete update.userId;
      if (name === 'cities') {
        Object.assign(record, cityFields(body, record));
        delete record.skills;
        delete record.tagValues;
        put(name, record);
        return reply(hydrate(name, record));
      }
      if (name === 'pokemon') {
        const destination = assignment(body);
        if ('takeOwnership' in body && typeof body.takeOwnership !== 'boolean') fail(400, 'Take ownership must be a boolean.');
        if (body.takeOwnership === true) {
          if (destination.cityId || destination.trainerId) fail(400, 'Choose either My Pokemon, a trainer, or a city.');
          destination.cityId = null;
          destination.trainerId = null;
        }
        if (record.cityId && destination.cityId === null && !destination.trainerId && body.takeOwnership !== true) {
          fail(400, 'Move this resident to another city, a trainer, or explicitly take it into My Pokemon.');
        }
        if (destination.cityId && destination.cityId !== record.cityId) checkCapacity(destination.cityId);
        if ('cityId' in destination && destination.cityId !== record.cityId) leaveCity(record);
        Object.assign(update, destination);
        delete update.takeOwnership;
      }
      if (name === 'pokemon') Object.assign(update, nicknameFields(body));
      if (name === 'trainers') {
        if ('pokemonIds' in body) {
          if (!Array.isArray(body.pokemonIds) || body.pokemonIds.some((id: unknown) => typeof id !== 'string' || !db.pokemon.some(p => p.id === id))) fail(400, 'Choose valid Pokemon for this trainer.');
          for (const p of db.pokemon) {
            const trainerId = body.pokemonIds.includes(p.id) ? record.id : p.trainerId === record.id ? null : p.trainerId;
            if (trainerId !== p.trainerId || (trainerId === record.id && p.cityId)) {
              p.trainerId = trainerId;
              if (trainerId === record.id && p.cityId) {
                leaveCity(p);
                p.cityId = null;
              }
              put('pokemon', p);
            }
          }
          delete update.pokemonIds;
        }
        if (body.inventory) update.inventory = body.inventory.map((entry: Row) => ({ ...entry, id: entry.id || crypto.randomUUID() }));
      }
      if (name === 'campaigns') update.isCore = false;
      if (name === 'items' && body.PMDPrice !== undefined) update.pmdPrice = body.PMDPrice;
      Object.assign(record, update);
      put(name, record);
      return reply(hydrate(name, record));
    }
    if (method === 'DELETE' && action) {
      const index = db[name].findIndex(record => record.id === action);
      if (index < 0) fail(404, 'Local record not found.');
      if (name === 'cities') {
        // A shared city stays with its other members; only the last member deletes it.
        if ((members.get(action) ?? []).some(email => email !== owner)) {
          writes.push(env.DB.prepare('DELETE FROM city_members WHERE city_id = ? AND email = ?').bind(action, owner));
          return reply({ id: action, left: true });
        }
        if (db.pokemon.some(p => p.cityId === action)) fail(409, 'Move or delete every resident before deleting this city.');
        if (db.cities[index].inventory?.length) fail(409, 'Withdraw the stored items before deleting this city.');
        writes.push(env.DB.prepare('DELETE FROM city_members WHERE city_id = ?').bind(action));
      }
      if (name === 'pokemon') {
        const { cityId } = db.pokemon[index];
        if (cityId && (members.get(cityId) ?? [])[0] !== owner) fail(403, 'Only the city leader can delete residents.');
        leaveCity(db.pokemon[index]);
      }
      // Keep references valid when a campaign or referenced custom entry is in use.
      const removed: [string, Row][] = [[name, db[name][index]]];
      if (name === 'campaigns') for (const kind of referenceNames) {
        for (const record of db[kind]) if (record.campaignId === action) removed.push([kind, record]);
      }
      const removedIds = new Set(removed.map(([, record]) => record.id));
      if (db.pokemon.some(p => removedIds.has(p.pokemonTemplateId))) fail(409, 'Delete the Pokemon sheets using this template before deleting it.');
      if ([...removedIds].some(id => templatesInUse.has(id))) fail(409, 'Pokemon sheets in shared cities or other players\' accounts still use this template.');
      for (const [kind, record] of removed) drop(kind, record);
      for (const p of db.pokemon) {
        let changed = false;
        for (const key of ['trainerId', 'cityId', 'abilityId', 'heldItemId']) if (removedIds.has(p[key])) { p[key] = null; changed = true; }
        const moveIds = p.moveIds.filter((id: string) => !removedIds.has(id));
        if (moveIds.length !== p.moveIds.length) { p.moveIds = moveIds; changed = true; }
        if (changed && !removedIds.has(p.id)) put('pokemon', p);
      }
      return reply({ id: action });
    }
    return reply({ payload: 'This local API route is not implemented.' }, 404);
  }
}
