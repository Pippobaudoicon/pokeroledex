export const HABITATS = {
  FORESTS: 'Forests',
  TROPICAL_FORESTS: 'Tropical Forests & Jungles',
  GRASSLANDS: 'Grasslands & Savannas',
  FIELDS_AND_MEADOWS: 'Fields & Meadows',
  FARMLANDS: 'Farmlands',
  GARDENS: 'Gardens',
  LAKES_AND_PONDS: 'Lakes & Ponds',
  RIVERS_AND_STREAMS: 'Rivers & Streams',
  FRESHWATER_SHORES: 'Lakeshores & Riverbanks',
  WETLANDS: 'Wetlands',
  OCEANS: 'Oceans',
  DEEP_SEAS: 'Deep Seas',
  CORAL_REEFS: 'Coral Reefs',
  SEAFLOORS: 'Seafloors',
  COASTS_AND_ISLANDS: 'Coasts, Beaches & Islands',
  ICE_AND_SNOW: 'Frozen Areas & Glaciers',
  SNOWY_MOUNTAINS: 'Snowy Mountains',
  ICY_CAVES: 'Icy Caves',
  POLAR_SEAS: 'Polar Seas',
  TUNDRA_AND_TAIGA: 'Tundra & Boreal Forests',
  MOUNTAINS: 'Mountains & Peaks',
  ROCKY_AREAS: 'Rocky Areas & Cliffs',
  CAVES_AND_UNDERGROUND: 'Caves & Underground',
  DESERTS: 'Deserts',
  BADLANDS_AND_SCRUBLANDS: 'Badlands, Scrublands & Wastelands',
  VOLCANOES: 'Volcanoes',
  URBAN_AREAS: 'Settlements & Buildings',
  POWER_PLANTS: 'Power Plants & Electrical Areas',
  ABANDONED_PLACES: 'Ruins, Cemeteries & Abandoned Buildings',
  OUTER_SPACE: 'Outer Space',
  OTHER_DIMENSIONS: 'Other Dimensions & Ultra Space',
} as const;

export type SpecificHabitat = keyof typeof HABITATS;

export const HABITAT_ALIASES = {
  BADLANDS_SCRUBLANDS_AND_WASTELANDS: 'BADLANDS_AND_SCRUBLANDS',
  BEACHES: 'COASTS_AND_ISLANDS',
  CAVES: 'CAVES_AND_UNDERGROUND',
  CITIES: 'URBAN_AREAS',
  ELECTROMAGNETICALLY_ACTIVE_AREAS: 'POWER_PLANTS',
  GLACIERS_MOUNTAIN_PEAKS_AND_ICY_CAVES: 'ICE_AND_SNOW',
  GRASSLANDS_SAVANNAS_PLAINS_AND_PRAIRIES: 'GRASSLANDS',
  LAKES: 'LAKES_AND_PONDS',
  LAKESIDES_AND_RIVERSIDES: 'FRESHWATER_SHORES',
  OCEANIC_ABYSSES: 'DEEP_SEAS',
  OPEN_OCEAN_AND_THE_CONTINENTAL_SHELF: 'OCEANS',
  PONDS: 'LAKES_AND_PONDS',
  RUINS_AND_CEMETERIES: 'ABANDONED_PLACES',
  STREAMS_AND_RIVERS: 'RIVERS_AND_STREAMS',
  SWAMPS_BOGS_AND_MARSHES: 'WETLANDS',
  TEMPERATE_DECIDUOUS_FORESTS: 'FORESTS',
  TROPICAL_JUNGLES: 'TROPICAL_FORESTS',
  TROPICAL_SEAS_AND_CORAL_REEFS: 'CORAL_REEFS',
  TUNDRAS_AND_BOREAL_FORESTS: 'TUNDRA_AND_TAIGA',
  WOODLANDS: 'FORESTS',
  PLAINS: 'GRASSLANDS',
  SAVANNAS: 'GRASSLANDS',
  PRAIRIES: 'GRASSLANDS',
  FIELDS: 'FIELDS_AND_MEADOWS',
  MEADOWS: 'FIELDS_AND_MEADOWS',
  JUNGLES: 'TROPICAL_FORESTS',
  SWAMPS: 'WETLANDS',
  MARSHES: 'WETLANDS',
  BOGS: 'WETLANDS',
  RIVERS: 'RIVERS_AND_STREAMS',
  STREAMS: 'RIVERS_AND_STREAMS',
  RIVERBANKS: 'FRESHWATER_SHORES',
  LAKESHORES: 'FRESHWATER_SHORES',
  COASTS: 'COASTS_AND_ISLANDS',
  ISLANDS: 'COASTS_AND_ISLANDS',
  MOUNTAIN_PEAKS: 'MOUNTAINS',
  GLACIERS: 'ICE_AND_SNOW',
  TUNDRAS: 'TUNDRA_AND_TAIGA',
  CLIFFS: 'ROCKY_AREAS',
  BADLANDS: 'BADLANDS_AND_SCRUBLANDS',
  SCRUBLANDS: 'BADLANDS_AND_SCRUBLANDS',
  WASTELANDS: 'BADLANDS_AND_SCRUBLANDS',
  HOUSES: 'URBAN_AREAS',
  BUILDINGS: 'URBAN_AREAS',
  ABANDONED_BUILDINGS: 'ABANDONED_PLACES',
  RUINS: 'ABANDONED_PLACES',
  CEMETERIES: 'ABANDONED_PLACES',
  UNDERGROUND: 'CAVES_AND_UNDERGROUND',
  ULTRA_SPACE: 'OTHER_DIMENSIONS',
  DISTORTION_WORLD: 'OTHER_DIMENSIONS',
  COLD_AREAS: 'ICE_AND_SNOW',
  ULTRA_DEEP_SEA: 'OTHER_DIMENSIONS',
  ULTRA_JUNGLE: 'OTHER_DIMENSIONS',
  ULTRA_DESERT: 'OTHER_DIMENSIONS',
  ULTRA_PLANT: 'OTHER_DIMENSIONS',
  ULTRA_CRATER: 'OTHER_DIMENSIONS',
  ULTRA_RUIN: 'OTHER_DIMENSIONS',
} as const satisfies Record<string, SpecificHabitat>;

