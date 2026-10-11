import { rulebookSections } from '../shared/rulebook-sections.ts';
import type { Env } from './index.ts';

const sections = rulebookSections(641);

/** Answers a rules question (model and system prompt are the instance's own settings) from the AI Search instance pokeroledex-corebook (wrangler.jsonc). */
export async function askRulebook(env: Env, question: unknown) {
  const query = typeof question === 'string' ? question.trim().slice(0, 500) : '';
  if (!query) return { status: 400, message: 'Ask a question.' };
  const result = await env.RULEBOOK_SEARCH.chatCompletions({
    messages: [{ role: 'user', content: query }],
    // The instance has reranking on with no reranking model, which returns no chunks at all.
    ai_search_options: { retrieval: { max_num_results: 6 }, reranking: { enabled: false } },
  });
  // Keys look like search/05-pokemon-battles/070-clash-evasion.md; the number is the section's first page.
  const keys = [...new Set(result.chunks.map((chunk) => chunk.item.key))];
  const sources = keys.flatMap((key) => {
    const page = Number(key.match(/\/(\d{3})-[^/]*$/)?.[1]);
    const section = sections.find((s) => s.start === page);
    return section ? [{ title: section.titles.join(' / '), chapter: section.chapter, page, key }] : [];
  });
  return { status: 200, answer: result.choices[0]?.message.content ?? '', sources };
}
