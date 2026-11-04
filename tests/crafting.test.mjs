import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { CITY_SKILLS, CRAFTING_SKILLS, RECIPE_LIMITS, TIERS, checkCityRecipe, cityRecipe, countSuccesses, craftBlockers, itemRecipe, orderCost, orderRoom, orderUsage, overCapacity, speciesOverrides, workProfile } from '../shared/crafting.ts';
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
  assert.deepEqual(recipeOf('Fire Stone'), {
    itemId: recipeOf('Fire Stone').itemId, skill: 'metallurgy', tier: 5, catalyst: ['FIRE'], assist: null, craftable: true, costs: { metallurgy: 2 }, yield: 1,
  });
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

test('assist skills gate the recipe; strong recipes need strong catalysts', () => {
  const skills = Object.fromEntries(CITY_SKILLS.map(skill => [skill, 0]));
  const tm = recipeOf('TM - Basic');
  assert.deepEqual([tm.skill, tm.tier, tm.assist], ['technology', 7, { skill: 'research', min: 3 }]);
  const city = { rank: 'MASTER', skills: { ...skills, technology: 8, research: 2 }, catalysts: {}, research: { [tm.itemId]: 12 } };
  assert.deepEqual(craftBlockers(tm, city), ['Needs Research 3.']);
  city.skills.research = 7;
  assert.deepEqual(craftBlockers(tm, city), []);

  const charizardite = recipeOf('Charizardite X');
  const strong = { rank: 'MASTER', skills: { ...skills, archaeology: 8, research: 5 }, catalysts: { FLYING: 2 }, research: { [charizardite.itemId]: 12 } };
  assert.deepEqual(craftBlockers(charizardite, strong), ['Needs a Fire or Flying Catalyst of strength 3.']);
  strong.catalysts.FLYING = 3;
  assert.deepEqual(craftBlockers(charizardite, strong), []);
  assert.equal(countSuccesses([1, 3, 4, 6]), 2);
});

test('a crafting order fills each skill\'s value, each item using its tier\'s effort', () => {
  const skills = { ...Object.fromEntries(CITY_SKILLS.map(skill => [skill, 0])), apothecary: 3, technology: 5 };
  const potion = { skill: 'apothecary', tier: 1 };
  const ball = { skill: 'technology', tier: 4 };
  assert.deepEqual([orderCost(potion), orderCost(ball), orderCost({ skill: 'archaeology', tier: 8 })], [1, 2, 4]);
  const usage = orderUsage([{ recipe: potion, quantity: 2 }, { recipe: ball, quantity: 2 }]);
  assert.deepEqual(usage, { apothecary: 2, craftsmanship: 0, technology: 4, metallurgy: 0, archaeology: 0 });
  assert.equal(orderRoom(potion, skills, usage), 1, 'Apothecary 3 holds one more potion');
  assert.equal(orderRoom(ball, skills, usage), 0, 'one Technology point left, a tier 4 item needs 2');
  assert.deepEqual(overCapacity(skills, usage), []);
  assert.deepEqual(overCapacity({ ...skills, technology: 3 }, usage), ['technology'], 'a resident moved off the skill');
  assert.equal(orderRoom(ball, { ...skills, technology: 3 }, usage), 0, 'room never goes negative');
});

test('a city\'s recipe edits change the tier, the skills one craft uses and the items it makes', () => {
  const potion = recipeOf('Potion');
  assert.deepEqual([potion.skill, potion.costs, potion.yield], ['apothecary', { apothecary: TIERS[potion.tier].effort }, 1]);
  assert.equal(cityRecipe(potion, undefined), potion);

  // A new tier alone moves the costs to that tier's effort.
  const tier6 = cityRecipe(potion, { tier: 6 });
  assert.deepEqual([tier6.tier, tier6.costs, tier6.edited], [6, { apothecary: 3 }, true]);

  // Two skills per craft, two items per craft: both skills limit the room and gate the recipe.
  const shared = cityRecipe(potion, { tier: 1, costs: { apothecary: 2, technology: 1 }, yield: 2 });
  assert.deepEqual([shared.skill, shared.yield], ['apothecary', 2]);
  const skills = { ...Object.fromEntries(CITY_SKILLS.map(skill => [skill, 0])), apothecary: 6, technology: 2 };
  const usage = orderUsage([{ recipe: shared, quantity: 1 }]);
  assert.deepEqual(usage, { apothecary: 2, craftsmanship: 0, technology: 1, metallurgy: 0, archaeology: 0 });
  assert.equal(orderRoom(shared, skills, usage), 1, 'Technology 2 holds only one more');
  const city = { rank: 'STARTER', skills: { ...skills, technology: 0 }, catalysts: {}, research: {} };
  assert.deepEqual(craftBlockers(shared, city), ['Needs Technology 1.']);
  assert.deepEqual(craftBlockers(shared, { ...city, skills: { ...skills, apothecary: 1 } }), ['Needs Apothecary 2.']);

  // Without its own skill, the first skill it uses becomes its skill.
  assert.equal(cityRecipe(potion, { costs: { metallurgy: 1 } }).skill, 'metallurgy');
  assert.equal(cityRecipe(recipeOf('Masterball'), { tier: 1 }).tier, recipeOf('Masterball').tier, 'uncraftable recipes stay as they are');
});

test('recipe edits are checked and keep only what differs from the default', () => {
  const potion = recipeOf('Potion');
  assert.deepEqual(checkCityRecipe(potion, null), { recipe: null });
  assert.deepEqual(checkCityRecipe(potion, { tier: potion.tier, costs: { ...potion.costs, technology: 0 }, yield: 1 }), { recipe: null });
  assert.deepEqual(checkCityRecipe(potion, { tier: 6, costs: { apothecary: 3 }, yield: 2 }), { recipe: { tier: 6, yield: 2 } }, 'tier 6 effort is 3');
  assert.deepEqual(checkCityRecipe(potion, { costs: { apothecary: 1, metallurgy: 2 } }), { recipe: { costs: { apothecary: 1, metallurgy: 2 } } });
  for (const input of [{ tier: 0 }, { tier: 9 }, { tier: 1.5 }, { yield: 0 }, { yield: 100 }, { costs: {} }, { costs: { apothecary: 0 } },
    { costs: { research: 1 } }, { costs: { apothecary: RECIPE_LIMITS.cost + 1 } }, { costs: [] }, 'tier', []]) {
    assert.ok('error' in checkCityRecipe(potion, input), JSON.stringify(input));
  }
  assert.ok('error' in checkCityRecipe(recipeOf('Masterball'), { yield: 2 }));
  assert.equal(RECIPE_LIMITS.cost, cityLimits('CHAMPION').skill, 'the highest skill cap');
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
