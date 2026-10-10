// Copies your Pokémon sheets, trainers, campaigns and campaign custom moves, abilities,
// items and Pokémon templates from pokeroledex.nl into an SQL file for this app's D1
// database. The old API embeds referenced records; this app stores their ids instead
// (worker/api.ts). Re-running it overwrites the imported records, nothing else.
//
//   POKEROLEDEX_TOKEN=<token> node scripts/import-pokeroledex.ts
//   pnpm exec wrangler d1 execute pokeroledex --remote --file .wrangler/import.sql
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

type Json = Record<string, any>;

const token = process.env.POKEROLEDEX_TOKEN?.trim().replace(/^bearer\s+/i, '');
if (!token) throw new Error('Set POKEROLEDEX_TOKEN to the access token of a logged-in pokeroledex.nl request (see README).');

async function api(path: string, body?: Json): Promise<any> {
  const response = await fetch(`https://pokeroledex.nl/api${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`);
  return response.json();
}

const reference = (name: string): Json[] => JSON.parse(readFileSync(new URL(`../data/reference/${name}.json`, import.meta.url), 'utf8'));
const scoped = ({ campaign, ...record }: Json): Json => ({ ...record, campaignId: campaign?.id ?? record.campaignId });

const campaigns: Json[] = (await api('/campaigns') as Json[]).filter(campaign => !campaign.isCore)
  .map(campaign => ({ allowedUserIds: [], ...campaign, userId: 'local-user', isCore: false }));
const campaignIds = new Set(campaigns.map(campaign => campaign.id));

const custom: Record<string, Json[]> = { moves: [], abilities: [], 'pokemon-templates': [] };
for (const campaign of campaigns) for (const name of Object.keys(custom)) {
  const records: Json[] = await api(`/${name}/all/${campaign.id}`, { includeCore: false });
  custom[name].push(...records.filter(record => (record.campaign?.id ?? record.campaignId) === campaign.id).map(scoped));
}
const templates = custom['pokemon-templates'].map(({ abilityOne, abilityTwo, hiddenAbility, eventAbility, possibleMoves, ...template }): Json => ({
  ...template,
  abilityOneId: abilityOne?.id ?? null, abilityTwoId: abilityTwo?.id ?? null,
  hiddenAbilityId: hiddenAbility?.id ?? null, eventAbilityId: eventAbility?.id ?? null,
  possibleMoves: (possibleMoves ?? []).map(({ move, ...entry }: Json) => ({ ...entry, moveId: move?.id ?? entry.moveId })),
}));
const items = (await api('/items') as Json[]).filter(item => campaignIds.has(item.campaign?.id ?? item.campaignId)).map(scoped);

const pokemon: Json[] = [];
for (const { id } of await api('/pokemon/minimal') as Json[]) {
  const { pokemonTemplate, ability, nature, heldItem, trainer, moves, ...sheet } = await api(`/pokemon/${id}`);
  pokemon.push({ ...sheet, userId: 'local-user', pokemonTemplateId: pokemonTemplate?.id ?? sheet.pokemonTemplateId,
    moveIds: (moves ?? []).map((move: Json) => move.id), abilityId: ability?.id ?? null, natureId: nature?.id ?? null,
    heldItemId: heldItem?.id ?? null, trainerId: trainer?.id ?? sheet.trainerId ?? null });
}

// Inventory entries point at a known item by id; anything else is kept as an inline custom item.
const itemIds = new Set([...reference('items'), ...items].map(item => item.id));
const trainers = (await api('/trainers') as Json[]).map(({ nature, pokemon: team, inventory, ...trainer }): Json => {
  for (const member of team ?? []) {
    const sheet = pokemon.find(sheet => sheet.id === member.id);
    if (sheet) sheet.trainerId = trainer.id;
  }
  return { ...trainer, userId: 'local-user', natureId: nature?.id ?? trainer.natureId ?? null,
    inventory: (inventory ?? []).map(({ item, ...entry }: Json) => {
      if (!item) return entry;
      if (itemIds.has(item.id)) return { ...entry, itemId: item.id };
      const { id, hash, campaign, quantity, ...fields } = item;
      return { ...entry, ...fields };
    }) };
});

// Sheets that point at core data newer than data/reference/ would break the My Pokémon page.
const known = new Set([...['pokemon-templates', 'moves', 'abilities', 'items', 'natures'].flatMap(reference),
  ...custom.moves, ...custom.abilities, ...templates, ...items].map(record => record.id));
const missing = new Set(pokemon.flatMap(sheet => [sheet.pokemonTemplateId, ...sheet.moveIds, sheet.abilityId, sheet.natureId, sheet.heldItemId])
  .filter(id => id && !known.has(id)));
if (missing.size) console.warn(`Unknown ids, refresh data/reference/ first (scripts/capture-reference.py): ${[...missing].join(', ')}`);

const collections = { campaigns, moves: custom.moves, abilities: custom.abilities, items, 'pokemon-templates': templates, trainers, pokemon };
const text = (value: string) => `'${value.replaceAll("'", "''")}'`;
const statements = Object.entries(collections).flatMap(([name, records]) => records.map(record =>
  `INSERT INTO records (collection, id, data) VALUES (${text(name)}, ${text(record.id)}, ${text(JSON.stringify(record))}) ` +
  'ON CONFLICT (collection, id) DO UPDATE SET data = excluded.data;'));
mkdirSync(new URL('../.wrangler/', import.meta.url), { recursive: true });
writeFileSync(new URL('../.wrangler/import.sql', import.meta.url), statements.join('\n') + '\n');
for (const [name, records] of Object.entries(collections)) console.log(`${name}: ${records.length}`);
console.log('Wrote .wrangler/import.sql');
