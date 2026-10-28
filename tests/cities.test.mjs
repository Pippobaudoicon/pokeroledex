import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { handleApi } from '../worker/api.ts';
import { cityLimits, cityRankGroups, cityTypeCounts, residentBonus } from '../shared/cities.ts';
import { CITY_SKILLS, POKEMON_TYPES } from '../shared/types.ts';

const species = {
  id: 'charmander', name: 'Charmander', types: ['FIRE', 'FLYING'], baseHp: 3,
  baseStats: { vitality: 1, insight: 1 }, possibleMoves: [],
  abilityOneId: null, abilityTwoId: null, hiddenAbilityId: null, eventAbilityId: null,
};

// A small Pokedex: a three-stage line with a Mega and a branch, a two-stage line,
// a species that never evolves with an alternate form, a legendary, and a broken link.
// Every harness serves it because the Worker caches reference data per isolate.
const evo = (type, targetId, kind = 'LEVEL') => ({ type, targetId, kind });
const dex = [
  { id: 'ralts', evolutions: [evo('TO', 'kirlia')] },
  { id: 'kirlia', evolutions: [evo('FROM', 'ralts'), evo('TO', 'gardevoir'), evo('TO', 'gallade', 'STONE')] },
  { id: 'gardevoir', evolutions: [evo('FROM', 'kirlia'), evo('TO', 'gardevoir-mega', 'MEGA')] },
  { id: 'gallade', evolutions: [evo('FROM', 'kirlia', 'STONE')] },
  { id: 'gardevoir-mega', evolutions: [evo('FROM', 'gardevoir', 'MEGA')] },
  { id: 'magikarp', evolutions: [evo('TO', 'gyarados')] },
  { id: 'gyarados', evolutions: [evo('FROM', 'magikarp')] },
  { id: 'rotom', evolutions: [evo('TO', 'rotom-wash', 'FORM')] },
  { id: 'rotom-wash', evolutions: [evo('FROM', 'rotom', 'FORM')] },
  { id: 'tauros', evolutions: [] },
  { id: 'mewtwo', legendary: true, evolutions: [evo('TO', 'mewtwo-mega', 'MEGA')] },
  { id: 'mewtwo-mega', evolutions: [evo('FROM', 'mewtwo', 'MEGA')] },
  { id: 'silvally', evolutions: [evo('FROM', 'missing-type-null')] },
].map(entry => ({ ...species, name: entry.id, types: ['NORMAL'], legendary: false, ...entry }));

const migrationsDir = new URL('../migrations/', import.meta.url);
function migrate(db, from = 1, until = Infinity) {
  for (const file of readdirSync(migrationsDir).filter(file => file.endsWith('.sql')).sort()) {
    const number = Number.parseInt(file, 10);
    if (number >= from && number <= until) db.exec(readFileSync(new URL(file, migrationsDir), 'utf8'));
  }
}

