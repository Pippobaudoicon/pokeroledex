// Copies a user's Pokémon sheets, trainers, campaigns and campaign custom moves,
// abilities, items and Pokémon templates from pokeroledex.nl. The old API embeds
// referenced records; this app stores their ids instead (worker/api.ts). Its CORS
// rules only allow pokeroledex.nl itself, so this runs here rather than in the page.
import type { Reference } from './reference.ts';

type Json = Record<string, any>;

export async function fetchOldData(token: string, owner: string, reference: Reference) {
  async function api(path: string, body?: Json): Promise<any> {
    const response = await fetch(`https://pokeroledex.nl/api${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body && JSON.stringify(body),
    });
    if (response.status === 401) throw new Error('pokeroledex.nl did not accept the login token. It expires after a day; grab a new one.');
    if (!response.ok) throw new Error(`pokeroledex.nl answered ${path} with ${response.status}.`);
    return response.json();
  }
  const scoped = ({ campaign, ...record }: Json): Json => ({ ...record, campaignId: campaign?.id ?? record.campaignId });

  const campaigns: Json[] = (await api('/campaigns') as Json[]).filter(campaign => !campaign.isCore)
    .map(campaign => ({ allowedUserIds: [], ...campaign, userId: owner, isCore: false }));
  const campaignIds = new Set(campaigns.map(campaign => campaign.id));

  // Moves and items come in one request. The old API has no such request for abilities,
  // and its template list leaves out the moves, so those are fetched per campaign.
  const selection = { campaignIds: [...campaignIds], includeCore: false };
  const ofCampaigns = (records: Json[]) => records.filter(record => campaignIds.has(record.campaign?.id ?? record.campaignId)).map(scoped);
  const moves = ofCampaigns(await api('/moves/campaigns', selection));
  const items = ofCampaigns(await api('/items/campaigns', selection));
  const abilities: Json[] = [], customTemplates: Json[] = [];
  for (const campaign of campaigns) {
    const ofCampaign = (records: Json[]) => records.filter(record => (record.campaign?.id ?? record.campaignId) === campaign.id).map(scoped);
    abilities.push(...ofCampaign(await api(`/abilities/all/${campaign.id}`, { includeCore: false })));
    customTemplates.push(...ofCampaign(await api(`/pokemon-templates/all/${campaign.id}`, { includeCore: false })));
  }
  const templates = customTemplates.map(({ abilityOne, abilityTwo, hiddenAbility, eventAbility, possibleMoves, ...template }): Json => ({
    ...template,
    abilityOneId: abilityOne?.id ?? null, abilityTwoId: abilityTwo?.id ?? null,
    hiddenAbilityId: hiddenAbility?.id ?? null, eventAbilityId: eventAbility?.id ?? null,
    possibleMoves: (possibleMoves ?? []).map(({ move, ...entry }: Json) => ({ ...entry, moveId: move?.id ?? entry.moveId })),
  }));

  // Core data newer than data/reference/ is unknown here. A sheet of an unknown species would
  // break the My Pokémon page, so it is skipped; unknown moves and the like are only reported.
  const known = new Set([...reference['pokemon-templates'], ...reference.moves, ...reference.abilities, ...reference.items,
    ...reference.natures, ...moves, ...abilities, ...templates, ...items].map(record => record.id));
  const pokemon = (await api('/pokemon') as Json[]).map(({ pokemonTemplate, ability, nature, heldItem, trainer, moves, ...sheet }): Json => ({
    ...sheet, userId: owner, pokemonTemplateId: pokemonTemplate?.id ?? sheet.pokemonTemplateId,
    moveIds: (moves ?? []).map((move: Json) => move.id), abilityId: ability?.id ?? null, natureId: nature?.id ?? null,
    heldItemId: heldItem?.id ?? null, trainerId: trainer?.id ?? sheet.trainerId ?? null,
  }));
  const missing = [...new Set(pokemon.flatMap(sheet => [sheet.pokemonTemplateId, ...sheet.moveIds, sheet.abilityId, sheet.natureId, sheet.heldItemId])
    .filter(id => id && !known.has(id)))];
  const sheets = pokemon.filter(sheet => known.has(sheet.pokemonTemplateId));

  // Inventory entries point at a known item by id; anything else is kept as an inline custom item.
  const itemIds = new Set([...reference.items, ...items].map(item => item.id));
  const trainers = (await api('/trainers') as Json[]).map(({ nature, pokemon: team, inventory, ...trainer }): Json => {
    for (const member of team ?? []) {
      const sheet = sheets.find(sheet => sheet.id === member.id);
      if (sheet) sheet.trainerId = trainer.id;
    }
    return { ...trainer, userId: owner, natureId: nature?.id ?? trainer.natureId ?? null,
      inventory: (inventory ?? []).map(({ item, ...entry }: Json) => {
        if (!item) return entry;
        if (itemIds.has(item.id)) return { ...entry, itemId: item.id };
        const { id, hash, campaign, quantity, ...fields } = item;
        return { ...entry, ...fields };
      }) };
  });

  return {
    collections: { campaigns, moves, abilities, items, 'pokemon-templates': templates, trainers, pokemon: sheets },
    missing, skipped: pokemon.length - sheets.length,
  };
}
