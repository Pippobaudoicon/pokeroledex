import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { handleApi } from '../worker/api.ts';
import { cityTypeCounts } from '../shared/cities.ts';

const species = {
  id: 'charmander', name: 'Charmander', types: ['FIRE', 'FLYING'], baseHp: 3,
  baseStats: { vitality: 1, insight: 1 }, possibleMoves: [],
  abilityOneId: null, abilityTwoId: null, hiddenAbilityId: null, eventAbilityId: null,
};

function harness() {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE records (seq INTEGER PRIMARY KEY, owner TEXT, collection TEXT, id TEXT, data TEXT, UNIQUE(owner, collection, id))');
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
    await patch({ cityId: null });
    const unassigned = (await h.request(`pokemon/${p.id}`)).body;
    assert.equal(unassigned.cityId, null);
    assert.equal(unassigned.trainerId, null);
    assert.equal(unassigned.rank, 'ROOKIE');
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
    assert.equal((await h.request('pokemon')).body.length, 1);
  } finally { h.close(); }
});

test('deleting a city releases its residents but keeps sheets, trainers and other cities', async () => {
  const h = harness();
  try {
    const a = (await h.request('cities', 'POST', { name: 'A' })).body;
    const b = (await h.request('cities', 'POST', { name: 'B' })).body;
    const trainer = (await h.request('trainers', 'POST', { name: 'Red' })).body;
    const first = (await h.request('pokemon', 'POST', { pokemonTemplateId: species.id, cityId: a.id })).body;
    const second = (await h.request('pokemon', 'POST', { pokemonTemplateId: species.id, cityId: b.id })).body;
    const third = (await h.request('pokemon', 'POST', { pokemonTemplateId: species.id, trainerId: trainer.id })).body;
    assert.equal((await h.request(`cities/${a.id}`, 'DELETE')).status, 200);
    assert.equal((await h.request(`pokemon/${first.id}`)).body.cityId, null);
    assert.equal((await h.request(`pokemon/${second.id}`)).body.cityId, b.id);
    assert.equal((await h.request(`pokemon/${third.id}`)).body.trainerId, trainer.id);
    assert.equal((await h.request('pokemon')).body.length, 3);
    await h.request(`pokemon/${second.id}`, 'DELETE');
    assert.equal((await h.request('pokemon')).body.length, 2);
    assert.equal((await h.request(`cities/${b.id}`)).status, 200);
  } finally { h.close(); }
});