/** Legacy values remain readable in the base data and saved campaign templates. */
export type Habitat = SpecificHabitat | keyof typeof HABITAT_ALIASES;

export const HABITAT_MACROS = {
  FOREST: { name: 'Forests', habitats: ['FORESTS', 'TROPICAL_FORESTS'] },
  OPEN_LAND: { name: 'Open Land', habitats: ['GRASSLANDS', 'FIELDS_AND_MEADOWS', 'FARMLANDS', 'GARDENS'] },
  WATER: { name: 'Water & Coasts', habitats: ['LAKES_AND_PONDS', 'RIVERS_AND_STREAMS', 'FRESHWATER_SHORES', 'WETLANDS', 'OCEANS', 'DEEP_SEAS', 'CORAL_REEFS', 'SEAFLOORS', 'COASTS_AND_ISLANDS'] },
  ICE: { name: 'Ice & Snow', habitats: ['ICE_AND_SNOW', 'SNOWY_MOUNTAINS', 'ICY_CAVES', 'POLAR_SEAS', 'TUNDRA_AND_TAIGA'] },
  HIGHLANDS: { name: 'Mountains & Underground', habitats: ['MOUNTAINS', 'ROCKY_AREAS', 'CAVES_AND_UNDERGROUND'] },
  ARID: { name: 'Arid & Volcanic', habitats: ['DESERTS', 'BADLANDS_AND_SCRUBLANDS', 'VOLCANOES'] },
  SETTLEMENTS: { name: 'Settlements & Ruins', habitats: ['URBAN_AREAS', 'POWER_PLANTS', 'ABANDONED_PLACES'] },
  OTHERWORLDLY: { name: 'Otherworldly', habitats: ['OUTER_SPACE', 'OTHER_DIMENSIONS'] },
} as const satisfies Record<string, { name: string; habitats: readonly SpecificHabitat[] }>;

export type HabitatMacro = keyof typeof HABITAT_MACROS;
export type HabitatFilter = Habitat | HabitatMacro;

export const habitatMacroIds = Object.keys(HABITAT_MACROS) as HabitatMacro[];
export const specificHabitatIds = Object.keys(HABITATS) as SpecificHabitat[];

export const isHabitat = (value: unknown): value is Habitat => typeof value === 'string' &&
  (Object.hasOwn(HABITATS, value) || Object.hasOwn(HABITAT_ALIASES, value));
export const isHabitatFilter = (value: unknown): value is HabitatFilter =>
  isHabitat(value) || typeof value === 'string' && Object.hasOwn(HABITAT_MACROS, value);

