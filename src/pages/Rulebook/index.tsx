import * as React from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BookOpen, ChevronLeft, ChevronRight, ExternalLink, List, Loader2, Search, Send, ZoomIn, ZoomOut } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { sameOriginFetch } from "@/api/client";
import { button } from "@/components/kit/button";
import { PageHeader } from "@/components/kit/PageHeader";
import { Segmented, segmentPanelProps } from "@/components/kit/Segmented";
import { Sheet } from "@/components/kit/Sheet";
import { cn } from "@/lib/utils";
import { type RulebookSection, rulebookSections } from "../../../shared/rulebook-sections";
import { quickReference } from "./quick-reference";

const PDF = "/rulebook/corebook.pdf";
const tabs = [
  { value: "text", label: "Text" },
  { value: "pages", label: "Pages" },
  { value: "pdf", label: "PDF" },
  { value: "ask", label: "Ask" },
  { value: "quick", label: "Quick" },
] as const;
type Tab = (typeof tabs)[number]["value"];
const readerHeight = "h-[max(380px,calc(100dvh-280px))]";

// "pokemon" should find "Pokémon": the text is decomposed (NFD) and every typed
// letter may be followed by accents.
const searchPattern = (query: string) => {
  const letters = [...query.normalize("NFD").replace(/[̀-ͯ]/g, "")];
  return new RegExp(`(${letters.map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[\\u0300-\\u036f]*").join("")})`, "gi");
};
const highlight = (text: string, pattern: RegExp | null) =>
  pattern
    ? text.split(pattern).map((part, i) =>
        i % 2 ? (
          <mark key={i} className="rounded-sm bg-tint/20 px-0.5 text-label">
            {part}
          </mark>
        ) : (
          part
        ),
      )
    : text;

/** Scrolls a side column just enough to show the current item. */
const keepInView = (bar: HTMLElement | null, item: Element | null | undefined) => {
  if (!bar || !(item instanceof HTMLElement)) return;
  if (item.offsetTop < bar.scrollTop || item.offsetTop + item.offsetHeight > bar.scrollTop + bar.clientHeight) {
    bar.scrollTop = item.offsetTop - (bar.clientHeight - item.offsetHeight) / 2;
  }
};
const pageRange = (start: number, end: number) => Array.from({ length: end - start + 1 }, (_, i) => start + i);
const sectionsFor = (pageCount: number): RulebookSection[] => {
  const sections = rulebookSections(pageCount);
  return [{ chapter: "", chapterNumber: 0, start: 1, end: sections[0].start - 1, titles: ["Cover & Contents"] }, ...sections];
};

