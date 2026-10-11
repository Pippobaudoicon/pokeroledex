import * as React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Box } from "@/components/Box";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Text } from "@/components/Text";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type RulebookSection, rulebookSections } from "../../../shared/rulebook-sections";

const PDF = "/rulebook/corebook.pdf";

// "pokemon" should find "Pokémon": the text is kept decomposed (NFD) and every typed
// letter may be followed by accents.
const searchPattern = (query: string) => {
  const letters = [...query.normalize("NFD").replace(/[̀-ͯ]/g, "")];
  return new RegExp(`(${letters.map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[\\u0300-\\u036f]*").join("")})`, "gi");
};

const highlight = (text: string, pattern: RegExp | null) =>
  pattern
    ? text.split(pattern).map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part))
    : text;

/** Scrolls a side column just enough to show `item`, centring it. */
const keepInView = (bar: HTMLElement | null, item: Element | null | undefined) => {
  if (!bar || !(item instanceof HTMLElement)) return;
  if (item.offsetTop < bar.scrollTop || item.offsetTop + item.offsetHeight > bar.scrollTop + bar.clientHeight) {
    bar.scrollTop = item.offsetTop - (bar.clientHeight - item.offsetHeight) / 2;
  }
};

const pageRange = (start: number, end: number) => Array.from({ length: end - start + 1 }, (_, i) => start + i);

// The book's own contents (shared/rulebook-sections.ts), the same split as the AI Search files.
// Cover, credits and contents come before the first chapter.
const sectionsFor = (pageCount: number): RulebookSection[] => {
  const sections = rulebookSections(pageCount);
  const first = sections[0].start;
  return [{ chapter: "", chapterNumber: 0, start: 1, end: first - 1, titles: ["Cover & Contents"] }, ...sections];
};

const RulebookText = ({ pages, openPage }: { pages: string[]; openPage: (page: number) => void }) => {
  const [query, setQuery] = React.useState("");
  const [current, setCurrent] = React.useState(0);
  const main = React.useRef<HTMLDivElement>(null);
  const contents = React.useRef<HTMLDivElement>(null);
  const deferredQuery = React.useDeferredValue(query.trim());
  const pattern = deferredQuery ? searchPattern(deferredQuery) : null;
  const sections = React.useMemo(() => sectionsFor(pages.length), [pages.length]);
  // Only pages with text; while searching, only pages and sections that match, leaving
  // out the contents pages, which list every section title.
  const shown = (pattern ? sections.filter(({ chapter }) => chapter !== "") : sections)
    .map((section) => ({
      ...section,
      hits: pageRange(section.start, section.end).filter(
        (n) => pages[n - 1] !== "" && (!pattern || pages[n - 1].search(pattern) !== -1),
      ),
    }))
    .filter(({ hits }) => hits.length > 0);
  const pageCount = shown.reduce((sum, { hits }) => sum + hits.length, 0);

  const show = (i: number) => {
    const target = main.current?.children[i] as HTMLElement | undefined;
    if (main.current && target) main.current.scrollTop = target.offsetTop;
  };
  React.useEffect(() => {
    if (main.current) main.current.scrollTop = 0;
    setCurrent(0);
  }, [deferredQuery]);
  // The section across the top third of the view is the current one.
  const onScroll = () => {
    const box = main.current;
    if (!box) return;
    const line = box.scrollTop + box.clientHeight / 3;
    const index = (Array.from(box.children) as HTMLElement[]).findIndex((el) => el.offsetTop + el.offsetHeight > line);
    setCurrent(index === -1 ? shown.length - 1 : index);
  };
  React.useEffect(() => {
    keepInView(contents.current, contents.current?.querySelector(`[data-section="${current}"]`));
  }, [current]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Input
          type="search"
          placeholder="Search the rulebook"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
        />
        {pattern && (
          <Text size="text-base" color="text-white" className="whitespace-nowrap">
            {pageCount} pages in {shown.length} sections
          </Text>
        )}
      </div>
      <div className="rulebook-viewer">
        <div ref={contents} className="rulebook-contents">
          {shown.map((section, i) => (
            <React.Fragment key={section.start}>
              {section.chapter !== shown[i - 1]?.chapter && section.chapter && (
                <p className="rulebook-contents-chapter">{section.chapter}</p>
              )}
              <button
                type="button"
                data-section={i}
                className={i === current ? "rulebook-contents-item rulebook-contents-current" : "rulebook-contents-item"}
                onClick={() => {
                  show(i);
                }}
              >
                <span>{section.titles.join(" / ")}</span>
                <span>{section.start}</span>
              </button>
            </React.Fragment>
          ))}
        </div>
        <div ref={main} className="rulebook-text" onScroll={onScroll}>
          {shown.map(({ chapter, start, end, titles, hits }) => (
            <Box key={start} color="bg-pokerole-beige" className="p-5 flex flex-col gap-3">
              <div>
                {chapter && (
                  <Text size="text-base" font="font-move">
                    {chapter}
                  </Text>
                )}
                <Text size="text-2xl">{titles.join(" / ")}</Text>
                <Text size="text-base" font="font-move">
                  {start === end ? `Page ${start}` : `Pages ${start}–${end}`}
                </Text>
              </div>
              {hits.map((n) => (
                <React.Fragment key={n}>
                  <button
                    type="button"
                    className="rulebook-page-link font-square text-base text-pokerole-black"
                    title="Show this page"
                    onClick={() => {
                      openPage(n);
                    }}
                  >
                    Page {n}
                  </button>
                  {/* pdftotext breaks lines like the printed column; blank lines separate paragraphs. */}
                  {pages[n - 1].split(/\n{2,}/).map((paragraph, i) => (
                    <p key={i} className="font-move text-base text-pokerole-black">
                      {highlight(paragraph.replace(/\n/g, " "), pattern)}
                    </p>
                  ))}
                </React.Fragment>
              ))}
            </Box>
          ))}
        </div>
      </div>
    </div>
  );
};

