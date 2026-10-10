// JSON API. Reference data is read-only; user records live in D1 under the owner's
// email (migrations/, worker/access.ts). Each request loads the owner's records,
// works on them in memory and writes back only the records it changed.
import { ATTRIBUTES, RANKS, SKILLS, SOCIALS, TRAINER_SKILLS } from '../shared/types.ts';
import type { GenerateEncounterBody, Pokemon, PokemonTemplate, Rank, Stats, Trainer } from '../shared/types.ts';
import { matchesEncounterFilters } from '../shared/encounters.ts';
import type { Env } from './index.ts';
import { fetchOldData } from './import.ts';
import { loadReference, type Reference } from './reference.ts';

// Stored and reference records are handled generically by collection name.
type Json = Record<string, any>;
type Row = Json & { id: string };
type Collections = Record<string, Row[]>;

const referenceNames = ['pokemon-templates', 'moves', 'items', 'abilities', 'natures'];
const collectionNames = ['pokemon', 'trainers', 'campaigns', 'feedback', ...referenceNames];
const blankStats = () => Object.fromEntries([...ATTRIBUTES, ...SOCIALS, ...SKILLS, ...TRAINER_SKILLS, 'happiness', 'loyalty', 'will'].map(key => [key, 0])) as Stats;

class HttpError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

function fail(status: number, message: string): never {
  throw new HttpError(status, message);
}

// The server implementation was not published. These seeded local generators use
// the recovered data and rank point budgets, not the original selection algorithm.
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
  try { return text ? JSON.parse(text) : {}; }
  catch { fail(400, 'Invalid JSON.'); }
}