function harness(referenceOverrides = {}) {
  const db = new DatabaseSync(':memory:');
  migrate(db);
  const prepare = (sql) => {
    let values = [];
    return {
      bind(...args) { values = args; return this; },
      async all() { return { results: db.prepare(sql).all(...values) }; },
      async run() { db.prepare(sql).run(...values); return { success: true }; },
    };
  };
  const env = {
    DB: {
      prepare,
      async batch(statements) {
        db.exec('BEGIN');
        try {
          const results = [];
          for (const statement of statements) results.push(await statement.run());
          db.exec('COMMIT');
          return results;
        } catch (error) { db.exec('ROLLBACK'); throw error; }
      },
    },
    ASSETS: {
      async fetch(url) {
        const name = String(url).split('/').pop();
        if (Object.hasOwn(referenceOverrides, name)) return Response.json(referenceOverrides[name]);
        return Response.json(name === 'pokemon-templates.json' ? [species, ...dex] : name === 'rankup-attributes.json' ? {} : []);
      },
    },
  };
  return {
    db,
    close: () => db.close(),
    async request(path, method = 'GET', body = undefined, owner = 'alice') {
      const url = new URL(`https://local.test/api/${path}`);
      const request = new Request(url, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      const response = await handleApi(request, env, url, owner);
      return { status: response.status, body: await response.json() };
    },
  };
}

test('habitat macros work in both generator APIs and campaign habitats normalize on reads and writes', async () => {
  const h = harness({ 'natures.json': [{ id: 'test-nature', name: 'Test' }] });
  try {
    const campaign = (await h.request('campaigns', 'POST', { name: 'Habitats' })).body;
    const make = async (name, habitats) => h.request('pokemon-templates', 'POST', {
      ...species, id: undefined, dexID: name, number: 1, name, campaignId: campaign.id,
      recommendedRank: 'UNRANKED', legendary: false, genderType: 'N', habitats, possibleMoves: [], evolutions: [],
    });
    const cold = await make('Cold species', ['GLACIERS', 'COLD_AREAS', 'ICY_CAVES']);
    const mountain = await make('Mountain species', ['MOUNTAINS', 'MOUNTAIN_PEAKS']);
    assert.equal(cold.status, 201);
    assert.deepEqual(cold.body.habitats, ['ICE_AND_SNOW', 'ICY_CAVES']);
    assert.deepEqual(mountain.body.habitats, ['MOUNTAINS']);
    const stored = JSON.parse(h.db.prepare('SELECT data FROM records WHERE id = ?').get(cold.body.id).data);
    assert.deepEqual(stored.habitats, ['ICE_AND_SNOW', 'ICY_CAVES']);
    // Simulate an existing imported template that predates normalization.
    h.db.prepare('UPDATE records SET data = json_set(data, \'$.habitats\', json(?)) WHERE id = ?')
      .run(JSON.stringify(['GLACIERS', 'COLD_AREAS']), cold.body.id);
    assert.deepEqual((await h.request(`pokemon-templates/${cold.body.id}`)).body.habitats, ['ICE_AND_SNOW']);
    const selection = { campaignIds: [campaign.id], includeCore: false, rank: 'UNRANKED', seed: 1, numberToGenerate: 1, excludeForms: false };
    for (const route of ['pokemon/generate', 'pokemon/encounter']) {
      for (const habitats of [['ICE'], ['GLACIERS'], ['ICE_AND_SNOW'], ['FOREST', 'ICE']]) {
        const generated = await h.request(route, 'POST', { ...selection, habitats });
        assert.equal(generated.status, 200, JSON.stringify(generated.body));
        assert.equal(generated.body.length, 1);
        assert.equal(generated.body[0].pokemonTemplate.id, cold.body.id);
        assert.deepEqual(generated.body[0].pokemonTemplate.habitats, ['ICE_AND_SNOW']);
      }
      const generated = await h.request(route, 'POST', { ...selection, habitats: ['HIGHLANDS'] });
      assert.equal(generated.body[0].pokemonTemplate.id, mountain.body.id);
      for (const habitats of [['INVALID'], 'ICE', [null]]) {
        assert.equal((await h.request(route, 'POST', { ...selection, habitats })).status, 400);
      }
    }
    const updated = await h.request('pokemon-templates', 'PATCH', { id: cold.body.id, habitats: ['CITIES', 'HOUSES'] });
    assert.equal(updated.status, 200);
    assert.deepEqual(updated.body.habitats, ['URBAN_AREAS']);
    assert.equal((await make('Invalid', ['ICE'])).status, 400);
    assert.equal((await h.request('pokemon-templates', 'PATCH', { id: cold.body.id, habitats: ['INVALID'] })).status, 400);
    assert.deepEqual((await h.request(`pokemon-templates/${cold.body.id}`)).body.habitats, ['URBAN_AREAS']);
  } finally { h.close(); }
});

test('Pokemon nicknames persist in sheets, parties and collection names and can be cleared', async () => {
  const h = harness();
  try {
    const trainer = (await h.request('trainers', 'POST', { name: 'Red' })).body;
    const created = await h.request('pokemon', 'POST', { pokemonTemplateId: species.id, trainerId: trainer.id });
    assert.equal(created.status, 201);
    const id = created.body.id;
    const patch = body => h.request('pokemon', 'PATCH', { id, ...body });
    assert.equal((await h.request('pokemon/minimal')).body[0].name, species.name);
    const updated = await patch({ nickname: '  Sparky  ' });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.nickname, 'Sparky');
    assert.equal(updated.body.pokemonTemplate.name, species.name);
    assert.equal((await h.request(`pokemon/${id}`)).body.nickname, 'Sparky');
    assert.equal((await h.request(`trainers/${trainer.id}`)).body.pokemon[0].nickname, 'Sparky');
    assert.equal((await h.request('pokemon/minimal')).body[0].name, 'Sparky');
    await patch({ trainingPoints: 5 });
    assert.equal((await h.request(`pokemon/${id}`)).body.nickname, 'Sparky');
    assert.equal((await h.request('pokemon', 'PATCH', { id, nickname: 'Stolen' }, 'bob')).status, 404);
    for (const nickname of [null, 42, {}, []]) {
      assert.equal((await patch({ nickname })).status, 400);
      assert.equal((await h.request('pokemon', 'POST', { pokemonTemplateId: species.id, nickname })).status, 400);
    }
    assert.equal((await h.request(`pokemon/${id}`)).body.nickname, 'Sparky');
    assert.equal((await patch({ nickname: '   ' })).body.nickname, '');
    assert.equal((await h.request('pokemon/minimal')).body[0].name, species.name);
    const named = await h.request('pokemon', 'POST', { pokemonTemplateId: species.id, nickname: ' Ember ' });
    assert.equal(named.status, 201);
    assert.equal((await h.request(`pokemon/${named.body.id}`)).body.nickname, 'Ember');
  } finally { h.close(); }
});

test('shiny is kept when caught, edited, listed and moved, and defaults to false', async () => {
  const h = harness();
  try {
    const plain = await h.request('pokemon', 'POST', { pokemonTemplateId: species.id });
    assert.equal(plain.body.shiny, false);
    const caught = await h.request('pokemon', 'POST', { pokemonTemplateId: species.id, shiny: true });
    assert.equal(caught.status, 201);
    assert.equal(caught.body.shiny, true);
    const id = caught.body.id;
    assert.deepEqual((await h.request('pokemon/minimal')).body.map(p => [p.id, p.shiny]).sort(), [[plain.body.id, false], [id, true]].sort());
    for (const shiny of [null, 1, 'yes', {}]) {
      assert.equal((await h.request('pokemon', 'PATCH', { id, shiny })).status, 400, JSON.stringify(shiny));
      assert.equal((await h.request('pokemon', 'POST', { pokemonTemplateId: species.id, shiny })).status, 400, JSON.stringify(shiny));
    }
    assert.equal((await h.request(`pokemon/${id}`)).body.shiny, true);
    const city = (await h.request('cities', 'POST', { name: 'Pallet' })).body;
    assert.equal((await h.request('pokemon', 'PATCH', { id, cityId: city.id })).body.shiny, true);
    assert.equal((await h.request('pokemon', 'PATCH', { id, takeOwnership: true })).body.shiny, true);
    assert.equal((await h.request('pokemon', 'PATCH', { id, shiny: false })).body.shiny, false);
    assert.equal((await h.request('pokemon/minimal')).body.find(p => p.id === id).shiny, false);
  } finally { h.close(); }
});

test('city counts group ranks separately and count each distinct type once', () => {
  const pokemonTemplate = { ...species, types: ['FIRE', 'FLYING', 'FIRE'] };
  assert.deepEqual(cityTypeCounts([
    { rank: 'ROOKIE', pokemonTemplate }, { rank: 'ROOKIE', pokemonTemplate },
    { rank: 'ACE', pokemonTemplate }, { rank: 'ACE', pokemonTemplate: { types: ['ICE'] } },
  ]), [
    { type: 'FIRE', rank: 'ROOKIE', count: 2 }, { type: 'FIRE', rank: 'ACE', count: 1 },
    { type: 'FLYING', rank: 'ROOKIE', count: 2 }, { type: 'FLYING', rank: 'ACE', count: 1 },
    { type: 'ICE', rank: 'ACE', count: 1 },
  ]);
  assert.deepEqual(cityTypeCounts([]), []);
});

