# Rulebook

The **Rulebook** page (`/rulebook`) presents the Pokérole 3.0 corebook in five views, using the app's light and dark themes.

## The five views

- **Text**: searchable text grouped by section. Search ignores accents, and Ctrl+F works too. Chapter headers, subcategories and page badges set the contents apart from the reading pane, and phones get a contents picker. A page number opens that page in Pages. Your search and scroll position survive switching tabs.
- **Pages**: every page as a pre-rendered WebP image, with thumbnails on larger screens, previous/next buttons, a page-number field and fit-page / fit-width controls. Click a page to switch between the two sizes. The PDF's JPEG 2000 art takes seconds per page to decode, so these images scroll far more smoothly than the PDF.
- **PDF**: the file itself in the browser's own viewer, searchable but slow to scroll.
- **Ask**: type a rules question and get a short answer from the book, with the pages it came from (`POST /api/rulebook/ask`).
- **Quick**: battle-rule summaries with links to source pages. These stay readable even when the book can't be loaded.

The text and every page you've viewed are cached for offline reading. The PDF needs a connection.

## How Ask works

The Worker asks the AI Search instance through the `RULEBOOK_SEARCH` binding (`ai_search` in `wrangler.jsonc`, set to `remote` so `pnpm dev` uses the real instance). The instance has no generation model, so `worker/ask.ts` names a Workers AI one. Every question costs a Workers AI call.

## Where the book lives

The book isn't in the repository. It lives in the R2 bucket `pokeroledex-rulebook`, behind the same login as the rest of the site:

| Path | Contents |
| --- | --- |
| `corebook.pdf` | The PDF, streamed in ranges |
| `pages.json` | Text per page |
| `pages/`, `thumbs/` | One image per page |
| `search/` | One Markdown file per section of the contents (`shared/rulebook-sections.ts`), for the Cloudflare AI Search instance `pokeroledex-corebook`, whose path filter is `search/**` |

## Uploading the book

[Download the corebook](https://www.mediafire.com/file/ciqdxrua7ur81q5/POKEROLE_COREBOOK_3.0.pdf/file) and install poppler and webp (`brew install poppler webp`), then:

```sh
pnpm exec wrangler r2 bucket create pokeroledex-rulebook       # once
node scripts/upload-rulebook.ts POKEROLE_COREBOOK_3.0.pdf --remote  # --local for pnpm dev
```

Rendering the 641 pages takes about 13 minutes on 8 cores. Finished pages are kept in `.wrangler/rulebook/` and skipped on the next run.
