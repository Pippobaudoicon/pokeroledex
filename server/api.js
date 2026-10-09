import { readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const dataFile = new URL('../data/local.json', import.meta.url);
const referenceNames = ['pokemon-templates', 'moves', 'items', 'abilities', 'natures'];
const reference = Object.fromEntries(referenceNames.map(name => [name,
  JSON.parse(readFileSync(new URL(`../data/reference/${name}.json`, import.meta.url), 'utf8')),
]));
const rankAttributes = JSON.parse(readFileSync(new URL('../data/reference/rankup-attributes.json', import.meta.url), 'utf8'));
const collectionNames = ['pokemon', 'trainers', 'campaigns', 'feedback', ...referenceNames];
const db = { ...Object.fromEntries(collectionNames.map(name => [name, []])),
  ...(existsSync(dataFile) ? JSON.parse(readFileSync(dataFile, 'utf8')) : {}) };
const ranks = ['UNRANKED', 'STARTER', 'ROOKIE', 'STANDARD', 'ADVANCED', 'EXPERT', 'ACE', 'MASTER', 'CHAMPION'];
const attributes = ['strength', 'dexterity', 'vitality', 'special', 'insight'];
const socials = ['tough', 'cool', 'beauty', 'cute', 'clever'];
const skills = ['brawl', 'channel', 'clash', 'evasion', 'alert', 'athletic', 'nature', 'stealth', 'allure', 'etiquette', 'intimidate', 'perform'];
const trainerSkills = ['throw', 'weapons', 'empathy', 'crafts', 'lore', 'medicine', 'science'];
const blankStats = () => Object.fromEntries([...attributes, ...socials, ...skills, ...trainerSkills, 'happiness', 'loyalty', 'will'].map(key => [key, 0]));

function save() {
  const temporaryFile = new URL('../data/local.json.tmp', import.meta.url);
  writeFileSync(temporaryFile, JSON.stringify(db, null, 2) + '\n');
  renameSync(temporaryFile, dataFile);
}

function fail(status, message) {
  throw Object.assign(new Error(message), { status });
}

function find(name, id) {
  return db[name]?.find(record => record.id === id) ?? reference[name]?.find(record => record.id === id) ?? null;
}

function template(record) {
  if (!record) return null;
  if (!record.campaignId) return record;
  const result = { ...record, campaign: find('campaigns', record.campaignId) };
  for (const key of ['abilityOne', 'abilityTwo', 'hiddenAbility', 'eventAbility']) {
    result[key] = find('abilities', record[`${key}Id`]);
  }
  result.possibleMoves = (record.possibleMoves ?? []).map(move => ({
    ...move, move: find('moves', move.moveId),
  })).filter(move => move.move);
  return result;
}

function referenceRecord(name, record) {
  if (name === 'pokemon-templates') return template(record);
  return record?.campaignId ? { ...record, campaign: find('campaigns', record.campaignId) } : record;
}

function selected(name, body = {}) {
  const campaignIds = body.campaignIds ?? [];
  return [
    ...(body.includeCore === false ? [] : reference[name] ?? []),
    ...db[name].filter(record => campaignIds.includes(record.campaignId)),
  ].map(record => referenceRecord(name, record));
}

function pokemon(record) {
  return { ...record,
    pokemonTemplate: template(find('pokemon-templates', record.pokemonTemplateId)),
    ability: find('abilities', record.abilityId), nature: find('natures', record.natureId),
    heldItem: find('items', record.heldItemId), trainer: find('trainers', record.trainerId),
    moves: (record.moveIds ?? []).map(id => find('moves', id)).filter(Boolean),
  };
}

function trainer(record) {
  return { ...record, nature: find('natures', record.natureId),
    pokemon: db.pokemon.filter(p => p.trainerId === record.id).map(pokemon),
    inventory: (record.inventory ?? []).map(entry => ({ ...entry,
      item: entry.itemId ? find('items', entry.itemId) : { ...entry, id: `custom-${entry.id}` },
    })).filter(entry => entry.item),
  };
}

function hydrate(name, record) {
  if (name === 'pokemon') return pokemon(record);
  if (name === 'trainers') return trainer(record);
  return referenceRecord(name, record);
}

function newPokemon(body) {
  const species = find('pokemon-templates', body.pokemonTemplateId);
  if (!species) fail(400, 'Choose a valid Pokemon template.');
  const stats = { ...blankStats(), ...body.stats };
  return { id: randomUUID(), userId: 'local-user', rank: 'UNRANKED', gender: 'N',
    noOfBattles: 0, trainingPoints: 0, moveIds: [], abilityId: species.abilityOne?.id ?? species.abilityOneId,
    natureId: null, heldItemId: null, trainerId: null,
    ...body, stats,
    currentHp: body.currentHp ?? species.baseHp + species.baseStats.vitality + stats.vitality,
    currentWill: body.currentWill ?? 3 + species.baseStats.insight + stats.insight,
  };
}

// The server implementation was not published. These seeded local generators use
// the recovered data and rank point budgets, not the original selection algorithm.
function randomSource(seed) {
  let state = Number(seed) >>> 0 || 1;
  return () => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function generate(name, body) {
  const random = randomSource(body.seed ?? Date.now());
  const choose = list => list[Math.floor(random() * list.length)];
  const count = Number(body.numberToGenerate ?? 1);
  if (!Number.isInteger(count) || count < 1 || count > 100) fail(400, 'Generate between 1 and 100 at a time.');
  let candidates = selected(name === 'pokemon' ? 'pokemon-templates' : 'items', body);
  if (name === 'items') {
    candidates = candidates.filter(item => (!body.categories?.length || body.categories.includes(item.category)) &&
      (!body.pockets?.length || body.pockets.includes(item.pocket)));
  } else {
    if (!ranks.includes(body.rank)) fail(400, 'Choose a valid rank.');
    candidates = candidates.filter(p => body.pokemonTemplateId ? p.id === body.pokemonTemplateId :
      (!body.habitats?.length || body.habitats.some(h => p.habitats.includes(h))) &&
      (body.includeLegendary === 'ALL' || (body.includeLegendary === 'ONLY' ? p.legendary : !p.legendary)) &&
      (body.rankOrBelow ? ranks.indexOf(p.recommendedRank) <= ranks.indexOf(body.rank) : p.recommendedRank === body.rank));
  }
  if (!candidates.length) fail(400, 'No entries match these filters.');
  return Array.from({ length: count }, () => {
    const entry = choose(candidates);
    if (name === 'items') return entry;
    const stats = blankStats();
    const allocate = (keys, points, limit) => {
      for (let n = 0; n < points; n++) {
        let available = keys.filter(key => stats[key] < limit(key));
        if (!available.length) break;
        if (body.rankUpMethod !== 'RANDOM' && keys === attributes) {
          available.sort((a, b) => entry.baseStats[b] - entry.baseStats[a]);
          if (body.rankUpMethod === 'MIN_MAX') available = available.slice(0, 1);
          else available = available.slice(0, 2);
        }
        stats[choose(available)]++;
      }
    };
    for (const rank of ranks.slice(1, ranks.indexOf(body.rank) + 1)) {
      const budget = rankAttributes[rank];
      if (!budget?.rank) continue;
      allocate(attributes, budget.attributePoints, key => entry.maxStats[key] - entry.baseStats[key]);
      allocate(socials, budget.socialPoints, () => 4);
      allocate(skills, budget.skillPoints, () => budget.skillLimit);
    }
    const availableMoves = [...new Set(entry.possibleMoves.filter(move => ranks.indexOf(move.rank) <= ranks.indexOf(body.rank)).map(move => move.move.id))];
    const moveIds = [];
    while (availableMoves.length && moveIds.length < entry.baseStats.insight + stats.insight + 3) {
      moveIds.push(availableMoves.splice(Math.floor(random() * availableMoves.length), 1)[0]);
    }
    const abilities = [entry.abilityOne, entry.abilityTwo].filter(Boolean);
    return pokemon(newPokemon({ pokemonTemplateId: entry.id, rank: body.rank, stats, moveIds,
      abilityId: choose(abilities)?.id, natureId: choose(reference.natures).id,
      gender: ['M', 'F', 'N'].includes(entry.genderType) ? entry.genderType : choose(['M', 'F']),
    }));
  });
}

async function readBody(req) {
  let text = '';
  for await (const chunk of req) {
    text += chunk;
    if (text.length > 2_000_000) fail(413, 'Request is too large.');
  }
  try { return text ? JSON.parse(text) : {}; }
  catch { fail(400, 'Invalid JSON.'); }
}

export async function handleApi(req, res, url) {
  const reply = (value, status = 200) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(value));
  };
  try {
    const [name, action, id] = url.pathname.replace(/^\/api\/*/, '').split('/').filter(Boolean).map(decodeURIComponent);
    const method = req.method;
    const body = ['POST', 'PATCH', 'PUT'].includes(method) ? await readBody(req) : {};
    if (name === 'rankup-attributes' && method === 'GET') {
      return reply(rankAttributes[action]?.rank ? rankAttributes[action] : null);
    }
    if (!collectionNames.includes(name)) return reply({ payload: 'Unknown local API endpoint.' }, 404);
    if (method === 'POST' && action === 'generate' && ['pokemon', 'items'].includes(name)) return reply(generate(name, body));
    if (referenceNames.includes(name)) {
      if (method === 'POST' && ['filtered', 'campaigns', 'all'].includes(action)) {
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
        const records = referenceNames.includes(name) ? [...reference[name], ...db[name]] : db[name];
        if (name === 'pokemon' && action === 'minimal') return reply(records.map(record => {
          const species = find('pokemon-templates', record.pokemonTemplateId);
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
      let record = { ...body, id: body.id ?? body._id ?? randomUUID(), userId: 'local-user' };
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
      save();
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
            if (body.pokemonIds.includes(p.id)) p.trainerId = record.id;
            else if (p.trainerId === record.id) p.trainerId = null;
          }
          delete update.pokemonIds;
        }
        if (body.inventory) update.inventory = body.inventory.map(entry => ({ ...entry, id: entry.id || randomUUID() }));
      }
      if (name === 'campaigns') update.isCore = false;
      if (name === 'items' && body.PMDPrice !== undefined) update.pmdPrice = body.PMDPrice;
      Object.assign(record, update);
      save();
      return reply(hydrate(name, record));
    }
    if (method === 'DELETE' && action) {
      const index = db[name].findIndex(record => record.id === action);
      if (index < 0) fail(404, 'Local record not found.');
      // Keep references valid when a campaign or referenced custom entry is in use.
      const removedIds = new Set([action]);
      if (name === 'campaigns') for (const kind of referenceNames) {
        for (const record of db[kind]) if (record.campaignId === action) removedIds.add(record.id);
      }
      if (db.pokemon.some(p => removedIds.has(p.pokemonTemplateId))) fail(409, 'Delete the Pokemon sheets using this template before deleting it.');
      db[name].splice(index, 1);
      if (name === 'campaigns') for (const kind of referenceNames) db[kind] = db[kind].filter(record => record.campaignId !== action);
      for (const p of db.pokemon) {
        for (const key of ['trainerId', 'abilityId', 'heldItemId']) if (removedIds.has(p[key])) p[key] = null;
        p.moveIds = p.moveIds.filter(id => !removedIds.has(id));
      }
      save();
      return reply({ id: action });
    }
    reply({ payload: 'This local API route is not implemented.' }, 404);
  } catch (error) {
    reply({ status: error.status ?? 500, payload: error.message }, error.status ?? 500);
  }
}