function reply(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function handleApi(request: Request, env: Env, url: URL, owner: string): Promise<Response> {
  try {
    const [name, action, id] = url.pathname.replace(/^\/api\/*/, '').split('/').filter(Boolean).map(decodeURIComponent);
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
      await env.DB.prepare(`INSERT INTO records (owner, collection, id, data)
        SELECT ?, value ->> 'collection', value ->> 'id', value ->> 'data' FROM json_each(?) WHERE true
        ON CONFLICT (owner, collection, id) DO UPDATE SET data = excluded.data`).bind(owner, JSON.stringify(rows)).run();
      return reply({ counts: Object.fromEntries(Object.entries(collections).map(([name, records]) => [name, records.length])), missing, skipped });
    }
    if (!collectionNames.includes(name)) return reply({ payload: 'Unknown local API endpoint.' }, 404);
    const db: Collections = Object.fromEntries(collectionNames.map(name => [name, []]));
    const { results } = await env.DB.prepare('SELECT collection, data FROM records WHERE owner = ? ORDER BY seq').bind(owner).all<{ collection: string; data: string }>();
    for (const row of results) db[row.collection].push(JSON.parse(row.data));
    const writes: D1PreparedStatement[] = [];
    const response = route(db, reference, writes, method, name, action, id, body);
    if (writes.length) await env.DB.batch(writes);
    return response;
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return reply({ status, payload: (error as Error).message }, status);
  }

  function upsert(name: string, record: Row) {
    return env.DB.prepare('INSERT INTO records (owner, collection, id, data) VALUES (?, ?, ?, ?) ON CONFLICT (owner, collection, id) DO UPDATE SET data = excluded.data')
      .bind(owner, name, record.id, JSON.stringify(record));
  }

  function route(db: Collections, reference: Reference, writes: D1PreparedStatement[],
    method: string, name: string, action: string | undefined, id: string | undefined, body: Json): Response {
    const referenceRows = reference as unknown as Collections;

    function put(name: string, record: Row) {
      writes.push(upsert(name, record));
    }

    function drop(name: string, id: string) {
      writes.push(env.DB.prepare('DELETE FROM records WHERE owner = ? AND collection = ? AND id = ?').bind(owner, name, id));
    }

    function find(name: string, id: unknown): Row | null {
      return db[name]?.find(record => record.id === id) ?? referenceRows[name]?.find(record => record.id === id) ?? null;
    }

    function template(record: Row | null): Row | null {
      if (!record) return null;
      if (!record.campaignId) return record;
      const result: Row = { ...record, campaign: find('campaigns', record.campaignId) };
      for (const key of ['abilityOne', 'abilityTwo', 'hiddenAbility', 'eventAbility']) {
        result[key] = find('abilities', record[`${key}Id`]);
      }
      result.possibleMoves = (record.possibleMoves ?? []).map((move: Row) => ({
        ...move, move: find('moves', move.moveId),
      })).filter((move: Row) => move.move);
      return result;
    }

    function referenceRecord(name: string, record: Row) {
      if (name === 'pokemon-templates') return template(record);
      return record?.campaignId ? { ...record, campaign: find('campaigns', record.campaignId) } : record;
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
        pokemonTemplate: template(find('pokemon-templates', record.pokemonTemplateId)),
        ability: find('abilities', record.abilityId), nature: find('natures', record.natureId),
        heldItem: find('items', record.heldItemId), trainer: find('trainers', record.trainerId),
        moves: (record.moveIds ?? []).map((id: string) => find('moves', id)).filter(Boolean),
      } as Pokemon;
    }

    function trainer(record: Row): Trainer {
      return { ...record, nature: find('natures', record.natureId),
        pokemon: db.pokemon.filter(p => p.trainerId === record.id).map(pokemon),
        inventory: (record.inventory ?? []).map((entry: Row) => ({ ...entry,
          item: entry.itemId ? find('items', entry.itemId) : { ...entry, id: `custom-${entry.id}` },
        })).filter((entry: Row) => entry.item),
      } as Trainer;
    }

    function hydrate(name: string, record: Row) {
      if (name === 'pokemon') return pokemon(record);
      if (name === 'trainers') return trainer(record);
      return referenceRecord(name, record);
    }

    function newPokemon(body: Json): Row {
      const species = find('pokemon-templates', body.pokemonTemplateId);
      if (!species) fail(400, 'Choose a valid Pokemon template.');
      const stats = { ...blankStats(), ...body.stats };
      return { id: crypto.randomUUID(), userId: owner, rank: 'UNRANKED', gender: 'N',
        noOfBattles: 0, trainingPoints: 0, moveIds: [], abilityId: species.abilityOne?.id ?? species.abilityOneId,
        natureId: null, heldItemId: null, trainerId: null,
        ...body, stats,
        currentHp: body.currentHp ?? species.baseHp + species.baseStats.vitality + stats.vitality,
        currentWill: body.currentWill ?? 3 + species.baseStats.insight + stats.insight,
      };
    }

    function generate(name: string, body: Json, isEncounter = false) {
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
          (!body.habitats?.length || body.habitats.some((h: string) => p.habitats.includes(h))) &&
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
        const moveIds: string[] = isEncounter ? availableMoves : [];
        while (!isEncounter && availableMoves.length && moveIds.length < entry.baseStats.insight + stats.insight + 3) {
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
      if (method === 'GET' && action === 'find-many') {
        return reply((id ?? '').split(',').map(value => template(find(name, value))).filter(Boolean));
      }
    }
    if (method === 'GET') {
      if (!action || action === 'minimal') {
        const records = referenceNames.includes(name) ? [...referenceRows[name], ...db[name]] : db[name];
        if (name === 'pokemon' && action === 'minimal') return reply(records.map(record => {
          const species = find('pokemon-templates', record.pokemonTemplateId)!;
          return { id: record.id, name: species.name, number: species.number, dexID: species.dexID,
            image: species.image, types: species.types, rank: record.rank };
        }));
        return reply(records.map(record => hydrate(name, record)));
      }
      const record = find(name, action);
      if (!record) fail(404, 'Record not found.');
      return reply(hydrate(name, record));
    }
    if (method === 'POST' && !action) {
      let record: Row = { ...body, id: body.id ?? body._id ?? crypto.randomUUID(), userId: owner };
      if (name === 'pokemon') record = newPokemon(record);
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
      if (name === 'pokemon' && body.pokemonTemplateId && !find('pokemon-templates', body.pokemonTemplateId)) fail(400, 'Pokemon template not found.');
      const update = { ...body };
      delete update.id; delete update.userId;
      if (name === 'trainers') {
        if (body.pokemonIds) {
          for (const p of db.pokemon) {
            const trainerId = body.pokemonIds.includes(p.id) ? record.id : p.trainerId === record.id ? null : p.trainerId;
            if (trainerId !== p.trainerId) { p.trainerId = trainerId; put('pokemon', p); }
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
      // Keep references valid when a campaign or referenced custom entry is in use.
      const removed: [string, string][] = [[name, action]];
      if (name === 'campaigns') for (const kind of referenceNames) {
        for (const record of db[kind]) if (record.campaignId === action) removed.push([kind, record.id]);
      }
      const removedIds = new Set(removed.map(([, id]) => id));
      if (db.pokemon.some(p => removedIds.has(p.pokemonTemplateId))) fail(409, 'Delete the Pokemon sheets using this template before deleting it.');
      for (const [kind, id] of removed) drop(kind, id);
      for (const p of db.pokemon) {
        let changed = false;
        for (const key of ['trainerId', 'abilityId', 'heldItemId']) if (removedIds.has(p[key])) { p[key] = null; changed = true; }
        const moveIds = p.moveIds.filter((id: string) => !removedIds.has(id));
        if (moveIds.length !== p.moveIds.length) { p.moveIds = moveIds; changed = true; }
        if (changed && !removedIds.has(p.id)) put('pokemon', p);
      }
      return reply({ id: action });
    }
    return reply({ payload: 'This local API route is not implemented.' }, 404);
  }
}
