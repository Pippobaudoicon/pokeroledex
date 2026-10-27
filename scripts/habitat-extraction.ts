import type { Habitat } from '../shared/habitats.ts';

// Match habitat nouns only in clauses that describe where a Pokemon lives.
const rules: [Habitat, RegExp][] = [
  ['ULTRA_DEEP_SEA', /\bUltra Deep Sea\b/],
  ['ULTRA_JUNGLE', /\bUltra Jungle\b/],
  ['ULTRA_DESERT', /\bUltra Desert\b/],
  ['ULTRA_PLANT', /\bUltra Plant\b/],
  ['ULTRA_CRATER', /\bUltra Crater\b/],
  ['ULTRA_RUIN', /\bUltra Ruin\b/],
  ['TROPICAL_FORESTS', /\b(?:tropical|rain)\s*forests?\b/i],
  ['SNOWY_MOUNTAINS', /\b(?:snow(?:y|[- ]capped|[- ]covered)|icy|frozen)\s+mountain(?:s| peaks?)?\b/i],
  ['MOUNTAIN_PEAKS', /\bmountain ?(?:tops?|peaks?)\b/i],
  ['ICY_CAVES', /\b(?:icy|ice|frozen)\s+caves?\b/i],
  ['DEEP_SEAS', /\b(?:deep[- ]sea|deep[- ]ocean|ocean depths|depths of the (?:sea|ocean)|deep (?:seas?|oceans?))\b/i],
  ['CORAL_REEFS', /\b(?:coral )?reefs?\b/i],
  ['SEAFLOORS', /\b(?:sea ?floor|ocean floor|sea ?bed)s?\b/i],
  ['ABANDONED_BUILDINGS', /\b(?:abandoned|deserted|derelict)\s+(?:buildings?|houses?|mansions?)\b/i],
  ['POWER_PLANTS', /\bpower (?:plants?|stations?)\b/i],
  ['FORESTS', /\bforests?\b/i], ['WOODLANDS', /\bwoodlands?\b/i],
  ['GRASSLANDS', /\bgrasslands?\b/i], ['PLAINS', /\b(?:grassy )?plains?\b/i],
  ['SAVANNAS', /\bsavannah?s?\b/i], ['PRAIRIES', /\bprairies\b/i],
  ['FIELDS', /\bfields?\b/i], ['MEADOWS', /\bmeadows?\b/i],
  ['JUNGLES', /\bjungles?\b/i], ['SWAMPS', /\bswamps?\b/i],
  ['MARSHES', /\bmarsh(?:es|lands?)?\b/i], ['BOGS', /\bbogs?\b/i],
  ['WETLANDS', /\bwetlands?\b/i], ['RIVERBANKS', /\briver ?(?:banks?|sides?)\b/i],
  ['LAKESHORES', /\blake ?(?:shores?|sides?)\b/i], ['RIVERS', /\brivers?\b/i],
  ['STREAMS', /\bstreams?\b/i], ['LAKES', /\blakes?\b/i], ['PONDS', /\bponds?\b/i],
  ['OCEANS', /\b(?:oceans?|seas?)\b/i], ['BEACHES', /\bbeach(?:es)?\b/i],
  ['COASTS', /\b(?:coasts?|coastlines?|seashores?|seaside|coastal (?:areas?|regions?|waters?))\b/i],
  ['ISLANDS', /\bislands?\b/i], ['MOUNTAINS', /\b(?:mountains?|mountainous (?:areas?|regions?))\b/i],
  ['GLACIERS', /\bglaciers?\b/i], ['TUNDRAS', /\btundras?\b/i],
  ['CLIFFS', /\bcliffs?\b/i], ['ROCKY_AREAS', /\b(?:rocky|rough)[- ](?:areas?|terrains?|regions?|environments?)\b/i],
  ['DESERTS', /\bdeserts?\b/i], ['BADLANDS', /\bbadlands?\b/i],
  ['SCRUBLANDS', /\bscrublands?\b/i], ['WASTELANDS', /\bwastelands?\b/i],
  ['CAVES', /\bcav(?:es?|erns?)\b/i], ['VOLCANOES', /\b(?:volcano(?:es|s)?|volcanic (?:areas?|regions?))\b/i],
  ['URBAN_AREAS', /\b(?:urban|suburban|residential)\s+(?:areas?|environments?|regions?)\b/i],
  ['CITIES', /\b(?:cities|towns|villages)\b/i], ['HOUSES', /\b(?:houses?|homes?)\b/i],
  ['BUILDINGS', /\b(?:buildings?|mansions?)\b/i], ['RUINS', /\bruins\b/i],
  ['CEMETERIES', /\b(?:cemeteries|graveyards?|burial grounds?)\b/i],
  ['FARMLANDS', /\b(?:farmlands?|farms?|rice paddies|orchards?)\b/i],
  ['GARDENS', /\bgardens?\b/i], ['UNDERGROUND', /\b(?:underground|under the ground)\b/i],
  ['OUTER_SPACE', /\b(?:outer space|the moon)\b/i], ['ULTRA_SPACE', /\bUltra Space\b/],
  ['DISTORTION_WORLD', /\bDistortion World\b/],
  ['OTHER_DIMENSIONS', /\b(?:another|different|other|own|separate|alternate)\s+(?:dimensions?|realms?)\b/i],
  ['COLD_AREAS', /\b(?:cold|frigid|freezing)\s+(?:areas?|regions?|environments?|places?)\b/i],
];

