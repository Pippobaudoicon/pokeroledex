import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { encounterMovePools } from '../src/lib/encounter-moves.ts';
import { charmToAllure } from '../shared/moves.ts';

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const moveStats = ['accuracy1', 'accuracy2', 'damage1', 'damage2'];
const moves = read('../data/reference/moves.json');
const templates = read('../data/reference/pokemon-templates.json');

test('move formulas use Allure instead of Charm in reference records', () => {
  const usesCharm = value => moveStats.some(stat => typeof value[stat] === 'string' && /\bcharm\b/i.test(value[stat]));
  assert.deepEqual(moves.filter(usesCharm).map(move => move.name), []);
  assert.equal(templates.some(template => template.possibleMoves.some(({ move }) => usesCharm(move))), false);
});

test('Allure contributes its skill value to move pools', () => {
  const move = moves.find(({ name }) => name === 'Draining Kiss');
  const pokemon = {
    stats: { vitality: 0, allure: 3 },
    pokemonTemplate: {
      baseStats: { vitality: 4 },
      types: [],
    },
  };

  assert.equal(encounterMovePools(move, pokemon).accuracy, '7');
});

test('custom moves that name Charm are read and saved as Allure', () => {
  const move = charmToAllure({ name: 'Homebrew', accuracy1: 'Cute', accuracy2: 'Brawl/charm', damage1: 'Charm', damage2: '', effect: 'Charm the foe.' });
  assert.equal(move.accuracy2, 'Brawl/Allure');
  assert.equal(move.damage1, 'Allure');
  assert.equal(move.effect, 'Charm the foe.');
});
