import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { extractHabitats, plainWiki, formMatches } from '../scripts/habitat-extraction.ts';
import {
  HABITATS, HABITAT_ALIASES, HABITAT_MACROS, habitatMacroIds, specificHabitatIds,
  habitatCatalog, habitatMacroCatalog, habitatMacros, matchesHabitats, normalizeHabitats, replaceHabitats,
} from '../shared/habitats.ts';
import { matchesEncounterFilters } from '../shared/encounters.ts';

const source = { url: 'https://bulbapedia.bulbagarden.net/wiki/Example', revisionId: 1, sections: ['Biology'] };
const template = { id: 'example', dexID: '1', habitats: ['CITIES'] };
const entry = { templateId: 'example', dexID: '1', number: 1, name: 'Example', habitats: ['FORESTS'], status: 'documented', source };

test('replacement overrides rather than merges habitats, preserving unrelated fields and input', () => {
  const [result] = replaceHabitats([{ ...template, name: 'Example' }], [entry]);
  assert.deepEqual(result.habitats, ['FORESTS']);
  assert.deepEqual(result.habitatProvenance, entry);
  assert.equal(result.name, 'Example');
  assert.deepEqual(template.habitats, ['CITIES']);
});

test('review entries keep default habitats and inherited entries expose their origin', () => {
  const review = { ...entry, status: 'needs-review', habitats: [], reviewReason: 'Unclear habitat' };
  assert.deepEqual(replaceHabitats([template], [review])[0].habitats, ['URBAN_AREAS']);
  const inherited = { ...entry, status: 'inherited', inheritedFrom: 'Example' };
  assert.deepEqual(replaceHabitats([template], [inherited])[0].habitatProvenance, inherited);
  assert.deepEqual(replaceHabitats([template], [{ ...entry, status: 'not-applicable', habitats: [] }])[0].habitats, []);
});

test('replacement rejects missing, stale, duplicate, unknown and unsupported overrides', () => {
  assert.throws(() => replaceHabitats([template], []), /Missing or stale/);
  assert.throws(() => replaceHabitats([template], [{ ...entry, dexID: '2' }]), /Missing or stale/);
  assert.throws(() => replaceHabitats([template], [entry, entry]), /Duplicate/);
  assert.throws(() => replaceHabitats([template], [{ ...entry, habitats: ['MADE_UP'] }]), /Unknown habitat/);
  assert.throws(() => replaceHabitats([template], [{ ...entry, source: undefined }]), /Incomplete/);
  assert.throws(() => replaceHabitats([template], [{ ...entry, status: 'inherited' }]), /Missing habitat parent/);
  assert.throws(() => replaceHabitats([template], [{ ...entry, status: 'invalid' }]), /Invalid habitat status/);
});

test('extraction normalizes habitat links and synonyms without copying prose', () => {
  const wiki = `==Biology==
Example lives in {{DL|List of Pokémon by habitat|Forest Pokémon|forests}} and grasslands.
It inhabits forests, savannahs and a snowy mountain peak.
==Game data==
===Pokédex entries===
{{Dex/Header|type=Grass}}
{{Dex/Entry1|v=Red|entry=It is found in [[cave]]s.}}
===Game locations===
Example lives in oceans.
==In animation==
Example lives in deserts.`;
  const facts = extractHabitats(wiki, 'Example');
  assert.deepEqual([...new Set(facts.map(fact => fact.habitat))].sort(),
    ['CAVES', 'FORESTS', 'GRASSLANDS', 'SAVANNAS', 'SNOWY_MOUNTAINS']);
  assert.equal(facts.filter(fact => fact.habitat === 'FORESTS').length, 1);
  assert.ok(facts.every(fact => !('text' in fact)));
  assert.equal(plainWiki('{{p|Example}} lives in [[Forest|forests]].<ref>citation</ref>'), 'Example lives in forests.');
});

test('regional sections do not leak into base species, and specific habitats replace broad matches', () => {
  const wiki = `==Biology==
Example lives in plains.
===Forms===
Example has a regional form: Alolan Example.
In the Alola region, Example has adapted to snowy mountain peaks.
Alolan Example lives in icy caves.
===Evolution===
Example evolves in forests.`;
  const facts = extractHabitats(wiki, 'Example');
  assert.deepEqual(facts.filter(fact => !fact.form).map(fact => fact.habitat), ['PLAINS']);
  assert.deepEqual(facts.filter(fact => fact.form === 'Alolan').map(fact => fact.habitat), ['SNOWY_MOUNTAINS', 'ICY_CAVES']);
  assert.equal(formMatches('Alolan Example', 'Example (Alolan Form)'), true);
  assert.equal(formMatches('Galarian Example', 'Example (Alolan Form)'), false);
});