// Pre-rendered WebP pages (scripts/upload-rulebook.ts) scroll smoothly; the PDF's
// JPEG 2000 art takes seconds per page to decode. Like a PDF viewer: thumbnails on the
// side, one whole page at a time in the middle. Width and height reserve each page's
// space before it loads, so jumping to a page lands on it.
const pageFile = (n: number) => `${String(n).padStart(3, "0")}.webp`;

const RulebookPages = ({ count, page }: { count: number; page: number }) => {
  const [current, setCurrent] = React.useState(page);
  const [zoomed, setZoomed] = React.useState(false);
  // Where the last click landed, so the zoom keeps that spot under the cursor.
  const anchor = React.useRef({ page: 1, fx: 0, fy: 0, x: 0, y: 0 });
  const main = React.useRef<HTMLDivElement>(null);
  const side = React.useRef<HTMLDivElement>(null);
  const numbers = Array.from({ length: count }, (_, i) => i + 1);
  const show = (n: number) => {
    const target = main.current?.children[n - 1] as HTMLElement | undefined;
    if (main.current && target) main.current.scrollTop = target.offsetTop;
  };
  React.useEffect(() => {
    show(page);
  }, [page]);
  React.useLayoutEffect(() => {
    const box = main.current;
    const target = box?.children[anchor.current.page - 1] as HTMLElement | undefined;
    if (!box || !target) return;
    const { fx, fy, x, y } = anchor.current;
    box.scrollTop = target.offsetTop + fy * target.offsetHeight - y;
    box.scrollLeft = target.offsetLeft + fx * target.offsetWidth - x;
  }, [zoomed]);
  // The page across the middle of the view is the current one.
  const onScroll = () => {
    const box = main.current;
    if (!box) return;
    const middle = box.scrollTop + box.clientHeight / 2;
    const pages = Array.from(box.children) as HTMLElement[];
    const index = pages.findIndex((img) => img.offsetTop + img.offsetHeight > middle);
    setCurrent(index === -1 ? count : index + 1);
  };
  React.useEffect(() => {
    keepInView(side.current, side.current?.children[current - 1]);
  }, [current]);

  return (
    <div className="rulebook-viewer">
      <div ref={side} className="rulebook-thumbs">
        {numbers.map((n) => (
          <button
            key={n}
            type="button"
            className={n === current ? "rulebook-thumb rulebook-thumb-current" : "rulebook-thumb"}
            onClick={() => {
              show(n);
            }}
          >
            <img src={`/rulebook/thumbs/${pageFile(n)}`} alt="" loading="lazy" width={160} height={264} />
            {n}
          </button>
        ))}
      </div>
      <div ref={main} className={zoomed ? "rulebook-main rulebook-zoomed" : "rulebook-main"} onScroll={onScroll}>
        {numbers.map((n) => (
          <img
            key={n}
            title={zoomed ? "Click to see whole pages" : "Click to zoom in"}
            onClick={(event) => {
              const page = event.currentTarget.getBoundingClientRect();
              const view = main.current!.getBoundingClientRect();
              anchor.current = {
                page: n,
                fx: (event.clientX - page.left) / page.width,
                fy: (event.clientY - page.top) / page.height,
                x: event.clientX - view.left,
                y: event.clientY - view.top,
              };
              setZoomed(!zoomed);
            }}
            src={`/rulebook/pages/${pageFile(n)}`}
            alt={`Page ${n}`}
            loading="lazy"
            width={1224}
            height={2016}
            className="rulebook-page"
          />
        ))}
      </div>
    </div>
  );
};

