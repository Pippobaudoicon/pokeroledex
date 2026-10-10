// Opens GitHub issues for people who have no GitHub account. The token lives only in
// the Worker (a secret, README "Issue reports"); the browser never sees it. Each report
// is also kept in D1 under the sender's email, which is not published on GitHub.
import { ISSUE_DESCRIPTION_LIMIT, ISSUE_TITLE_LIMIT } from '../shared/types.ts';
import type { Env } from './index.ts';

const DAILY_LIMIT = 5;

export class IssueError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

export async function openIssue(env: Env, owner: string, body: Record<string, unknown>) {
  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) throw new IssueError(503, 'Issue reports are not set up on this server.');
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  if (!title || !description) throw new IssueError(400, 'Add a title and a description.');
  if (title.length > ISSUE_TITLE_LIMIT || description.length > ISSUE_DESCRIPTION_LIMIT) throw new IssueError(400, 'The report is too long.');

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const sent = await env.DB.prepare(`SELECT count(*) AS n FROM records WHERE owner = ? AND collection = 'issues' AND data ->> 'createdAt' > ?`)
    .bind(owner, since).first<number>('n');
  if ((sent ?? 0) >= DAILY_LIMIT) throw new IssueError(429, `You can send ${DAILY_LIMIT} reports a day. Try again tomorrow.`);

  const response = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'pokeroledex-worker',
    },
    body: JSON.stringify({ title, body: `${description}\n\n---\n_Sent from the PokéroleDex app._`, labels: ['from-app'] }),
  });
  if (!response.ok) {
    console.error('GitHub issue failed', response.status, await response.text());
    throw new IssueError(502, 'GitHub did not accept the report. Try again later.');
  }
  const issue = await response.json<{ number: number; html_url: string }>();
  const record = { id: crypto.randomUUID(), userId: owner, title, number: issue.number, url: issue.html_url, createdAt: new Date().toISOString() };
  await env.DB.prepare('INSERT INTO records (owner, collection, id, data) VALUES (?, ?, ?, ?)')
    .bind(owner, 'issues', record.id, JSON.stringify(record)).run();
  return record;
}
