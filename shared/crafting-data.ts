// The hand-tuned crafting exceptions (docs/crafting-plan.md), bundled into both the app and the
// Worker so they compute the same work profiles and recipes.
import items from '../data/crafting-items.json' with { type: 'json' };
import species from '../data/crafting-species.json' with { type: 'json' };
import { speciesOverrides, workProfile, type ItemExceptions, type SkillOverrides, type SpeciesExceptions } from './crafting.ts';
import type { WorkProfile } from './types.ts';

export const ITEM_EXCEPTIONS = items as ItemExceptions;
export const SPECIES_EXCEPTIONS = species as SpeciesExceptions;

type Species = Parameters<typeof workProfile>[0];
const resolved = new WeakMap<readonly Species[], Map<string, SkillOverrides>>();

/** A species' work profile with its exceptions; `dex` is the species list that line exceptions spread through. */
export function speciesWorkProfile(template: Species, dex: readonly Species[]): WorkProfile {
  let overrides = resolved.get(dex);
  if (!overrides) resolved.set(dex, overrides = speciesOverrides([...dex], SPECIES_EXCEPTIONS));
  return workProfile(template, overrides.get(template.name));
}
