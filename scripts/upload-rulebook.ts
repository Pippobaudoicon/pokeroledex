// Uploads the Pokérole corebook, its text and one WebP image per page to the RULEBOOK
// bucket (wrangler.jsonc). Needs poppler and webp (`brew install poppler webp`).
//   node scripts/upload-rulebook.ts path/to/POKEROLE_COREBOOK_3.0.pdf --local|--remote
import { execFile, execFileSync } from 'node:child_process';
import { availableParallelism } from 'node:os';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { rulebookSections } from '../shared/rulebook-sections.ts';

const run = promisify(execFile);
const [pdf, where] = process.argv.slice(2);
if (!pdf || !['--local', '--remote'].includes(where)) {
  console.error('Usage: node scripts/upload-rulebook.ts <corebook.pdf> --local|--remote');
  process.exit(1);
}
// Rendering takes minutes, so finished pages are kept here and skipped on the next run.
const dir = new URL('../.wrangler/rulebook/', import.meta.url).pathname;
mkdirSync(join(dir, 'thumbs'), { recursive: true });
const wrangler = new URL('../node_modules/.bin/wrangler', import.meta.url).pathname;
const put = (key: string, file: string, type?: string) =>
  run(wrangler, ['r2', 'object', 'put', `pokeroledex-rulebook/${key}`, '--file', file, where, ...(type ? ['--content-type', type] : [])]);

// Runs `task` over `items`, `size` at a time.
const pool = async <T>(items: T[], size: number, task: (item: T) => Promise<unknown>) => {
  const queue = [...items];
  await Promise.all(Array.from({ length: size }, async () => {
    for (let item = queue.shift(); item !== undefined; item = queue.shift()) await task(item);
  }));
};

// pdftotext ends every page with a form feed; index 0 is page 1.
const text = execFileSync('pdftotext', [pdf, '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const pages = text.split('\f').slice(0, -1).map((page) => page.trim());
writeFileSync(join(dir, 'pages.json'), JSON.stringify(pages));
console.log(`${pages.length} pages of text`);

// The book's art is JPEG 2000, which takes seconds per page to decode in any PDF viewer.
// Rendering every page once to WebP at the art's own 144 dpi makes the Pages view scroll smoothly.
const numbers = pages.map((_, i) => String(i + 1).padStart(3, '0'));
let done = 0;
await pool(numbers, availableParallelism(), async (n) => {
  const png = join(dir, n);
  if (existsSync(`${png}.webp`)) return;
  await run('pdftoppm', ['-f', String(+n), '-l', String(+n), '-r', '144', '-png', '-singlefile', pdf, png]);
  await run('cwebp', ['-quiet', '-q', '75', `${png}.png`, '-o', `${png}.webp`]);
  rmSync(`${png}.png`);
  process.stdout.write(`\rRendered ${++done} pages`);
});
// Small copies for the Pages view's side column.
await pool(numbers, availableParallelism(), async (n) => {
  const thumb = join(dir, 'thumbs', `${n}.webp`);
  if (!existsSync(thumb)) await run('cwebp', ['-quiet', '-q', '60', '-resize', '160', '0', join(dir, `${n}.webp`), '-o', thumb]);
});

// One Markdown file per section of the contents for Cloudflare AI Search (point it at
// the bucket's search/ folder), e.g. search/04-pokemon-battles/070-clash-and-evasion.md.
const slug = (text: string) =>
  text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const searchFiles = rulebookSections(pages.length).flatMap(({ chapter, chapterNumber, start, end, titles }) => {
  const folder = `${String(chapterNumber).padStart(2, '0')}-${slug(chapter)}`;
  const body = pages.slice(start - 1, end).flatMap((text, i) => text === '' ? [] : [
    `## Page ${start + i}`,
    // pdftotext breaks lines like the printed column; blank lines separate paragraphs.
    ...text.split(/\n{2,}/).map((paragraph) => paragraph.replace(/\n/g, ' ')),
  ]);
  if (body.length === 0) return []; // Blank forms, such as the Battle Organizer Sheet.
  const key = `search/${folder}/${String(start).padStart(3, '0')}-${slug(titles.join(' '))}.md`;
  mkdirSync(join(dir, 'search', folder), { recursive: true });
  writeFileSync(join(dir, key), [
    `# ${titles.join(' / ')}`,
    `Pokérole 3.0 Corebook · ${chapter} · ${start === end ? `page ${start}` : `pages ${start}-${end}`}`,
    ...body,
  ].join('\n\n') + '\n');
  return [key];
});
console.log(`${searchFiles.length} section files for search`);

console.log('\nUploading');
done = 0;
// Local storage fails on parallel writes.
await pool(numbers, where === '--local' ? 1 : 8, async (n) => {
  await put(`pages/${n}.webp`, join(dir, `${n}.webp`));
  await put(`thumbs/${n}.webp`, join(dir, 'thumbs', `${n}.webp`));
  process.stdout.write(`\rUploaded ${++done}/${numbers.length} page images`);
});
await pool(searchFiles, where === '--local' ? 1 : 8, (key) => put(key, join(dir, key), 'text/markdown; charset=utf-8'));
await put('pages.json', join(dir, 'pages.json'));
await put('corebook.pdf', pdf);
console.log('\nDone');
