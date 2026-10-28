import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { CITY_SKILLS, CRAFTING_SKILLS, TIERS, countSuccesses, craftBlockers, craftPool, itemRecipe, speciesOverrides, workProfile } from '../shared/crafting.ts';
import { cityLimits } from '../shared/cities.ts';
import { RANKS } from '../shared/types.ts';

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const items = read('../data/reference/items.json');
const templates = read('../data/reference/pokemon-templates.json');
const itemExceptions = read('../data/crafting-items.json');
const speciesExceptions = read('../data/crafting-species.json');
const overrides = speciesOverrides(templates, speciesExceptions);
const profileOf = name => workProfile(templates.find(t => t.name === name), overrides.get(name));
const recipeOf = name => {
  const item = items.find(i => i.name === name);
  return itemRecipe(item, itemExceptions[name]);
};

test('a species starts from its types and attributes', () => {
  const stats = { strength: 3, dexterity: 3, vitality: 3, special: 3, insight: 3 };
  assert.deepEqual(workProfile({ name: 'x', types: ['GRASS', 'POISON'], maxStats: stats }),
    { apothecary: 'full', craftsmanship: 'half', nursing: 'half', foraging: 'half' });
  // 6+ raises half to full, 7+ opens a skill the types do not cover.
  assert.equal(workProfile({ name: 'x', types: ['GRASS'], maxStats: { ...stats, dexterity: 6 } }).craftsmanship, 'full');
  assert.equal(workProfile({ name: 'x', types: ['GRASS'], maxStats: { ...stats, strength: 6 } }).metallurgy, undefined);
  assert.equal(workProfile({ name: 'x', types: ['GRASS'], maxStats: { ...stats, strength: 7 } }).metallurgy, 'half');
  assert.deepEqual(workProfile({ name: 'x', types: ['GRASS'], maxStats: stats }, { apothecary: null, technology: 'full' }).technology, 'full');
});

test('Oddish can make an Antidote but not a Greatball', () => {
  assert.equal(profileOf('Oddish').apothecary, 'full');
  assert.equal(profileOf('Oddish').technology, undefined);
  assert.equal(recipeOf('Antidote').skill, 'apothecary');
  assert.equal(recipeOf('Greatball').skill, 'technology');
});

test('line exceptions reach every evolution and form; own entries win', () => {
  for (const name of ['Porygon', 'Porygon2', 'Porygon-Z']) assert.equal(profileOf(name).technology, 'full', name);
  assert.equal(profileOf('Rotom (Wash Form)').technology, 'full');
  const resolved = speciesOverrides([
    { id: 'a', name: 'A', types: [], evolutions: [{ type: 'TO', targetId: 'b', kind: 'LEVEL' }] },
    { id: 'b', name: 'B', types: [], evolutions: [{ type: 'FROM', targetId: 'a', kind: 'LEVEL' }] },
  ], { B: { skills: { nursing: null } }, A: { line: true, skills: { nursing: 'full', research: 'half' } } });
  assert.deepEqual(resolved.get('A'), { nursing: 'full', research: 'half' });
  assert.deepEqual(resolved.get('B'), { nursing: null, research: 'half' });
});

test('every species can work at least one crafting skill', () => {
  const idle = templates.filter(t => !CRAFTING_SKILLS.some(skill => workProfile(t, overrides.get(t.name))[skill]));
  assert.deepEqual(idle.map(t => t.name), []);
});

test('items get a skill, tier, catalyst and assist', () => {
  assert.deepEqual(recipeOf('Fire Stone'), { itemId: recipeOf('Fire Stone').itemId, skill: 'metallurgy', tier: 5, catalyst: ['FIRE'], assist: null, craftable: true });
  assert.deepEqual(recipeOf('Water Gem').catalyst, ['WATER']);
  assert.deepEqual(recipeOf('Firium Z').catalyst, ['FIRE']);
  assert.deepEqual(recipeOf('Splash Plate').catalyst, ['WATER']);
  assert.deepEqual(recipeOf('Charizardite X').catalyst, ['FIRE', 'FLYING']);
  assert.equal(recipeOf('Charizardite X').skill, 'archaeology');
  assert.equal(recipeOf('Pokeball').tier, 1);
  assert.equal(recipeOf('Greatball').tier, 2);
  assert.equal(recipeOf('Ultraball').tier, 3);
  assert.equal(recipeOf('TM - High Power').tier, 8);
  assert.deepEqual(recipeOf('TM - Basic').assist, { skill: 'research', min: 3 });
  assert.equal(recipeOf('Ice Heal').catalyst, null);
  assert.equal(recipeOf('Masterball').craftable, false);
});

test('assist skills add dice and gate the recipe; strong recipes need strong catalysts', () => {
  const skills = Object.fromEntries(CITY_SKILLS.map(skill => [skill, 0]));
  const tm = recipeOf('TM - Basic');
  assert.deepEqual([tm.skill, tm.tier, tm.assist], ['technology', 7, { skill: 'research', min: 3 }]);
  const city = { rank: 'MASTER', skills: { ...skills, technology: 8, research: 2 }, catalysts: {}, research: { [tm.itemId]: 12 } };
  assert.deepEqual(craftBlockers(tm, city), ['Needs Research 3.']);
  city.skills.research = 7;
  assert.deepEqual(craftBlockers(tm, city), []);
  assert.equal(craftPool(tm, city.skills), 10, '8 Technology + 2 dice from Research 7');

  const charizardite = recipeOf('Charizardite X');
  const strong = { rank: 'MASTER', skills: { ...skills, archaeology: 8, research: 5 }, catalysts: { FLYING: 2 }, research: { [charizardite.itemId]: 12 } };
  assert.deepEqual(craftBlockers(charizardite, strong), ['Needs a Fire or Flying Catalyst of strength 3.']);
  strong.catalysts.FLYING = 3;
  assert.deepEqual(craftBlockers(charizardite, strong), []);
  assert.equal(countSuccesses([1, 3, 4, 6]), 2);
});

test('tier N needs rank N, and its minimums fit that rank\'s skill cap', () => {
  for (const [tier, { minRank, minSkill, research }] of Object.entries(TIERS)) {
    assert.equal(minRank, RANKS[Number(tier)]);
    assert.ok(minSkill <= cityLimits(minRank).skill, `tier ${tier} skill`);
    assert.ok((research?.minResearch ?? 0) <= cityLimits(minRank).skill, `tier ${tier} research`);
  }
});

test('exceptions only name reference items and species', () => {
  for (const name of Object.keys(itemExceptions)) assert.ok(items.some(i => i.name === name), name);
  for (const name of Object.keys(speciesExceptions)) assert.ok(templates.some(t => t.name === name), name);
});
