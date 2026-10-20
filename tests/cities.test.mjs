import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { handleApi } from '../worker/api.ts';
import { cityRankGroups, cityTypeCounts } from '../shared/cities.ts';
import { POKEMON_TYPES } from '../shared/types.ts';

const species = {
  id: 'charmander', name: 'Charmander', types: ['FIRE', 'FLYING'], baseHp: 3,
  baseStats: { vitality: 1, insight: 1 }, possibleMoves: [],
  abilityOneId: null, abilityTwoId: null, hiddenAbilityId: null, eventAbilityId: null,
};

const migrationsDir = new URL('../migrations/', import.meta.url);
function migrate(db, from = 1, until = Infinity) {
  for (const file of readdirSync(migrationsDir).filter(file => file.endsWith('.sql')).sort()) {
    const number = Number.parseInt(file, 10);
    if (number >= from && number <= until) db.exec(readFileSync(new URL(file, migrationsDir), 'utf8'));
  }
}

function harness() {
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
        return Response.json(name === 'pokemon-templates.json' ? [species] : name === 'rankup-attributes.json' ? {} : []);
      },
    },
  };
  return {
    close: () => db.close(),
    async request(path, method = 'GET', body = undefined, owner = 'alice') {
      const url = new URL(`https://local.test/api/${path}`);
      const request = new Request(url, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      const response = await handleApi(request, env, url, owner);
      return { status: response.status, body: await response.json() };
    },
  };
}

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

test('city CRUD persists separate cities, skills and tags, and protects ownership', async () => {
  const h = harness();
  try {
    const first = await h.request('cities', 'POST', { name: '  Pallet Town  ' });
    assert.equal(first.status, 201);
    assert.equal(first.body.name, 'Pallet Town');
    assert.equal(first.body.skills.science, 0);
    const second = await h.request('cities', 'POST', { name: 'Viridian City' });
    assert.notEqual(first.body.id, second.body.id);
    const path = `cities/${first.body.id}`;
    const updated = await h.request(path, 'PATCH', {
      name: 'New Pallet', skills: { science: 5, brawl: 2, nature: 3 },
      tags: [' Can heal ', 'Can heal', 'Can produce food'], userId: 'mallory', id: 'changed',
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.id, first.body.id);
    assert.equal(updated.body.userId, 'alice');
    assert.equal(updated.body.skills.science, 5);
    assert.equal(updated.body.skills.nature, 3);
    assert.deepEqual(updated.body.tags, ['Can heal', 'Can produce food']);
    assert.equal((await h.request(path)).body.name, 'New Pallet');
    assert.equal((await h.request('cities')).body.length, 2);
    assert.deepEqual((await h.request('cities', 'GET', undefined, 'bob')).body, []);
    for (const method of ['GET', 'PATCH', 'DELETE']) {
      assert.equal((await h.request(path, method, method === 'PATCH' ? { name: 'Stolen' } : undefined, 'bob')).status, 404);
    }
  } finally { h.close(); }
});

test('city validation rejects malformed names, skill ratings, tags and request bodies', async () => {
  const h = harness();
  try {
    for (const body of [
      null, [], { name: '' }, { name: ' ' }, { name: 'a'.repeat(101) },
      { name: 'Test', skills: null }, { name: 'Test', skills: [] },
      ...[-1, 6, 1.5, '3'].map(science => ({ name: 'Test', skills: { science } })),
      { name: 'Test', skills: { nonexistent: 2 } },
      { name: 'Test', tags: [3] }, { name: 'Test', tags: [' '] },
      { name: 'Test', tags: ['a'.repeat(81)] }, { name: 'Test', tags: Array(51).fill('heal') },
    ]) assert.equal((await h.request('cities', 'POST', body)).status, 400, JSON.stringify(body));
    assert.deepEqual((await h.request('cities')).body, []);
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
    await h.request('pokemon', 'PATCH', { id: personal.id, cityId: city.id });
    assert.deepEqual((await h.request('pokemon/minimal')).body.map(p => p.id), [resident.id]);
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
    assert.equal((await h.request(`cities/${city.id}`, 'PATCH', { skills: { science: 4 } }, bob)).body.skills.science, 4);
    assert.equal((await h.request(`cities/${city.id}`)).body.skills.science, 4);

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