export function plainWiki(text: string): string {
  text = text.replace(/<!--[\s\S]*?-->/g, '').replace(/<ref\b[^>]*>[\s\S]*?<\/ref>|<ref\b[^>]*\/>/gi, '');
  text = text.replace(/\[\[(?:File|Image):[^\n]*?\]\]/gi, '');
  text = text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target: string, label?: string) => label ?? target.split('#')[0]);
  // Resolve innermost templates first, including habitat links and Pokemon names.
  for (let pass = 0; pass < 8 && /\{\{[^{}]*\}\}/.test(text); pass++) {
    text = text.replace(/\{\{([^{}]*)\}\}/g, (_, value: string) => {
      const [tag, ...args] = value.split('|');
      if (['p', 'rf', 'r', 'a', 'm', 'wp'].includes(tag.toLowerCase())) return args.at(-1) ?? '';
      if (['dl', 'color2', 'color', 'tt', 'obp'].includes(tag.toLowerCase())) return tag.toLowerCase() === 'dl' ? args.at(-1) ?? '' : args[0] ?? '';
      if (tag.toLowerCase() === 'pkmn') return args.at(-1) ?? 'Pokémon';
      if (tag.toLowerCase() === 'pdex') return args.at(-1) ?? '';
      return '';
    });
  }
  return text.replace(/<[^>]*>/g, '').replace(/\[https?:\/\/\S+\s*([^\]]*)\]/g, '$1')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&[a-z]+;/gi, ' ')
    .replace(/'{2,5}/g, '').replace(/[ \t]+/g, ' ');
}

export interface Evidence { habitat: Habitat; section: string; form: string | null }

