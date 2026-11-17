import assert from 'node:assert/strict';
import { test } from 'node:test';
import { campaignRecipe, checkCraftSettings, craftItem, craftKey, defaultCraft, isUnlocked, parseCraftKey, researchNeeds, TIERS } from '../shared/crafting.ts';

const campaign = { id: 'c1', name: 'Johto Plus' };

test('recipe keys keep item IDs and prefix the other kinds', () => {
  assert.equal(craftKey('item', 'relic'), 'relic');
  assert.equal(craftKey('move', 'm1'), 'move:m1');
  for (const kind of ['item', 'move', 'ability', 'pokemon']) assert.deepEqual(parseCraftKey(craftKey(kind, 'x:1')), { kind, id: 'x:1' });
  assert.deepEqual(parseCraftKey('potion'), { kind: 'item', id: 'potion' });
});

test('always-research recipes need steps even at tiers 1 and 2', () => {
  assert.equal(researchNeeds({ tier: 1 }), TIERS[1].research);
  assert.deepEqual(researchNeeds({ tier: 1, alwaysResearch: true }), { steps: 1, minResearch: 1 });
  assert.deepEqual(researchNeeds({ tier: 2, alwaysResearch: true }), { steps: 2, minResearch: 2 });
  assert.deepEqual(researchNeeds({ tier: 5, alwaysResearch: true }), TIERS[5].research);
  const recipe = defaultCraft('ability', { id: 'a', name: 'A', craft: { tier: 1 } });
  const tier1 = campaignRecipe('ability', { id: 'a', name: 'A', craft: { tier: 1 } });
  assert.equal(recipe.tier, 5);
  assert.equal(isUnlocked(tier1, {}), false);
  assert.equal(isUnlocked(tier1, { 'ability:a': 1 }), true);
});

test('default campaign recipes follow move power, ability rarity and Pokemon rank', () => {
  const move = (damagePower, category = 'PHYSICAL') => defaultCraft('move', { id: 'm', name: 'M', type: 'FIRE', damagePower, category });
  assert.equal(move('0').tier, 3);
  assert.equal(move('3', 'SUPPORT').tier, 3);
  assert.equal(move('1').tier, 2);
  assert.equal(move('4').tier, 3);
  assert.equal(move('12').tier, 7);
  assert.deepEqual(move('4').catalyst, ['FIRE']);
  assert.equal(move('4').skill, 'technology');
  assert.equal(move('4').itemId, 'move:m');
  assert.deepEqual(move('4').assist, { skill: 'research', min: 2 });
  assert.deepEqual(campaignRecipe('move', { id: 'm', name: 'M', type: 'FIRE', damagePower: '4', category: 'PHYSICAL', craft: { tier: 1 } }).assist,
    { skill: 'research', min: 1 }, 'the assist follows the edited tier');
  assert.equal(defaultCraft('ability', { id: 'a', name: 'A' }).tier, 5);
  const pokemon = (recommendedRank, legendary = false) => defaultCraft('pokemon', { id: 'p', name: 'P', types: ['GRASS', 'TYPELESS'], recommendedRank, legendary });
  assert.equal(pokemon('STARTER').tier, 1);
  assert.equal(pokemon('ACE').tier, 6);
  assert.equal(pokemon('STARTER', true).tier, 8);
  assert.equal(pokemon('STARTER').skill, 'archaeology');
  assert.deepEqual(pokemon('STARTER').catalyst, ['GRASS']);
  const item = defaultCraft('item', { id: 'i', name: 'Relic', pocket: 'TRAINER_ITEMS', category: null, trainerPrice: 100 });
  assert.equal(item.itemId, 'i');
  assert.equal(item.alwaysResearch, undefined);
});

test('campaign editor settings change tier, skill, catalyst and craftable', () => {
  const entry = { id: 'm', name: 'M', type: 'FIRE', damagePower: '4', category: 'PHYSICAL' };
  const recipe = campaignRecipe('move', { ...entry, craft: { tier: 6, skill: 'metallurgy', catalyst: null, craftable: false } });
  assert.equal(recipe.tier, 6);
  assert.equal(recipe.skill, 'metallurgy');
  assert.equal(recipe.catalyst, null);
  assert.equal(recipe.craftable, false);
  assert.deepEqual(recipe.costs, { metallurgy: TIERS[6].effort });
  assert.deepEqual(campaignRecipe('move', { ...entry, craft: { catalyst: ['WATER', 'ICE'] } }).catalyst, ['WATER', 'ICE']);
  assert.deepEqual(campaignRecipe('move', { ...entry, craft: null }), defaultCraft('move', entry));
});

test('crafting settings are validated', () => {
  assert.deepEqual(checkCraftSettings(undefined), { craft: null });
  assert.deepEqual(checkCraftSettings({}), { craft: null });
  assert.deepEqual(checkCraftSettings({ tier: 3, catalyst: ['FIRE', 'FIRE'] }), { craft: { tier: 3, catalyst: ['FIRE'] } });
  assert.deepEqual(checkCraftSettings({ catalyst: null }), { craft: { catalyst: null } });
  for (const input of [[], 'x', { tier: 0 }, { tier: 2.5 }, { skill: 'research' }, { catalyst: ['NOPE'] }, { craftable: 'yes' }]) {
    assert.ok('error' in checkCraftSettings(input), JSON.stringify(input));
  }
});

test('campaign entries are crafted as themselves, TMs, Ability Capsules and residents', () => {
  const tm = craftItem('move', { id: 'm', name: 'Ember Rush', effect: 'Burns.' }, campaign);
  assert.equal(tm.id, 'move:m');
  assert.equal(tm.name, 'TM · Ember Rush');
  assert.equal(tm.pocket, 'TECHNICAL_MACHINE');
  assert.equal(tm.description, 'Burns.');
  assert.equal(craftItem('ability', { id: 'a', name: 'Warm Up' }, campaign).name, 'Ability Capsule · Warm Up');
  const pokemon = craftItem('pokemon', { id: 'p', name: 'Emberling', image: 'emberling.png' }, campaign);
  assert.equal(pokemon.name, 'Emberling');
  assert.equal(pokemon.image, 'emberling.png');
  const relic = craftItem('item', { id: 'i', name: 'Relic', craft: { tier: 2 } }, campaign);
  assert.equal(relic.id, 'i');
  assert.equal(relic.craft, undefined);
  assert.equal(relic.campaign, campaign);
});