test('extractor avoids negation, unrelated species, battles and feeding locations', () => {
  const wiki = `==Biology==
Example is not found in deserts.
Its predator lives in oceans.
Example attacks foes found in caves.
As seen in The Movie, Example can survive in outer space.
It steals the lives of people hiking in mountains.
It lives in forests and feeds on fish from rivers.
It lives in grasslands where its prey inhabits swamps.`;
  assert.deepEqual(extractHabitats(wiki, 'Example').map(fact => fact.habitat), ['FORESTS', 'GRASSLANDS']);
  assert.deepEqual(extractHabitats('==Biology==\nMr. Mime is found in suburban areas.', 'Mr. Mime').map(fact => fact.habitat), ['URBAN_AREAS']);
});

test('multiple location clauses are inspected, without treating named Ultra worlds as ocean biomes', () => {
  const facts = extractHabitats(`==Biology==
This Pokémon is rarely found in the wild, but it has been known to inhabit grasslands.
Example is found in the Ultra Deep Sea.`, 'Example');
  assert.deepEqual(facts.map(fact => fact.habitat), ['GRASSLANDS', 'ULTRA_DEEP_SEA']);
});

test('Pokedex form switches and generation resets keep regional habitats separate', () => {
  const wiki = `==Game data==
===Pokédex entries===
{{Dex/Header|type=Fire}}
{{Dex/Gen/1|gen=VII}}
{{Dex/Entry1|entry=It lives in plains.}}
{{Dex/Form|Alolan Form}}
{{Dex/Entry1|entry=It lives in snowy mountains.}}
{{Dex/Gen/1|gen=VIII}}
{{Dex/Entry1|entry=It lives in forests.}}
{{Dex/Form|Galarian Form}}
{{Dex/Entry1|entry=It lives in caves.}}`;
  const facts = extractHabitats(wiki, 'Example');
  assert.deepEqual(facts.map(({ habitat, form }) => [habitat, form]), [
    ['PLAINS', null], ['SNOWY_MOUNTAINS', 'Alolan Form'], ['FORESTS', null], ['CAVES', 'Galarian Form'],
  ]);
});

test('encounter filtering uses the replacement habitats and still matches any selection', () => {
  const [species] = replaceHabitats([{ ...template, name: 'Example', number: 1, types: ['GRASS'], recommendedRank: 'STARTER', legendary: false }], [entry]);
  assert.equal(matchesEncounterFilters(species, { habitats: ['FORESTS'] }), true);
  assert.equal(matchesEncounterFilters(species, { habitats: ['CITIES'] }), false);
  assert.equal(matchesEncounterFilters(species, { habitats: ['CITIES', 'FORESTS'] }), true);
});

test('encounter filtering includes variants unless explicitly excluded', () => {
  const variant = {
    ...template,
    id: 'regional',
    dexID: '19A',
    number: 19,
    name: 'Rattata (Alolan Form)',
    types: ['DARK'],
    recommendedRank: 'STARTER',
    legendary: false,
  };
  assert.equal(matchesEncounterFilters(variant, {}), true);
  assert.equal(matchesEncounterFilters(variant, { excludeForms: false }), true);
  assert.equal(matchesEncounterFilters(variant, { excludeForms: true }), false);
});

test('stored habitat data covers every reference entry with a unique, consistent catalog', () => {
  const read = name => JSON.parse(readFileSync(new URL(`../data/reference/${name}.json`, import.meta.url), 'utf8'));
  const templates = read('pokemon-templates');
  const entries = read('pokemon-habitats');
  const catalog = read('habitats');
  assert.equal(entries.length, templates.length);
  assert.equal(new Set(entries.map(value => value.templateId)).size, templates.length);
  const effective = replaceHabitats(templates, entries);
  assert.deepEqual(catalog, habitatCatalog(effective));
  assert.deepEqual(read('habitat-macros'), habitatMacroCatalog(effective));
  assert.equal(catalog.length, 31);
  for (const habitat of catalog) {
    assert.equal(habitat.name, HABITATS[habitat.id]);
    assert.equal(habitat.pokemonCount, effective.filter(value => value.habitats.includes(habitat.id)).length);
  }
  for (const value of entries) {
    if (value.number > 0) {
      assert.ok(value.source, `Missing source for ${value.name}`);
      assert.ok(value.source.revisionId > 0);
    }
    if (value.status === 'needs-review') assert.ok(value.reviewReason);
    assert.deepEqual(value.habitats, normalizeHabitats(value.habitats));
  }
  const named = name => entries.find(value => value.name === name);
  assert.deepEqual(named('Bulbasaur').habitats, ['FORESTS', 'GRASSLANDS']);
  assert.deepEqual(named('Rattata').habitats, ['GRASSLANDS']);
  assert.deepEqual(named('Rattata (Alolan Form)').habitats, ['URBAN_AREAS']);
  assert.deepEqual(named('Vulpix').habitats, ['GRASSLANDS']);
  assert.deepEqual(named('Vulpix (Alolan Form)').habitats, ['SNOWY_MOUNTAINS']);
  assert.deepEqual(named('Gengar').habitats, ['CAVES_AND_UNDERGROUND']);
  assert.deepEqual(named('Nihilego').habitats, ['OTHER_DIMENSIONS']);
  assert.equal(named('Venusaur (Mega Form)').status, 'inherited');
  assert.equal(named('Mewtwo').status, 'needs-review');
});