const RulebookText = ({ pages, openPage }: { pages: string[]; openPage: (page: number) => void }) => {
  const [query, setQuery] = React.useState("");
  const [current, setCurrent] = React.useState(0);
  const [contentsOpen, setContentsOpen] = React.useState(false);
  const main = React.useRef<HTMLDivElement>(null);
  const contents = React.useRef<HTMLDivElement>(null);
  const deferredQuery = React.useDeferredValue(query.trim());
  const pattern = deferredQuery ? searchPattern(deferredQuery) : null;
  const sections = React.useMemo(() => sectionsFor(pages.length), [pages.length]);
  // Exclude contents pages from search: they list every section title.
  const shown = (pattern ? sections.filter(({ chapter }) => chapter !== "") : sections)
    .map((section) => ({
      ...section,
      hits: pageRange(section.start, section.end).filter((n) => pages[n - 1] !== "" && (!pattern || pages[n - 1].search(pattern) !== -1)),
    }))
    .filter(({ hits }) => hits.length > 0);
  const pageCount = shown.reduce((sum, { hits }) => sum + hits.length, 0);
  const show = (index: number) => {
    const target = main.current?.children[index] as HTMLElement | undefined;
    if (main.current && target) main.current.scrollTop = target.offsetTop;
    setCurrent(index);
    setContentsOpen(false);
  };
  React.useEffect(() => {
    if (main.current) main.current.scrollTop = 0;
    setCurrent(0);
  }, [deferredQuery]);
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
  const contentsList = shown.map((section, i) => (
    <React.Fragment key={section.start}>
      {section.chapter !== shown[i - 1]?.chapter && section.chapter && (
        <p className="mt-4 rounded-lg bg-fill-strong px-3 py-2 text-footnote font-semibold text-label first:mt-0">{section.chapter}</p>
      )}
      <button
        type="button"
        data-section={i}
        aria-current={i === current ? "location" : undefined}
        onClick={() => show(i)}
        className={cn(
          "mt-1 flex min-h-11 w-full items-start justify-between gap-3 rounded-lg py-2 pr-2 pl-4 text-left text-subhead lg:min-h-9",
          i === current ? "bg-tint font-semibold text-on-tint" : "text-label hover:bg-fill-strong",
        )}
      >
        <span>{section.titles.join(" / ")}</span>
        <span
          className={cn(
            "min-w-7 shrink-0 rounded-md px-1.5 py-0.5 text-center text-caption tabular-nums",
            i === current ? "bg-on-tint/15 text-on-tint" : "bg-fill text-label-2",
          )}
        >
          {section.start}
        </span>
      </button>
    </React.Fragment>
  ));
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex gap-2">
        <label className="relative flex min-w-0 flex-1 items-center">
          <Search aria-hidden className="pointer-events-none absolute left-3 size-4 text-label-2" />
          <span className="sr-only">Search the rulebook</span>
          <input
            type="search"
            placeholder="Search rules, moves, conditions…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-11 w-full rounded-xl bg-fill pr-3 pl-9 text-body outline-none placeholder:text-label-2 focus-visible:outline-2 focus-visible:outline-focus lg:h-9"
          />
        </label>
        <button
          type="button"
          disabled={!shown.length}
          aria-haspopup="dialog"
          onClick={() => setContentsOpen(true)}
          className={cn(button({ variant: "gray" }), "lg:hidden")}
        >
          <List aria-hidden className="size-4" />
          Contents
        </button>
      </div>
      <p role="status" className="px-1 text-footnote text-label-2">
        {pageCount} pages in {shown.length} sections{pattern ? " matching your search" : " · Choose a section or search the book"}
      </p>
      {shown.length === 0 ? (
        <div className="rounded-2xl bg-surface px-5 py-12 text-center shadow-card">
          <Search aria-hidden className="mx-auto mb-3 size-7 text-label-3" />
          <h2 className="text-headline font-semibold">No rules found</h2>
          <p className="mt-1 text-subhead text-label-2">Try another word or clear your search.</p>
          <button type="button" onClick={() => setQuery("")} className={cn(button({ variant: "tinted" }), "mt-4")}>
            Clear search
          </button>
        </div>
      ) : (
        <div className={cn("grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[232px_minmax(0,1fr)]", readerHeight)}>
          <div
            ref={contents}
            role="navigation"
            aria-label="Book contents"
            className="relative hidden overflow-y-auto overscroll-contain rounded-2xl border border-hairline bg-fill p-2 lg:block"
          >
            {contentsList}
          </div>
          <div
            ref={main}
            role="region"
            aria-label="Rulebook text"
            tabIndex={0}
            onScroll={onScroll}
            className="relative min-w-0 overflow-y-auto overscroll-contain rounded-2xl bg-surface px-5 shadow-card lg:px-8"
          >
            {shown.map(({ chapter, start, end, titles, hits }) => (
              <section key={start} className="mx-auto max-w-3xl border-b border-hairline py-6 last:border-b-0 lg:py-8">
                <header className="mb-5 rounded-xl border border-tint/15 bg-tint/10 p-4">
                  {chapter && <p className="mb-1 text-footnote font-medium text-tint">{chapter}</p>}
                  <h2 className="text-title-3 font-semibold">{titles.join(" / ")}</h2>
                  <p className="mt-1 text-footnote text-label-2">{start === end ? `Page ${start}` : `Pages ${start}–${end}`}</p>
                </header>
                {hits.map((n) => (
                  <div key={n} className="mt-5 first:mt-0">
                    <button
                      type="button"
                      className="mb-2 rounded-md text-footnote font-semibold text-tint hover:underline"
                      title="Show this page"
                      onClick={() => openPage(n)}
                    >
                      Page {n}
                      <ChevronRight aria-hidden className="ml-0.5 inline size-3.5" />
                    </button>
                    <div className="text-body leading-relaxed whitespace-pre-line break-words">
                      {highlight(
                        pages[n - 1]
                          .split(/\n{2,}/)
                          .map((paragraph) => paragraph.replace(/\n/g, " "))
                          .join("\n\n"),
                        pattern,
                      )}
                    </div>
                  </div>
                ))}
              </section>
            ))}
          </div>
        </div>
      )}
      <Sheet open={contentsOpen} onOpenChange={setContentsOpen} title="Book contents" initialExpanded>
        <nav aria-label="Book contents" className="m-3 rounded-xl bg-fill p-2">
          {contentsList}
        </nav>
      </Sheet>
    </div>
  );
};