test('rank overview includes all 18 types, zeroes and uncapped counts in rank order', () => {
  const pokemonTemplate = { ...species, types: ['FIRE', 'FLYING'] };
  const groups = cityRankGroups([
    { rank: 'ACE', pokemonTemplate: { types: ['ICE'] } },
    ...Array.from({ length: 12 }, () => ({ rank: 'ROOKIE', pokemonTemplate })),
  ]);
  assert.deepEqual(groups.map(group => [group.rank, group.population]), [['ROOKIE', 12], ['ACE', 1]]);
  for (const group of groups) {
    assert.equal(group.types.length, 18);
    assert.deepEqual(new Set(group.types.map(entry => entry.type)), new Set(POKEMON_TYPES));
    assert.equal(group.types.find(entry => entry.type === 'WATER').count, 0);
  }
  assert.equal(groups[0].types.find(entry => entry.type === 'FIRE').count, 12);
  assert.equal(groups[0].types.find(entry => entry.type === 'FLYING').count, 12);
  assert.equal(groups[1].types.find(entry => entry.type === 'ICE').count, 1);
  assert.deepEqual(cityRankGroups([]), []);
});

test('city CRUD persists separate cities, rank and tags, and protects ownership', async () => {
  const h = harness();
  try {
    const first = await h.request('cities', 'POST', { name: '  Pallet Town  ' });
    assert.equal(first.status, 201);
    assert.equal(first.body.name, 'Pallet Town');
    assert.equal(first.body.rank, 'UNRANKED');
    assert.deepEqual(first.body.limits, { residents: 7, skill: 6 });
    assert.deepEqual(first.body.skills, Object.fromEntries(CITY_SKILLS.map(skill => [skill, 0])));
    assert.deepEqual(first.body.assignments, {});
    const second = await h.request('cities', 'POST', { name: 'Viridian City' });
    assert.notEqual(first.body.id, second.body.id);
    const path = `cities/${first.body.id}`;
    const updated = await h.request(path, 'PATCH', {
      name: 'New Pallet', rank: 'ADVANCED', skills: { research: 10 }, tagValues: { 'Can heal': 9 },
      tags: [' Can heal ', 'Can heal', 'Can produce food'], userId: 'mallory', id: 'changed',
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.id, first.body.id);
    assert.equal(updated.body.userId, 'alice');
    assert.equal(updated.body.rank, 'ADVANCED');
    assert.deepEqual(updated.body.limits, { residents: 19, skill: 10 });
    assert.equal(updated.body.skills.research, 0, 'skills are derived from residents, not set manually');
    assert.deepEqual(updated.body.tags, ['Can heal', 'Can produce food']);
    assert.deepEqual(updated.body.tagValues, { 'Can heal': 0, 'Can produce food': 0 });
    assert.equal((await h.request(path)).body.name, 'New Pallet');
    assert.equal((await h.request('cities')).body.length, 2);
    assert.deepEqual((await h.request('cities', 'GET', undefined, 'bob')).body, []);
    for (const method of ['GET', 'PATCH', 'DELETE']) {
      assert.equal((await h.request(path, method, method === 'PATCH' ? { name: 'Stolen' } : undefined, 'bob')).status, 404);
    }
  } finally { h.close(); }
});

test('city validation rejects malformed names, ranks, assignments, tags and request bodies', async () => {
  const h = harness();
  try {
    for (const body of [
      null, [], { name: '' }, { name: ' ' }, { name: 'a'.repeat(101) },
      ...['', 'GOD', null, 3].map(rank => ({ name: 'Test', rank })),
      { name: 'Test', assignments: null }, { name: 'Test', assignments: [] }, { name: 'Test', assignments: { someone: 'skill:metallurgy' } },
      { name: 'Test', tags: [3] }, { name: 'Test', tags: [' '] },
      { name: 'Test', tags: ['a'.repeat(81)] }, { name: 'Test', tags: Array(51).fill('heal') },
    ]) assert.equal((await h.request('cities', 'POST', body)).status, 400, JSON.stringify(body));
    assert.deepEqual((await h.request('cities')).body, []);
  } finally { h.close(); }
});

test('city limits grow with rank: 4 + 3 x level residents and 5 + level skill', () => {
  assert.deepEqual(['UNRANKED', 'STARTER', 'ROOKIE', 'STANDARD', 'ADVANCED', 'CHAMPION'].map(rank => [rank, cityLimits(rank)]), [
    ['UNRANKED', { residents: 7, skill: 6 }], ['STARTER', { residents: 10, skill: 7 }], ['ROOKIE', { residents: 13, skill: 8 }],
    ['STANDARD', { residents: 16, skill: 9 }], ['ADVANCED', { residents: 19, skill: 10 }], ['CHAMPION', { residents: 31, skill: 14 }],
  ]);
});

test('resident bonus follows evolution stage, never-evolving species and legendaries', () => {
  const byId = new Map(dex.map(entry => [entry.id, entry]));
  const bonus = id => residentBonus(byId.get(id), target => byId.get(target) ?? null);
  assert.deepEqual(Object.fromEntries(dex.map(entry => [entry.id, bonus(entry.id)])), {
    ralts: 1, kirlia: 2, gardevoir: 3, gallade: 3, 'gardevoir-mega': 3,
    magikarp: 1, gyarados: 2,
    rotom: 2, 'rotom-wash': 2, tauros: 2,
    mewtwo: 5, 'mewtwo-mega': 5,
    silvally: 2,
  });
});

test('skills and actions are the capped sum of assigned residents and follow them', async () => {
  const h = harness();
  try {
    const city = (await h.request('cities', 'POST', { name: 'Pallet', tags: ['Can heal'] })).body;
    const path = `cities/${city.id}`;
    const add = async id => (await h.request('pokemon', 'POST', { pokemonTemplateId: id, cityId: city.id })).body.id;
    const ralts = await add('ralts');
    const gardevoir = await add('gardevoir');
    const tauros = await add('tauros');
    const mewtwo = await add('mewtwo');
    const assign = (assignments, owner) => h.request(path, 'PATCH', { assignments }, owner);

    let result = await assign({ [ralts]: 'skill:craftsmanship', [gardevoir]: 'skill:craftsmanship', [tauros]: 'tag:Can heal' });
    assert.equal(result.status, 200);
    assert.deepEqual(result.body.bonuses, { [ralts]: 1, [gardevoir]: 3, [tauros]: 2, [mewtwo]: 5 });
    assert.equal(result.body.skills.craftsmanship, 4);
    assert.equal(result.body.tagValues['Can heal'], 2);
    assert.equal(result.body.assignments[mewtwo], undefined);

    // Assignments merge, so one member's change keeps the others; null unassigns.
    result = await assign({ [mewtwo]: 'skill:craftsmanship', [ralts]: null });
    assert.equal(result.body.skills.craftsmanship, 6, 'Unranked caps the 8 from Gardevoir and Mewtwo at 6');
    assert.equal(result.body.tagValues['Can heal'], 2);
    assert.deepEqual(Object.keys(result.body.assignments).sort(), [gardevoir, mewtwo, tauros].sort());
    assert.equal((await h.request(path, 'PATCH', { rank: 'ADVANCED' })).body.skills.craftsmanship, 8);

    for (const assignments of [{ [ralts]: 'skill:cooking' }, { [ralts]: 'tag:Can fly' }, { [ralts]: 'craftsmanship' }, { [ralts]: 3 }]) {
      assert.equal((await assign(assignments)).status, 400, JSON.stringify(assignments));
    }
    const outsider = (await h.request('pokemon', 'POST', { pokemonTemplateId: 'tauros' })).body.id;
    assert.equal((await assign({ [outsider]: 'skill:nursing' })).status, 400);

    // Removing an action unassigns its residents; leaving the city clears the assignment.
    result = await h.request(path, 'PATCH', { tags: [] });
    assert.equal(result.body.assignments[tauros], undefined);
    assert.deepEqual(result.body.tagValues, {});
    assert.equal((await h.request('pokemon', 'PATCH', { id: mewtwo, takeOwnership: true })).status, 200);
    assert.equal((await h.request(path)).body.skills.craftsmanship, 3);
    assert.equal((await h.request('pokemon', 'PATCH', { id: mewtwo, cityId: city.id })).status, 200);
    assert.equal((await h.request(path)).body.assignments[mewtwo], undefined, 'a returning resident starts unassigned');
  } finally { h.close(); }
});

test('a resident works only skills its species allows, at full or half bonus, and Catalyst takes anyone', async () => {
  const h = harness();
  try {
    const city = (await h.request('cities', 'POST', { name: 'Pallet' })).body;
    const path = `cities/${city.id}`;
    const add = async id => (await h.request('pokemon', 'POST', { pokemonTemplateId: id, cityId: city.id })).body.id;
    const gardevoir = await add('gardevoir');
    const tauros = await add('tauros');
    const charmander = await add(species.id);

    // The test species are Normal (full Craftsmanship and Nursing, half Technology); Charmander is Fire/Flying.
    let result = (await h.request(path)).body;
    assert.deepEqual(result.profiles[gardevoir], { craftsmanship: 'full', technology: 'half', nursing: 'full' });
    assert.deepEqual(result.profiles[charmander], { craftsmanship: 'half', technology: 'half', metallurgy: 'full', foraging: 'full' });

    const refused = await h.request(path, 'PATCH', { assignments: { [gardevoir]: 'skill:metallurgy' } });
    assert.equal(refused.status, 400);
    assert.match(refused.body.payload, /gardevoir cannot work Metallurgy/);

    result = (await h.request(path, 'PATCH', { assignments: { [gardevoir]: 'skill:technology', [tauros]: 'skill:catalyst', [charmander]: 'skill:catalyst' } })).body;
    assert.equal(result.skills.technology, 1, 'half of Gardevoir\'s 3, rounded down');
    assert.deepEqual(result.catalysts, { NORMAL: 2, FIRE: 2, FLYING: 2 });
    assert.equal(result.skills.catalyst, 3, 'Catalyst counts the types it provides');

    // A stored assignment the species cannot work (from older data) is dropped when the city is read.
    h.db.prepare('UPDATE records SET data = json_set(data, \'$.assignments.\' || ?, \'skill:apothecary\') WHERE id = ?').run(tauros, city.id);
    result = (await h.request(path)).body;
    assert.equal(result.assignments[tauros], undefined);
    assert.equal(result.skills.apothecary, 0);
  } finally { h.close(); }
});

test('a city holds at most its rank\'s residents and cannot drop below its population', async () => {
  const h = harness();
  try {
    const city = (await h.request('cities', 'POST', { name: 'Pallet' })).body;
    for (let i = 0; i < 7; i++) assert.equal((await h.request('pokemon', 'POST', { pokemonTemplateId: species.id, cityId: city.id })).status, 201);
    assert.equal((await h.request('pokemon', 'POST', { pokemonTemplateId: species.id, cityId: city.id })).status, 409);
    const personal = (await h.request('pokemon', 'POST', { pokemonTemplateId: species.id })).body.id;
    assert.equal((await h.request('pokemon', 'PATCH', { id: personal, cityId: city.id })).status, 409);
    assert.equal((await h.request('pokemon', 'GET')).body.length, 1, 'the rejected Pokemon stays personal');
    assert.equal((await h.request(`cities/${city.id}`, 'PATCH', { rank: 'STARTER' })).status, 200);
    assert.equal((await h.request('pokemon', 'PATCH', { id: personal, cityId: city.id })).status, 200);
    assert.equal((await h.request(`cities/${city.id}`, 'PATCH', { rank: 'UNRANKED' })).status, 409);
    assert.equal((await h.request(`cities/${city.id}`)).body.rank, 'STARTER');
  } finally { h.close(); }
});

test('a legacy city above its cap can still save name and actions without changing rank', async () => {
  const h = harness();
  try {
    const city = (await h.request('cities', 'POST', { name: 'Pallet', rank: 'STARTER' })).body;
    for (let i = 0; i < 8; i++) assert.equal((await h.request('pokemon', 'POST', { pokemonTemplateId: species.id, cityId: city.id })).status, 201);
    h.db.prepare("UPDATE records SET data = json_remove(data, '$.rank') WHERE collection = 'cities' AND id = ?").run(city.id);
    assert.equal((await h.request(`cities/${city.id}`)).body.rank, 'UNRANKED');
    const saved = await h.request(`cities/${city.id}`, 'PATCH', { name: 'Viridian', rank: 'UNRANKED', tags: ['Can heal'] });
    assert.equal(saved.status, 200);
    assert.equal(saved.body.name, 'Viridian');
    assert.deepEqual(saved.body.tags, ['Can heal']);
  } finally { h.close(); }
});

test('all assignment paths move the original sheet exclusively and preserve its data', async () => {
  const h = harness();
  try {
    const city = (await h.request('cities', 'POST', { name: 'Pallet' })).body;
    const other = (await h.request('cities', 'POST', { name: 'Viridian' })).body;
    const trainer = (await h.request('trainers', 'POST', { name: 'Red' })).body;
    const p = (await h.request('pokemon', 'POST', {
      pokemonTemplateId: species.id, rank: 'ROOKIE', trainerId: trainer.id,
      stats: { brawl: 2 }, moveIds: [], trainingPoints: 7,
    })).body;
    const patch = body => h.request('pokemon', 'PATCH', { id: p.id, ...body });
    let moved = await patch({ cityId: city.id });
    assert.equal(moved.body.trainerId, null);
    assert.equal(moved.body.cityId, city.id);
    assert.equal((await h.request(`trainers/${trainer.id}`)).body.pokemon.length, 0);
    moved = await patch({ cityId: other.id });
    assert.equal(moved.body.cityId, other.id);
    moved = await patch({ trainerId: trainer.id });
    assert.equal(moved.body.cityId, null);
    assert.equal(moved.body.trainerId, trainer.id);
    await patch({ cityId: city.id });
    const party = await h.request('trainers', 'PATCH', { id: trainer.id, pokemonIds: [p.id] });
    assert.equal(party.body.pokemon[0].cityId, null);
    assert.equal(party.body.pokemon[0].id, p.id);
    assert.equal(party.body.pokemon[0].stats.brawl, 2);
    assert.equal(party.body.pokemon[0].trainingPoints, 7);
    assert.equal((await h.request('pokemon')).body.length, 1);
    await patch({ cityId: city.id });
    assert.equal((await patch({ cityId: null })).status, 400);
    await patch({ takeOwnership: true });
    const unassigned = (await h.request(`pokemon/${p.id}`)).body;
    assert.equal(unassigned.cityId, null);
    assert.equal(unassigned.trainerId, null);
    assert.equal(unassigned.rank, 'ROOKIE');
    assert.equal('takeOwnership' in unassigned, false);
    assert.equal((await h.request('trainers', 'PATCH', { id: trainer.id, pokemonIds: ['missing'] })).status, 400);
  } finally { h.close(); }
});

test('invalid and foreign assignments fail without changing the stored Pokemon', async () => {
  const h = harness();
  try {
    const city = (await h.request('cities', 'POST', { name: 'Pallet' })).body;
    const trainer = (await h.request('trainers', 'POST', { name: 'Red' })).body;
    const foreign = (await h.request('cities', 'POST', { name: 'Private' }, 'bob')).body;
    const p = (await h.request('pokemon', 'POST', { pokemonTemplateId: species.id, cityId: city.id })).body;
    for (const body of [
      { cityId: 'missing' }, { cityId: foreign.id }, { trainerId: 'missing' }, { cityId: '' },
      { cityId: 123 }, { cityId: city.id, trainerId: trainer.id }, { rank: 'INVALID' },
    ]) {
      assert.equal((await h.request('pokemon', 'PATCH', { id: p.id, ...body })).status, 400);
      assert.equal((await h.request('pokemon', 'POST', { pokemonTemplateId: species.id, ...body })).status, 400);
    }
    assert.equal((await h.request(`pokemon/${p.id}`)).body.cityId, city.id);
    assert.equal((await h.request('pokemon/all')).body.length, 1);
  } finally { h.close(); }
});

test('city residents are excluded from personal lists until explicitly assigned to me', async () => {
  const h = harness();
  try {
    const city = (await h.request('cities', 'POST', { name: 'Pallet' })).body;
    const resident = (await h.request('pokemon', 'POST', { pokemonTemplateId: species.id, cityId: city.id, rank: 'ROOKIE' })).body;
    const personal = (await h.request('pokemon', 'POST', { pokemonTemplateId: species.id })).body;
    for (const path of ['pokemon', 'pokemon/minimal']) {
      assert.deepEqual((await h.request(path)).body.map(p => p.id), [personal.id]);
    }
    assert.equal((await h.request('pokemon/all')).body.length, 2);
    assert.equal((await h.request(`pokemon/${resident.id}`)).body.cityId, city.id);
    assert.deepEqual((await h.request('pokemon/all', 'GET', undefined, 'bob')).body, []);
    assert.equal((await h.request('pokemon', 'PATCH', { id: resident.id, takeOwnership: 'yes' })).status, 400);
    assert.equal((await h.request('pokemon', 'PATCH', { id: resident.id, takeOwnership: true, cityId: city.id })).status, 400);
    assert.equal((await h.request('pokemon', 'PATCH', { id: resident.id, cityId: null, trainerId: null })).status, 400);
    await h.request('pokemon', 'PATCH', { id: resident.id, takeOwnership: true });
    for (const path of ['pokemon', 'pokemon/minimal']) {
      assert.equal((await h.request(path)).body.length, 2);
    }
    const transferred = await h.request('pokemon', 'PATCH', { id: personal.id, cityId: city.id });
    assert.equal(transferred.status, 200);
    assert.equal(transferred.body.id, personal.id);
    assert.equal(transferred.body.cityId, city.id);
    assert.equal(transferred.body.trainerId, null);
    for (const path of ['pokemon', 'pokemon/minimal']) {
      assert.deepEqual((await h.request(path)).body.map(p => p.id), [resident.id]);
    }
    const all = (await h.request('pokemon/all')).body;
    assert.equal(all.filter(p => p.id === personal.id).length, 1);
    assert.equal(all.find(p => p.id === personal.id).cityId, city.id);
  } finally { h.close(); }
});

test('cities and residents cannot be deleted until residents are transferred or taken into ownership', async () => {
  const h = harness();
  try {
    const a = (await h.request('cities', 'POST', { name: 'A' })).body;
    const b = (await h.request('cities', 'POST', { name: 'B' })).body;
    const trainer = (await h.request('trainers', 'POST', { name: 'Red' })).body;
    const first = (await h.request('pokemon', 'POST', { pokemonTemplateId: species.id, cityId: a.id })).body;
    const second = (await h.request('pokemon', 'POST', { pokemonTemplateId: species.id, cityId: b.id })).body;
    const third = (await h.request('pokemon', 'POST', { pokemonTemplateId: species.id, trainerId: trainer.id })).body;
    assert.equal((await h.request(`cities/${a.id}`, 'DELETE')).status, 409);
    assert.equal((await h.request(`pokemon/${first.id}`, 'DELETE')).status, 409);
    assert.equal((await h.request(`pokemon/${first.id}`)).body.cityId, a.id);
    assert.equal((await h.request(`pokemon/${second.id}`)).body.cityId, b.id);
    assert.equal((await h.request(`pokemon/${third.id}`)).body.trainerId, trainer.id);
    assert.equal((await h.request('pokemon/all')).body.length, 3);
    await h.request('pokemon', 'PATCH', { id: first.id, cityId: b.id });
    assert.equal((await h.request(`cities/${a.id}`, 'DELETE')).status, 200);
    await h.request('pokemon', 'PATCH', { id: first.id, takeOwnership: true });
    await h.request('pokemon', 'PATCH', { id: second.id, trainerId: trainer.id });
    assert.equal((await h.request(`cities/${b.id}`, 'DELETE')).status, 200);
    assert.equal((await h.request('pokemon')).body.length, 3);
    assert.equal((await h.request(`pokemon/${first.id}`)).body.cityId, null);
    assert.equal((await h.request(`pokemon/${second.id}`)).body.trainerId, trainer.id);
  } finally { h.close(); }
});

test('invited members see, edit, add and take residents like the creator', async () => {
  const h = harness();
  const bob = 'bob@example.com';
  try {
    const city = (await h.request('cities', 'POST', { name: 'Pallet' })).body;
    assert.deepEqual(city.members, ['alice']);
    const invite = body => h.request(`cities/${city.id}/members`, 'POST', body);
    for (const email of [undefined, '', 'bob', 'bob@', 'a b@example.com', `${'a'.repeat(250)}@example.com`]) {
      assert.equal((await invite({ email })).status, 400, String(email));
    }
    assert.equal((await h.request(`cities/${city.id}/members`, 'POST', { email: 'carol@example.com' }, 'carol@example.com')).status, 404);
    const invited = await invite({ email: '  Bob@Example.com ' });
    assert.equal(invited.status, 201);
    assert.deepEqual(invited.body.members, ['alice', bob]);
    assert.equal((await invite({ email: bob })).status, 409);
    assert.deepEqual((await h.request('cities', 'GET', undefined, 'carol@example.com')).body, []);

    const resident = (await h.request('pokemon', 'POST', { pokemonTemplateId: species.id, cityId: city.id, rank: 'ROOKIE' })).body;
    const bobCities = (await h.request('cities', 'GET', undefined, bob)).body;
    assert.deepEqual(bobCities.map(entry => [entry.id, entry.members]), [[city.id, ['alice', bob]]]);
    assert.deepEqual((await h.request('pokemon/all', 'GET', undefined, bob)).body.map(p => p.id), [resident.id]);
    assert.deepEqual((await h.request('pokemon', 'GET', undefined, bob)).body, []);

    assert.equal((await h.request('pokemon', 'PATCH', { id: resident.id, stats: { brawl: 3 } }, bob)).status, 200);
    assert.equal((await h.request(`pokemon/${resident.id}`)).body.stats.brawl, 3);
    assert.equal((await h.request(`cities/${city.id}`, 'PATCH', { assignments: { [resident.id]: 'skill:metallurgy' } }, bob)).body.skills.metallurgy, 2);
    assert.equal((await h.request(`cities/${city.id}`)).body.skills.metallurgy, 2);

    const bobs = (await h.request('pokemon', 'POST', { pokemonTemplateId: species.id }, bob)).body;
    assert.equal((await h.request('pokemon', 'PATCH', { id: bobs.id, cityId: city.id }, bob)).status, 200);
    assert.deepEqual((await h.request('pokemon', 'GET', undefined, bob)).body, []);
    assert.deepEqual((await h.request('pokemon/all')).body.map(p => p.id).sort(), [resident.id, bobs.id].sort());

    assert.equal((await h.request('pokemon', 'PATCH', { id: resident.id, takeOwnership: true }, bob)).status, 200);
    assert.deepEqual((await h.request('pokemon', 'GET', undefined, bob)).body.map(p => [p.id, p.stats.brawl]), [[resident.id, 3]]);
    assert.deepEqual((await h.request('pokemon/all')).body.map(p => p.id), [bobs.id]);
    assert.equal((await h.request(`pokemon/${resident.id}`)).status, 404);

    const trainer = (await h.request('trainers', 'POST', { name: 'Red' })).body;
    const party = await h.request('trainers', 'PATCH', { id: trainer.id, pokemonIds: [bobs.id] });
    assert.equal(party.body.pokemon[0].id, bobs.id);
    assert.deepEqual((await h.request('pokemon/all', 'GET', undefined, bob)).body.map(p => p.id), [resident.id]);
  } finally { h.close(); }
});

test('deleting a shared city leaves it; the last member deletes it once empty', async () => {
  const h = harness();
  const bob = 'bob@example.com';
  try {
    const city = (await h.request('cities', 'POST', { name: 'Pallet' })).body;
    await h.request(`cities/${city.id}/members`, 'POST', { email: bob });
    const resident = (await h.request('pokemon', 'POST', { pokemonTemplateId: species.id, cityId: city.id })).body;
    assert.deepEqual((await h.request(`cities/${city.id}`, 'DELETE')).body, { id: city.id, left: true });
    assert.deepEqual((await h.request('cities')).body, []);
    assert.deepEqual((await h.request('pokemon/all')).body, []);
    assert.equal((await h.request(`cities/${city.id}`, 'GET')).status, 404);
    const remaining = (await h.request('cities', 'GET', undefined, bob)).body;
    assert.deepEqual(remaining.map(entry => entry.members), [[bob]]);
    assert.equal((await h.request(`cities/${city.id}`, 'DELETE', undefined, bob)).status, 409);
    await h.request('pokemon', 'PATCH', { id: resident.id, takeOwnership: true }, bob);
    assert.deepEqual((await h.request(`cities/${city.id}`, 'DELETE', undefined, bob)).body, { id: city.id });
    assert.deepEqual((await h.request('cities', 'GET', undefined, bob)).body, []);
    assert.equal((await h.request('pokemon', 'GET', undefined, bob)).body.length, 1);
  } finally { h.close(); }
});

test('custom species and moves follow a shared Pokemon without sharing the campaign', async () => {
  const h = harness();
  const bob = 'bob@example.com';
  try {
    const campaign = (await h.request('campaigns', 'POST', { name: 'Secret Kanto' })).body;
    const move = (await h.request('moves', 'POST', { campaignId: campaign.id, name: 'Shadow Ember', category: 'SPECIAL' })).body;
    const ability = (await h.request('abilities', 'POST', { campaignId: campaign.id, name: 'Ember Body' })).body;
    const template = (await h.request('pokemon-templates', 'POST', {
      ...species, id: undefined, name: 'Shadow Charmander', campaignId: campaign.id,
      abilityOneId: ability.id, possibleMoves: [{ moveId: move.id, rank: 'STARTER' }],
    })).body;
    const city = (await h.request('cities', 'POST', { name: 'Pallet' })).body;
    await h.request(`cities/${city.id}/members`, 'POST', { email: bob });
    const resident = (await h.request('pokemon', 'POST', { pokemonTemplateId: template.id, cityId: city.id, moveIds: [move.id] })).body;

    const seen = (await h.request('pokemon/all', 'GET', undefined, bob)).body[0];
    assert.equal(seen.pokemonTemplate.name, 'Shadow Charmander');
    assert.equal(seen.pokemonTemplate.campaign.name, 'Secret Kanto');
    assert.equal(seen.pokemonTemplate.abilityOne.name, 'Ember Body');
    assert.deepEqual(seen.pokemonTemplate.possibleMoves.map(entry => entry.move.name), ['Shadow Ember']);
    assert.equal(seen.ability.name, 'Ember Body');
    assert.deepEqual(seen.moves.map(entry => entry.name), ['Shadow Ember']);
    assert.deepEqual((await h.request('campaigns', 'GET', undefined, bob)).body, []);
    assert.equal((await h.request(`campaigns/${campaign.id}`, 'GET', undefined, bob)).status, 404);
    assert.equal((await h.request(`pokemon-templates/${template.id}`, 'GET', undefined, bob)).status, 404);
    assert.equal((await h.request('moves', 'GET', undefined, bob)).body.some(entry => entry.id === move.id), false);

    assert.equal((await h.request('pokemon', 'PATCH', { id: resident.id, takeOwnership: true }, bob)).status, 200);
    const owned = (await h.request(`pokemon/${resident.id}`, 'GET', undefined, bob)).body;
    assert.equal(owned.pokemonTemplate.name, 'Shadow Charmander');
    assert.deepEqual(owned.moves.map(entry => entry.name), ['Shadow Ember']);
    assert.equal((await h.request('pokemon/minimal', 'GET', undefined, bob)).body[0].name, 'Shadow Charmander');
    assert.equal((await h.request('pokemon', 'PATCH', { id: resident.id, moveIds: [] }, bob)).status, 200);
    assert.equal((await h.request('pokemon', 'PATCH', { id: resident.id, moveIds: [move.id] }, bob)).status, 200);
    assert.equal((await h.request('pokemon', 'PATCH', { id: resident.id, moveIds: ['missing'] }, bob)).status, 400);
    assert.equal((await h.request('pokemon', 'PATCH', { id: resident.id, abilityId: 'missing' }, bob)).status, 400);

    // Someone who never had such a Pokemon cannot point a sheet at the private entries.
    const carol = 'carol@example.com';
    const carols = (await h.request('pokemon', 'POST', { pokemonTemplateId: species.id }, carol)).body;
    assert.equal((await h.request('pokemon', 'PATCH', { id: carols.id, moveIds: [move.id] }, carol)).status, 400);
    assert.equal((await h.request('pokemon', 'PATCH', { id: carols.id, pokemonTemplateId: template.id }, carol)).status, 400);
    assert.equal((await h.request('pokemon', 'POST', { pokemonTemplateId: template.id }, carol)).status, 400);

    assert.equal((await h.request(`pokemon-templates/${template.id}`, 'DELETE')).status, 409);
    assert.equal((await h.request(`campaigns/${campaign.id}`, 'DELETE')).status, 409);
    assert.equal((await h.request(`pokemon/${resident.id}`, 'DELETE', undefined, bob)).status, 200);
    assert.equal((await h.request(`campaigns/${campaign.id}`, 'DELETE')).status, 200);
  } finally { h.close(); }
});

test('the city members migration moves existing cities and residents under the city', () => {
  const db = new DatabaseSync(':memory:');
  try {
    migrate(db, 1, 2);
    const insert = db.prepare('INSERT INTO records (owner, collection, id, data) VALUES (?, ?, ?, ?)');
    insert.run('alice', 'cities', 'c1', JSON.stringify({ id: 'c1', name: 'Pallet' }));
    insert.run('alice', 'pokemon', 'p1', JSON.stringify({ id: 'p1', cityId: 'c1' }));
    insert.run('alice', 'pokemon', 'p2', JSON.stringify({ id: 'p2', cityId: null }));
    insert.run('alice', 'pokemon', 'p3', JSON.stringify({ id: 'p3', cityId: 'gone' }));
    insert.run('alice', 'trainers', 't1', JSON.stringify({ id: 't1' }));
    migrate(db, 3, 3);
    assert.deepEqual(db.prepare('SELECT owner, collection, id FROM records ORDER BY seq').all().map(row => ({ ...row })), [
      { owner: 'city:c1', collection: 'cities', id: 'c1' },
      { owner: 'city:c1', collection: 'pokemon', id: 'p1' },
      { owner: 'alice', collection: 'pokemon', id: 'p2' },
      { owner: 'alice', collection: 'pokemon', id: 'p3' },
      { owner: 'alice', collection: 'trainers', id: 't1' },
    ]);
    assert.deepEqual(db.prepare('SELECT city_id, email FROM city_members').all().map(row => ({ ...row })), [{ city_id: 'c1', email: 'alice' }]);
  } finally { db.close(); }
});

test('the city work skills migration carries over matching skills and turns tags into name and value', () => {
  const db = new DatabaseSync(':memory:');
  try {
    migrate(db, 1, 3);
    const insert = db.prepare('INSERT INTO records (owner, collection, id, data) VALUES (?, ?, ?, ?)');
    insert.run('city:c1', 'cities', 'c1', JSON.stringify({ id: 'c1', name: 'Pallet', skills: { brawl: 3, crafts: 2, medicine: 4, science: 5 }, tags: ['Can heal'] }));
    insert.run('city:c2', 'cities', 'c2', JSON.stringify({ id: 'c2', name: 'Viridian' }));
    insert.run('alice', 'trainers', 't1', JSON.stringify({ id: 't1', skills: { crafts: 2 } }));
    migrate(db, 4, 4);
    const data = db.prepare('SELECT data FROM records ORDER BY seq').all().map(row => JSON.parse(row.data));
    assert.deepEqual(data[0].skills, { generating_electricity: 0, mining: 0, handiwork: 2, medicine_production: 4, transporting: 0, farming: 0, planting: 0, science: 5 });
    assert.deepEqual(data[0].tags, [{ name: 'Can heal', value: 0 }]);
    assert.equal(data[1].skills.science, 0);
    assert.deepEqual(data[1].tags, []);
    assert.deepEqual(data[2], { id: 't1', skills: { crafts: 2 } });
  } finally { db.close(); }
});

test('the city string tags migration turns name and value tags back into action names', () => {
  const db = new DatabaseSync(':memory:');
  try {
    migrate(db, 1, 3);
    const insert = db.prepare('INSERT INTO records (owner, collection, id, data) VALUES (?, ?, ?, ?)');
    insert.run('city:c1', 'cities', 'c1', JSON.stringify({ id: 'c1', name: 'Pallet', tags: ['Can heal', 'Can produce food'] }));
    insert.run('city:c2', 'cities', 'c2', JSON.stringify({ id: 'c2', name: 'Viridian' }));
    migrate(db, 4, 5);
    const data = db.prepare('SELECT data FROM records ORDER BY seq').all().map(row => JSON.parse(row.data));
    assert.deepEqual(data[0].tags, ['Can heal', 'Can produce food']);
    assert.deepEqual(data[1].tags, []);
  } finally { db.close(); }
});

test('the city crafting skills migration moves assignments to the closest new skill', () => {
  const db = new DatabaseSync(':memory:');
  try {
    migrate(db, 1, 5);
    const insert = db.prepare('INSERT INTO records (owner, collection, id, data) VALUES (?, ?, ?, ?)');
    insert.run('city:c1', 'cities', 'c1', JSON.stringify({ id: 'c1', name: 'Pallet', tags: ['Can heal'], assignments: {
      a: 'skill:medicine_production', b: 'skill:farming', c: 'skill:planting', d: 'skill:handiwork', e: 'skill:generating_electricity',
      f: 'skill:mining', g: 'skill:science', h: 'skill:transporting', i: 'tag:Can heal',
    } }));
    insert.run('city:c2', 'cities', 'c2', JSON.stringify({ id: 'c2', name: 'Viridian', assignments: {} }));
    insert.run('city:c3', 'cities', 'c3', JSON.stringify({ id: 'c3', name: 'Pewter' }));
    insert.run('alice', 'pokemon', 'p1', JSON.stringify({ id: 'p1', assignments: { a: 'skill:mining' } }));
    migrate(db, 6, 6);
    const data = db.prepare('SELECT data FROM records ORDER BY seq').all().map(row => JSON.parse(row.data));
    assert.deepEqual(data[0].assignments, {
      a: 'skill:apothecary', b: 'skill:apothecary', c: 'skill:apothecary', d: 'skill:craftsmanship', e: 'skill:technology',
      f: 'skill:metallurgy', g: 'skill:research', h: 'skill:foraging', i: 'tag:Can heal',
    });
    assert.deepEqual(data[1].assignments, {});
    assert.equal(data[2].assignments, undefined);
    assert.deepEqual(data[3].assignments, { a: 'skill:mining' });
  } finally { db.close(); }
});