export function normalizeHabitat(habitat: Habitat): SpecificHabitat {
  if (Object.hasOwn(HABITAT_ALIASES, habitat)) return HABITAT_ALIASES[habitat as keyof typeof HABITAT_ALIASES];
  if (Object.hasOwn(HABITATS, habitat)) return habitat as SpecificHabitat;
  throw new Error(`Unknown habitat ${habitat}`);
}

export const normalizeHabitats = (habitats: readonly Habitat[]): SpecificHabitat[] =>
  [...new Set(habitats.map(normalizeHabitat))].sort();

export const habitatName = (habitat: HabitatFilter): string => Object.hasOwn(HABITAT_MACROS, habitat)
  ? HABITAT_MACROS[habitat as HabitatMacro].name : HABITATS[normalizeHabitat(habitat as Habitat)];

export function habitatMacros(habitats: readonly Habitat[]): HabitatMacro[] {
  const normalized = normalizeHabitats(habitats);
  return habitatMacroIds.filter(macro => HABITAT_MACROS[macro].habitats.some(habitat => normalized.includes(habitat)));
}

export function matchesHabitats(habitats: readonly Habitat[], filters: readonly HabitatFilter[] = []): boolean {
  if (!filters.length) return true;
  const normalized = normalizeHabitats(habitats);
  return filters.some(filter => Object.hasOwn(HABITAT_MACROS, filter)
    ? HABITAT_MACROS[filter as HabitatMacro].habitats.some(habitat => normalized.includes(habitat))
    : normalized.includes(normalizeHabitat(filter as Habitat)));
}

export interface HabitatSource {
  url: string;
  revisionId: number;
  sections: string[];
}

export interface PokemonHabitatEntry {
  templateId: string;
  dexID: string;
  number: number;
  name: string;
  habitats: Habitat[];
  status: 'documented' | 'inherited' | 'needs-review' | 'not-applicable';
  source?: HabitatSource;
  inheritedFrom?: string;
  reviewReason?: string;
}

export function replaceHabitats<T extends { id: string; dexID: string; habitats: Habitat[] }>(
  templates: T[], entries: PokemonHabitatEntry[],
): T[] {
  const byId = new Map<string, PokemonHabitatEntry>();
  for (const entry of entries) {
    if (byId.has(entry.templateId)) throw new Error(`Duplicate habitat entry: ${entry.templateId}`);
    if (!['documented', 'inherited', 'needs-review', 'not-applicable'].includes(entry.status)) {
      throw new Error(`Invalid habitat status for ${entry.name}`);
    }
    for (const habitat of entry.habitats) {
      normalizeHabitat(habitat);
    }
    if ((entry.status === 'documented' || entry.status === 'inherited') &&
        (!entry.source || !Number.isSafeInteger(entry.source.revisionId) || entry.source.revisionId < 1 ||
          !entry.source.sections.length || !entry.habitats.length)) throw new Error(`Incomplete habitat evidence for ${entry.name}`);
    if (entry.status === 'inherited' && !entry.inheritedFrom) throw new Error(`Missing habitat parent for ${entry.name}`);
    byId.set(entry.templateId, entry);
  }
  return templates.map(template => {
    const entry = byId.get(template.id);
    if (!entry || entry.dexID !== template.dexID) throw new Error(`Missing or stale habitat entry for ${template.id}; run pnpm habitats:refresh.`);
    return {
      ...template,
      habitats: normalizeHabitats(entry.status === 'needs-review' ? template.habitats : entry.habitats),
      habitatProvenance: { ...entry, habitats: normalizeHabitats(entry.habitats) },
    };
  });
}

export function habitatCatalog(templates: { habitats: Habitat[] }[]) {
  const normalized = templates.map(template => normalizeHabitats(template.habitats));
  return specificHabitatIds.map(id => ({
    id, name: HABITATS[id],
    macroId: habitatMacroIds.find(macro => HABITAT_MACROS[macro].habitats.some(habitat => habitat === id))!,
    pokemonCount: normalized.filter(habitats => habitats.includes(id)).length,
  }));
}

export function habitatMacroCatalog(templates: { habitats: Habitat[] }[]) {
  return habitatMacroIds.map(id => ({
    id, name: HABITAT_MACROS[id].name, habitats: HABITAT_MACROS[id].habitats,
    pokemonCount: templates.filter(template => matchesHabitats(template.habitats, [id])).length,
  }));
}