const pageFile = (n: number) => `${String(n).padStart(3, "0")}.webp`;
const RulebookPages = ({ count, page }: { count: number; page: number }) => {
  const [current, setCurrent] = React.useState(page);
  const [draft, setDraft] = React.useState(String(page));
  const [zoomed, setZoomed] = React.useState(false);
  const anchorPage = React.useRef(page);
  const positioning = React.useRef(true);
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  const main = React.useRef<HTMLDivElement>(null);
  const side = React.useRef<HTMLDivElement>(null);
  const numbers = pageRange(1, count);
  const show = (number: number) => {
    const n = Math.max(1, Math.min(count, number));
    anchorPage.current = n;
    const target = main.current?.children[n - 1] as HTMLElement | undefined;
    if (main.current && target) main.current.scrollTop = target.offsetTop;
    setCurrent(n);
    setDraft(String(n));
  };
  React.useEffect(() => {
    show(page);
  }, [page]);
  React.useLayoutEffect(() => {
    const box = main.current!;
    const observer = new ResizeObserver(() => {
      positioning.current = true;
      setSize({ width: box.clientWidth, height: box.clientHeight });
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);
  React.useLayoutEffect(() => {
    if (!size.width) return;
    show(anchorPage.current);
    positioning.current = false;
  }, [zoomed, size]);
  const toggleZoom = (number: number) => {
    positioning.current = true;
    anchorPage.current = number;
    setZoomed(!zoomed);
  };
  const visiblePage = () => {
    const box = main.current;
    if (!box) return current;
    const middle = box.scrollTop + box.clientHeight / 2;
    const index = (Array.from(box.children) as HTMLElement[]).findIndex((image) => image.offsetTop + image.offsetHeight > middle);
    return index === -1 ? count : index + 1;
  };
  const onScroll = () => {
    if (positioning.current) return;
    const number = visiblePage();
    anchorPage.current = number;
    setCurrent(number);
    setDraft(String(number));
  };
  React.useEffect(() => {
    keepInView(side.current, side.current?.children[current - 1]);
  }, [current]);
  return (
    <div className={cn("flex min-w-0 flex-col overflow-hidden rounded-2xl bg-surface shadow-card", readerHeight)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline p-3">
        <form
          className="flex items-center gap-2 text-subhead"
          onSubmit={(event) => {
            event.preventDefault();
            const n = Number(draft);
            if (Number.isInteger(n)) show(n);
          }}
        >
          <label htmlFor="rulebook-page">Page</label>
          <input
            id="rulebook-page"
            type="number"
            min={1}
            max={count}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="h-9 w-16 rounded-lg bg-fill px-2 text-center text-body tabular-nums outline-none focus-visible:outline-2 focus-visible:outline-focus lg:h-8"
          />
          <span className="text-label-2">of {count}</span>
          <button type="submit" className={button({ variant: "gray", size: "sm" })}>
            Go
          </button>
        </form>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Previous page"
            disabled={current <= 1}
            onClick={() => show(current - 1)}
            className={button({ variant: "gray", size: "icon" })}
          >
            <ChevronLeft aria-hidden className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Next page"
            disabled={current >= count}
            onClick={() => show(current + 1)}
            className={button({ variant: "gray", size: "icon" })}
          >
            <ChevronRight aria-hidden className="size-4" />
          </button>
          <button
            type="button"
            aria-label={zoomed ? "Fit page" : "Fit width"}
            aria-pressed={zoomed}
            onClick={() => toggleZoom(anchorPage.current)}
            className={button({ variant: zoomed ? "tinted" : "gray", size: "icon" })}
          >
            {zoomed ? <ZoomOut aria-hidden className="size-4" /> : <ZoomIn aria-hidden className="size-4" />}
          </button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 gap-3 p-3">
        <div
          ref={side}
          role="navigation"
          aria-label="Page thumbnails"
          className="relative hidden w-24 shrink-0 flex-col gap-2 overflow-y-auto overscroll-contain md:flex"
        >
          {numbers.map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`Go to page ${n}`}
              aria-current={n === current ? "page" : undefined}
              onClick={() => show(n)}
              className={cn(
                "flex shrink-0 flex-col items-center gap-1 rounded-lg p-1.5 text-caption tabular-nums",
                n === current ? "bg-tint/10 font-semibold text-tint" : "text-label-2 hover:bg-fill",
              )}
            >
              <img
                src={`/rulebook/thumbs/${pageFile(n)}`}
                alt=""
                loading="lazy"
                width={160}
                height={264}
                className="w-full rounded-sm bg-white"
              />
              {n}
            </button>
          ))}
        </div>
        <div
          ref={main}
          role="region"
          aria-label="Book pages"
          tabIndex={0}
          onScroll={onScroll}
          className="relative flex min-w-0 flex-1 flex-col gap-3 overflow-auto overscroll-contain rounded-xl bg-fill [overflow-anchor:none]"
        >
          {numbers.map((n) => (
            <img
              key={n}
              role="button"
              tabIndex={0}
              data-page={n}
              aria-label={zoomed ? `Fit page ${n}` : `Fit page ${n} to width`}
              title={zoomed ? "Click to see whole pages" : "Click to fit width"}
              onClick={() => toggleZoom(n)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                toggleZoom(n);
              }}
              src={`/rulebook/pages/${pageFile(n)}`}
              alt={`Page ${n}`}
              loading="lazy"
              width={1224}
              height={2016}
              style={{ width: zoomed ? size.width : Math.min(size.width, (size.height * 612) / 1008) }}
              className={cn(
                "mx-auto block h-auto max-w-full shrink-0 rounded-md bg-white shadow-card",
                zoomed ? "cursor-zoom-out" : "cursor-zoom-in",
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

interface Answer {
  answer: string;
  sources: { title: string; chapter: string; page: number; key: string }[];
}
const RulebookAsk = ({ openPage }: { openPage: (page: number) => void }) => {
  const [question, setQuestion] = React.useState("");
  const ask = useMutation({
    mutationFn: async (text: string) => {
      const response = await sameOriginFetch("/api/rulebook/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      if (!response.ok)
        throw new Error(((await response.json().catch(() => null)) as { payload?: string } | null)?.payload ?? response.statusText);
      return (await response.json()) as Answer;
    },
  });
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <form
        className="rounded-2xl bg-surface p-4 shadow-card lg:p-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (question.trim() && !ask.isPending) ask.mutate(question.trim());
        }}
      >
        <label htmlFor="rulebook-question" className="text-headline font-semibold">
          Ask the corebook
        </label>
        <p className="mt-1 text-subhead text-label-2">Ask a rules question, then follow the cited pages for context.</p>
        <textarea
          id="rulebook-question"
          placeholder="How does Clash work?"
          maxLength={500}
          rows={3}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          className="mt-4 w-full resize-y rounded-xl bg-fill p-3 text-body outline-none placeholder:text-label-2 focus-visible:outline-2 focus-visible:outline-focus"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-footnote text-label-2 tabular-nums">{question.length} / 500</span>
          <button type="submit" disabled={ask.isPending || !question.trim()} className={button({ variant: "filled" })}>
            {ask.isPending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Send aria-hidden className="size-4" />}
            {ask.isPending ? "Looking it up…" : "Ask the book"}
          </button>
        </div>
      </form>
      {ask.isPending && (
        <p role="status" className="px-1 text-subhead text-label-2">
          Searching the corebook for your answer…
        </p>
      )}
      {ask.isError && (
        <div role="alert" className="rounded-2xl bg-tint/10 p-4 text-subhead text-tint">
          {ask.error.message || "The question could not be answered."}
        </div>
      )}
      {ask.data && (
        <article className="rounded-2xl bg-surface p-5 shadow-card lg:p-6">
          <p className="text-footnote font-semibold tracking-wide text-tint uppercase">From the corebook</p>
          <h2 className="mt-1 mb-4 text-headline font-semibold">{ask.variables}</h2>
          <div className="text-body leading-relaxed whitespace-pre-wrap break-words">{ask.data.answer}</div>
          {ask.data.sources.length > 0 && (
            <div className="mt-5 border-t border-hairline pt-4">
              <h3 className="mb-2 text-footnote font-semibold text-label-2 uppercase">Sources</h3>
              {ask.data.sources.map(({ key, title, chapter, page }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => openPage(page)}
                  className="flex w-full items-center gap-3 rounded-xl py-3 text-left text-tint hover:bg-fill"
                >
                  <BookOpen aria-hidden className="size-5 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-subhead font-medium">{title}</span>
                    <span className="block text-footnote text-label-2">
                      {chapter} · Page {page}
                    </span>
                  </span>
                  <ChevronRight aria-hidden className="size-4 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </article>
      )}
    </div>
  );
};

// These summaries remain available even when the book cannot be loaded.
const QuickReference = ({ openPage }: { openPage: (page: number) => void }) => (
  <div>
    <p className="mb-4 text-subhead text-label-2">Battle rules at a glance. Open a source page for the full rule.</p>
    <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
      {quickReference.map(({ title, pages, points }) => (
        <article key={title} className="min-w-0 rounded-2xl bg-surface p-4 shadow-card lg:p-5">
          <h2 className="text-headline font-semibold">{title}</h2>
          <ul className="mt-3 list-disc space-y-2 pl-4 text-subhead leading-relaxed marker:text-label-3">
            {points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-1.5 border-t border-hairline pt-3" aria-label={`Source pages for ${title}`}>
            {pages.map((page) => (
              <button key={page} type="button" onClick={() => openPage(page)} className={button({ variant: "tinted", size: "sm" })}>
                p. {page}
                <ChevronRight aria-hidden className="size-3" />
              </button>
            ))}
          </div>
        </article>
      ))}
    </div>
  </div>
);

export const RulebookPage = () => {
  const [tab, setTab] = React.useState<Tab>("text");
  const [page, setPage] = React.useState(1);
  const [params] = useSearchParams();
  const {
    data: pages,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["rulebook-text"],
    queryFn: async () => {
      const response = await sameOriginFetch("/rulebook/pages.json");
      if (!response.ok) throw new Error(response.statusText);
      return ((await response.json()) as string[]).map((text) => text.normalize("NFD"));
    },
    staleTime: Infinity,
  });
  React.useEffect(() => {
    const linked = Number(params.get("page"));
    if (Number.isInteger(linked) && linked > 0) {
      setPage(linked);
      setTab("pages");
    } else {
      const requested = params.get("tab");
      if (tabs.some((tab) => tab.value === requested)) setTab(requested as Tab);
    }
  }, [params]);
  const bookPage = Math.min(page, pages?.length ?? page);
  const src = `${PDF}#page=${bookPage}`;
  const openPage = (number: number) => {
    setPage(Math.max(1, Math.min(number, pages?.length ?? number)));
    setTab("pages");
  };
  const openQuickPage = (number: number) => {
    if (pages) openPage(number);
    else window.open(`${PDF}#page=${number}`, "_blank", "noopener");
  };
  const unavailable = (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface px-5 py-12 text-center shadow-card" role="status">
      {isLoading ? (
        <>
          <Loader2 aria-hidden className="size-7 animate-spin text-label-3" />
          <p className="text-subhead text-label-2">Loading the corebook…</p>
        </>
      ) : (
        <>
          <BookOpen aria-hidden className="size-8 text-label-3" />
          <h2 className="text-headline font-semibold">The corebook couldn’t be loaded</h2>
          <p className="max-w-sm text-subhead text-label-2">
            Try again, open the PDF, or use Quick Reference while the book is unavailable.
          </p>
          <button type="button" onClick={() => refetch()} className={button({ variant: "tinted" })}>
            Try again
          </button>
        </>
      )}
    </div>
  );
  return (
    <div className="mx-auto max-w-[1500px] pb-8">
      <PageHeader
        title="Rulebook"
        actions={
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open PDF in a new tab"
            className={button({ variant: "gray" })}
          >
            <ExternalLink aria-hidden className="size-4" />
            <span className="hidden sm:inline">Open PDF</span>
          </a>
        }
      >
        <p className="text-subhead text-label-2">Pokérole 3.0 Corebook{pages ? ` · ${pages.length} pages` : ""}</p>
        <Segmented
          label="Rulebook view"
          idPrefix="rulebook"
          options={tabs.map((tab) => ({ ...tab }))}
          value={tab}
          onChange={setTab}
          className="mt-3 max-w-xl"
        />
      </PageHeader>
      <div className="px-4 lg:px-8">
        <div {...segmentPanelProps("rulebook", "text")} hidden={tab !== "text"}>
          {pages ? <RulebookText pages={pages} openPage={openPage} /> : unavailable}
        </div>
        <div {...segmentPanelProps("rulebook", "pages")} hidden={tab !== "pages"}>
          {tab === "pages" && (pages ? <RulebookPages count={pages.length} page={bookPage} /> : unavailable)}
        </div>
        <div {...segmentPanelProps("rulebook", "ask")} hidden={tab !== "ask"}>
          <RulebookAsk openPage={openQuickPage} />
        </div>
        <div {...segmentPanelProps("rulebook", "pdf")} hidden={tab !== "pdf"}>
          {tab === "pdf" && (
            <iframe
              key={page}
              src={src}
              title="Pokérole 3.0 Corebook"
              className={cn("w-full rounded-2xl border border-hairline bg-surface", readerHeight)}
            />
          )}
        </div>
        <div {...segmentPanelProps("rulebook", "quick")} hidden={tab !== "quick"}>
          {tab === "quick" && <QuickReference openPage={openQuickPage} />}
        </div>
      </div>
    </div>
  );
};
