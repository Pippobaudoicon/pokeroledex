import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { setTimeout } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { habitatCatalog, habitatMacroCatalog, normalizeHabitats, replaceHabitats } from '../shared/habitats.ts';
import type { PokemonHabitatEntry } from '../shared/habitats.ts';
import type { PokemonTemplate } from '../shared/types.ts';
import { extractHabitats, formMatches } from './habitat-extraction.ts';

interface Article {
  title: string;
  pageid?: number;
  missing?: boolean;
  revisions?: { revid: number; slots: { main: { content: string } } }[];
}
interface WikiResponse {
  error?: { code: string; info: string };
  warnings?: Record<string, unknown>;
  query?: {
    normalized?: { from: string; to: string }[];
    redirects?: { from: string; to: string }[];
    pages: Article[];
  };
}

const source = new URL('../data/reference/', import.meta.url);
const cache = new URL('../node_modules/.cache/pokeroledex-habitats/', import.meta.url);
const api = 'https://bulbapedia.bulbagarden.net/w/api.php';
const articleNames: Record<number, string> = { 250: 'Ho-Oh', 439: 'Mime Jr.', 718: 'Zygarde', 772: 'Type: Null' };

export async function captureHabitats(refresh = false): Promise<void> {
  const templates: PokemonTemplate[] = JSON.parse(readFileSync(new URL('pokemon-templates.json', source), 'utf8'));
  const groups = new Map<number, PokemonTemplate[]>();
  for (const template of templates) {
    const group = groups.get(template.number) ?? [];
    group.push(template);
    groups.set(template.number, group);
  }
  const articles = new Map<number, Article>();
  const pending: { number: number; title: string }[] = [];
  mkdirSync(cache, { recursive: true });
  for (const [number, group] of groups) {
    if (number === 0) continue;
    const file = new URL(`${number}.json`, cache);
    const saved: Article | undefined = !refresh && existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : undefined;
    if (saved && !saved.missing) articles.set(number, saved);
    else pending.push({ number, title: `${articleNames[number] ?? group[0].name.split(' (')[0]} (Pokémon)` });
  }
  // Small sequential batches respect the public API and can be resumed from the cache.
  for (let index = 0; index < pending.length; index += 10) {
    const batch = pending.slice(index, index + 10);
    const url = new URL(api);
    url.search = new URLSearchParams({
      action: 'query', prop: 'revisions', rvprop: 'ids|content', rvslots: 'main',
      formatversion: '2', format: 'json', redirects: '1', maxlag: '5',
      titles: batch.map(entry => entry.title).join('|'),
    }).toString();
    const response = await fetch(url, {
      headers: { 'User-Agent': 'PokeroledexHabitatCollector/0.2 (https://github.com/Pippobaudoicon/pokeroledex)' },
      signal: AbortSignal.timeout(90_000),
    });
    if (!response.ok) throw new Error(`Bulbapedia API returned ${response.status}; cached batches are safe to resume.`);
    const result = await response.json() as WikiResponse;
    if (result.error) throw new Error(`Bulbapedia API ${result.error.code}: ${result.error.info}`);
    if (result.warnings) throw new Error(`Bulbapedia API warnings: ${JSON.stringify(result.warnings)}`);
    if (!result.query) throw new Error('Bulbapedia API response has no query result.');
    const aliases = new Map([
      ...(result.query.normalized ?? []).map(({ from, to }) => [from, to] as const),
      ...(result.query.redirects ?? []).map(({ from, to }) => [from, to] as const),
    ]);
    for (const entry of batch) {
      let title = entry.title;
      const visited = new Set<string>();
      while (aliases.has(title) && !visited.has(title)) { visited.add(title); title = aliases.get(title)!; }
      const article = result.query.pages.find(page => page.title === title);
      if (!article) throw new Error(`Bulbapedia did not return ${title}.`);
      if (!article.missing && !article.revisions?.[0]?.slots.main.content) throw new Error(`Missing revision content for ${title}.`);
      articles.set(entry.number, article);
      writeFileSync(new URL(`${entry.number}.json`, cache), JSON.stringify(article));
    }
    console.log(`Bulbapedia: ${Math.min(index + 10, pending.length)}/${pending.length} articles fetched`);
    await setTimeout(500);
  }

  const entries: PokemonHabitatEntry[] = [];
  for (const [number, group] of groups) {
    if (number === 0) {
      for (const template of group) entries.push({
        templateId: template.id, dexID: template.dexID, number, name: template.name,
        habitats: [], status: 'not-applicable',
      });
      continue;
    }
    const article = articles.get(number)!;
    const revision = article.revisions?.[0];
    const species = article.title.replace(/ \(Pokémon\)$/, '');
    const evidence = revision ? extractHabitats(revision.slots.main.content, species) : [];
    const canonical = group.find(template => /^\d+$/.test(template.dexID)) ?? group[0];
    const shared = evidence.filter(entry => entry.form === null);
    const speciesHabitats = [...new Set(shared.map(entry => entry.habitat))].sort();
    for (const template of group) {
      const own = evidence.filter(entry => entry.form !== null && formMatches(entry.form, template.name));
      const isAlternate = template !== canonical || template.name.includes(' (');
      const selected = own.length ? own : shared;
      const inherited = isAlternate && !own.length && speciesHabitats.length > 0;
      const habitats = normalizeHabitats(selected.map(entry => entry.habitat));
      entries.push({
        templateId: template.id, dexID: template.dexID, number, name: template.name,
        habitats,
        status: habitats.length ? inherited ? 'inherited' : 'documented' : 'needs-review',
        ...(revision ? { source: {
          url: `https://bulbapedia.bulbagarden.net/wiki/${encodeURIComponent(article.title.replaceAll(' ', '_'))}`,
          revisionId: revision.revid,
          sections: [...new Set(selected.map(entry => entry.section))].sort(),
        } } : {}),
        ...(inherited ? { inheritedFrom: species } : {}),
        ...(!habitats.length ? { reviewReason: article.missing ? 'Article not found; original API habitats retained.' :
          'No unambiguous habitat statement matched; original API habitats retained.' } : {}),
      });
    }
  }
  entries.sort((a, b) => a.number - b.number || a.name.localeCompare(b.name));
  const effective = replaceHabitats(templates, entries);
  const catalog = habitatCatalog(effective);
  writeFileSync(new URL('pokemon-habitats.json', source), JSON.stringify(entries, null, 2) + '\n');
  writeFileSync(new URL('habitats.json', source), JSON.stringify(catalog, null, 2) + '\n');
  writeFileSync(new URL('habitat-macros.json', source), JSON.stringify(habitatMacroCatalog(effective), null, 2) + '\n');
  const counts = Object.fromEntries(['documented', 'inherited', 'needs-review', 'not-applicable'].map(status =>
    [status, entries.filter(entry => entry.status === status).length]));
  console.log(JSON.stringify({ templates: entries.length, articles: articles.size, habitats: catalog.length, ...counts }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await captureHabitats(process.argv.includes('--refresh'));
}