test('eight macro habitats partition the 31 canonical specifics with no aliases or duplicate memberships', () => {
  assert.equal(habitatMacroIds.length, 8);
  assert.equal(specificHabitatIds.length, 31);
  const children = Object.values(HABITAT_MACROS).flatMap(macro => macro.habitats);
  assert.deepEqual([...children].sort(), [...specificHabitatIds].sort());
  assert.equal(new Set(children).size, children.length);
  assert.ok(Object.keys(HABITAT_ALIASES).every(id => !Object.hasOwn(HABITATS, id)));
});

test('synonyms normalize idempotently and deduplicate, including all legacy categories', () => {
  const examples = [
    [['FORESTS', 'WOODLANDS', 'TEMPERATE_DECIDUOUS_FORESTS'], ['FORESTS']],
    [['PLAINS', 'PRAIRIES', 'SAVANNAS', 'GRASSLANDS_SAVANNAS_PLAINS_AND_PRAIRIES'], ['GRASSLANDS']],
    [['BOGS', 'SWAMPS', 'MARSHES', 'SWAMPS_BOGS_AND_MARSHES'], ['WETLANDS']],
    [['RIVERS', 'STREAMS', 'STREAMS_AND_RIVERS'], ['RIVERS_AND_STREAMS']],
    [['BUILDINGS', 'HOUSES', 'CITIES', 'URBAN_AREAS'], ['URBAN_AREAS']],
    [['COLD_AREAS', 'GLACIERS', 'GLACIERS_MOUNTAIN_PEAKS_AND_ICY_CAVES'], ['ICE_AND_SNOW']],
  ];
  for (const [input, expected] of examples) {
    assert.deepEqual(normalizeHabitats(input), expected);
    assert.deepEqual(normalizeHabitats(normalizeHabitats(input)), expected);
  }
  for (const [alias, target] of Object.entries(HABITAT_ALIASES)) assert.deepEqual(normalizeHabitats([alias]), [target]);
  assert.throws(() => normalizeHabitats(['ICE']), /Unknown habitat/);
  assert.throws(() => normalizeHabitats(['INVALID']), /Unknown habitat/);
});

test('macro matching accepts aliases and mixed selections without classifying ordinary mountains as ice', () => {
  for (const habitat of ['GLACIERS', 'COLD_AREAS', 'ICY_CAVES', 'SNOWY_MOUNTAINS', 'POLAR_SEAS']) {
    assert.equal(matchesHabitats([habitat], ['ICE']), true, habitat);
  }
  for (const habitat of ['MOUNTAINS', 'MOUNTAIN_PEAKS', 'CAVES']) {
    assert.equal(matchesHabitats([habitat], ['ICE']), false, habitat);
    assert.equal(matchesHabitats([habitat], ['HIGHLANDS']), true, habitat);
  }
  assert.equal(matchesHabitats(['FORESTS'], ['WOODLANDS']), true);
  assert.equal(matchesHabitats(['WOODLANDS'], ['FORESTS']), true);
  assert.equal(matchesHabitats(['PLAINS'], ['ICE', 'GRASSLANDS']), true);
  assert.equal(matchesHabitats(['CITIES'], ['FOREST', 'WATER']), false);
  assert.equal(matchesHabitats([], []), true);
  assert.equal(matchesHabitats([], ['ICE']), false);
  assert.deepEqual(habitatMacros(['SNOWY_MOUNTAINS', 'POLAR_SEAS', 'MOUNTAINS']), ['ICE', 'HIGHLANDS']);
});

test('catalog counts unique Pokemon, not synonym occurrences or summed macro children', () => {
  const templates = [{ habitats: ['FORESTS', 'WOODLANDS', 'TROPICAL_FORESTS'] }, { habitats: ['TEMPERATE_DECIDUOUS_FORESTS'] }];
  const specifics = habitatCatalog(templates);
  assert.equal(specifics.find(habitat => habitat.id === 'FORESTS').pokemonCount, 2);
  assert.equal(specifics.find(habitat => habitat.id === 'FORESTS').macroId, 'FOREST');
  assert.equal(habitatMacroCatalog(templates).find(macro => macro.id === 'FOREST').pokemonCount, 2);
  assert.equal(habitatMacroCatalog(templates).find(macro => macro.id === 'ICE').pokemonCount, 0);
});

test('encounters match macro or normalized specifics for legacy campaign habitats', () => {
  const species = { ...template, number: 1, name: 'Example', types: ['ICE'], recommendedRank: 'STARTER', legendary: false, habitats: ['GLACIERS'] };
  assert.equal(matchesEncounterFilters(species, { habitats: ['ICE'] }), true);
  assert.equal(matchesEncounterFilters(species, { habitats: ['ICE_AND_SNOW'] }), true);
  assert.equal(matchesEncounterFilters(species, { habitats: ['FOREST'] }), false);
});