export function extractHabitats(wikitext: string, species: string): Evidence[] {
  const evidence: Evidence[] = [];
  let section = '';
  let form: string | null = null;
  let inForms = false;
  let inEntries = false;
  for (const line of wikitext.split('\n')) {
    const heading = line.match(/^(={2,5})\s*(.*?)\s*\1\s*$/);
    if (heading) {
      const level = heading[1].length;
      const title = plainWiki(heading[2]).trim();
      if (level === 2) { section = title; inForms = false; form = null; inEntries = false; }
      if (level === 3 && section === 'Biology') {
        inForms = title === 'Forms';
        form = null;
        if (title !== 'Forms') section = '';
      }
      if (section === 'Biology' && inForms && level >= 4) form = title;
      if (level === 3 && title === 'Pokédex entries') { inEntries = true; form = null; }
      else if (level === 3) inEntries = false;
      continue;
    }
    if (section !== 'Biology' && !inEntries) continue;
    if (/^\{\{Dex\/Header/i.test(line)) {
      const label = plainWiki(line.match(/\|form=([^|}]+)/)?.[1] ?? '').trim();
      form = label || null;
    }
    if (inEntries && /^\{\{Dex\/Gen\//i.test(line)) form = null;
    if (inEntries && /^\{\{Dex\/Form\|/i.test(line)) {
      const label = plainWiki(line.match(/^\{\{Dex\/Form\|([^|}]+)/i)?.[1] ?? '').trim();
      form = label === species ? null : label || null;
    }
    // Dex/Entry templates have one line per entry, with the factual text in entry=.
    const entry = inEntries ? line.match(/\|entry=(.*)/)?.[1].replace(/\}\}\s*$/, '') : undefined;
    if (inEntries && !entry) continue;
    const text = plainWiki(entry ?? line).trim();
    if (!text || text.startsWith('|') || text.startsWith('{')) continue;
    if (inForms) {
      const regional = text.match(/^In (?:the )?(Alola|Galar|Hisui|Paldea)(?: region)?\b/);
      if (regional) form = ({ Alola: 'Alolan', Galar: 'Galarian', Hisui: 'Hisuian', Paldea: 'Paldean' })[regional[1]] ?? null;
    }
    for (const sentence of text.split(/(?<!\bMr)(?<!\bJr)[.!?]\s+/)) {
      // Discard hypothetical, negative, battle-only and comparison statements.
      if (/\b(?:not|never|no longer|used to|once lived|unlike|rather than|instead of|except|opponents?|foes?|attack|battle)\b/i.test(sentence)) continue;
      const locations = sentence.matchAll(/\b(?:lives?|living|inhabits?|dwells?|dwelling|resides?|residing|native to|found (?:in|on|near|at|around|within)|(?:is|are|be|been|often|usually|sometimes|commonly) seen (?:in|on|near|at)|makes? (?:its|their) (?:home|nest) (?:in|on)|adapted to|moved to|settles? in|prefers? (?:to live |living )?in)\b/gi);
      for (const location of locations) {
        const prefix = sentence.slice(0, location.index).trim();
        const subject = `(?:${escapeRegExp(species)}|it|they|this pokémon|these pokémon)`;
        const qualifiers = '(?:(?:is|are|can|be|been|being|has|have|had|was|were|also|only|usually|often|primarily|mainly|generally|typically|sometimes|commonly|rarely|occasionally|normally|even|said|known|thought|believed|to|still|tends|tend|mostly|frequently|most)\\s+)*';
        if (prefix && !new RegExp(`\\b${subject}\\s+${qualifiers}$`, 'i').test(`${prefix} `)) continue;
        const inlineForm = sentence.match(/\b(Alolan|Galarian|Hisuian|Paldean)\b/)?.[1];
        const scope = inlineForm ?? form;
        let remaining = sentence.slice(location.index + location[0].length)
          .split(/\b(?:where|which|but|because|while|when|and (?:it|they|feeds?|eats?|hunts?|can|has|is))\b/i)[0];
        for (const [habitat, pattern] of rules) {
          if (!pattern.test(remaining)) continue;
          evidence.push({ habitat, section: inEntries ? 'Pokédex entries' : 'Biology', form: scope });
          remaining = remaining.replace(pattern, '');
        }
      }
    }
  }
  return evidence.filter((entry, index) => evidence.findIndex(other =>
    other.habitat === entry.habitat && other.form === entry.form && other.section === entry.section) === index);
}

function escapeRegExp(text: string): string { return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

export function formMatches(form: string, name: string): boolean {
  const words = form.toLowerCase().replace(/\b(?:form|forme|style|breed|mask)\b/g, '').match(/[a-z]+/g) ?? [];
  return words.length > 0 && words.every(word => name.toLowerCase().includes(word));
}