interface Answer {
  answer: string;
  sources: { title: string; chapter: string; page: number; key: string }[];
}

// POST /api/rulebook/ask (worker/ask.ts): an answer from the AI Search instance and the sections it used.
const RulebookAsk = ({ openPage }: { openPage: (page: number) => void }) => {
  const [question, setQuestion] = React.useState("");
  const ask = useMutation({
    mutationFn: async (text: string) => {
      const response = await fetch("/api/rulebook/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      if (!response.ok) throw new Error(((await response.json().catch(() => null)) as { payload?: string } | null)?.payload ?? response.statusText);
      return (await response.json()) as Answer;
    },
  });

  return (
    <div className="flex flex-col gap-3">
      <form
        className="flex items-center gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (question.trim() && !ask.isPending) ask.mutate(question);
        }}
      >
        <Input
          placeholder="Ask the rulebook, e.g. How does Clash work?"
          maxLength={500}
          value={question}
          onChange={(event) => {
            setQuestion(event.target.value);
          }}
        />
        <Button type="submit" variant="white" disabled={ask.isPending || !question.trim()}>
          Ask
        </Button>
      </form>
      {ask.isPending && <LoadingSpinner className="h-12 w-16" />}
      {ask.isError && (
        <Text size="text-xl" color="text-white">
          {ask.error.message || "The question could not be answered."}
        </Text>
      )}
      {ask.data && (
        <Box color="bg-pokerole-beige" className="p-5 rulebook-answer">
          {/* Plain text: paragraphs split on blank lines, lines starting "- " are list items. */}
          {ask.data.answer.split(/\n{2,}/).map((paragraph, i) => (
            <div key={i} className="font-move text-base text-pokerole-black">
              {paragraph.split("\n").map((line, j) => (
                <p key={j}>{line}</p>
              ))}
            </div>
          ))}
          {ask.data.sources.length > 0 && (
            <div>
              <Text size="text-base" font="font-move">
                Sources
              </Text>
              {ask.data.sources.map(({ key, title, chapter, page }) => (
                <button
                  key={key}
                  type="button"
                  className="rulebook-source font-square text-base text-pokerole-black"
                  title="Show this page"
                  onClick={() => {
                    openPage(page);
                  }}
                >
                  {title} · {chapter} · p. {page}
                </button>
              ))}
            </div>
          )}
        </Box>
      )}
    </div>
  );
};

export const RulebookPage = () => {
  const [tab, setTab] = React.useState("text");
  const [page, setPage] = React.useState(1);
  const { data: pages, isLoading, isError } = useQuery({
    queryKey: ["rulebook-text"],
    queryFn: async () => {
      const response = await fetch("/rulebook/pages.json");
      if (!response.ok) throw new Error(response.statusText);
      return ((await response.json()) as string[]).map((text) => text.normalize("NFD"));
    },
    staleTime: Infinity,
  });
  const src = `${PDF}#page=${page}`;
  if (isLoading) return <LoadingSpinner className="h-12 w-16" />;
  if (isError || !pages) return <Text size="text-xl" color="text-white">The rulebook could not be loaded.</Text>;
  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text color="text-white">Pokérole 3.0 Corebook</Text>
        <a href={src} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "white" })}>
          Open PDF in a new tab
        </a>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="rulebook-tabs grid w-full">
          <TabsTrigger value="text" title="Searchable text">Text</TabsTrigger>
          <TabsTrigger value="pages" title="The book's pages, fast to scroll">Pages</TabsTrigger>
          <TabsTrigger value="pdf" title="The original PDF: searchable, but slow to scroll">PDF</TabsTrigger>
          <TabsTrigger value="ask" title="Ask a rules question">Ask</TabsTrigger>
        </TabsList>
        {/* Kept mounted so the search and scroll position survive a visit to Pages. */}
        <TabsContent value="text" forceMount={true} hidden={tab !== "text"}>
          <RulebookText
            pages={pages}
            openPage={(number) => {
              setPage(number);
              setTab("pages");
            }}
          />
        </TabsContent>
        <TabsContent value="pages">
          <RulebookPages count={pages.length} page={page} />
        </TabsContent>
        {/* Kept mounted so the last answer survives a visit to Pages. */}
        <TabsContent value="ask" forceMount={true} hidden={tab !== "ask"}>
          <RulebookAsk
            openPage={(number) => {
              setPage(number);
              setTab("pages");
            }}
          />
        </TabsContent>
        <TabsContent value="pdf">
          {/* The browser's own PDF viewer brings page navigation and Ctrl+F. */}
          <iframe key={page} src={src} title="Pokérole 3.0 Corebook" className="rulebook-pdf w-full bg-white" />
        </TabsContent>
      </Tabs>
    </div>
  );
};
