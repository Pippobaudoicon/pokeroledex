import { Check, Globe, Lock, Plus, Trash2 } from "lucide-react";
import * as React from "react";
import type * as T from "../../shared/types";
import { NOTE_BODY_LIMIT, NOTE_TITLE_LIMIT, NOTES_MAX } from "../../shared/types";
import { button } from "@/components/kit/button";
import { Segmented } from "@/components/kit/Segmented";
import { Sheet } from "@/components/kit/Sheet";
import { cn } from "@/lib/utils";

type EditableNote = T.Note & { isPublic?: boolean };

const fieldClass =
  "w-full rounded-xl bg-fill text-body outline-none placeholder:text-label-2 focus-visible:outline-2 focus-visible:outline-focus";
const isBlank = (note: EditableNote) => !note.title.trim() && !note.body.trim();

/**
 * Tabbed notes, each with a title and description. With `withVisibility`, each note is
 * public or private (new notes start private). Without `onSave` the notes are read-only.
 */
export const NotesSheet = <N extends EditableNote>({
  title,
  description,
  notes,
  open,
  onOpenChange,
  onSave,
  withVisibility = false,
  placeholder = "Goals, story, reminders…",
  emptyText = "No notes yet.",
}: {
  title: string;
  description: string;
  notes: N[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (notes: N[]) => void;
  withVisibility?: boolean;
  placeholder?: string;
  emptyText?: string;
}) => {
  const readOnly = !onSave;
  const blankNote = (): N =>
    ({ id: crypto.randomUUID(), title: "", body: "", ...(withVisibility && { isPublic: false }) }) as N;
  const [draft, setDraft] = React.useState<N[]>([]);
  const [selectedId, setSelectedId] = React.useState<string>();
  const tabRefs = React.useRef(new Map<string, HTMLButtonElement>());
  const idPrefix = React.useId();

  React.useEffect(() => {
    if (!open) return;
    const initial = notes.length || readOnly ? notes : [blankNote()];
    setDraft(initial);
    setSelectedId(initial[0]?.id);
  }, [open]);

  const selectedIndex = Math.max(0, draft.findIndex((note) => note.id === selectedId));
  const selected = draft[selectedIndex] as N | undefined;
  const select = setSelectedId;
  const edit = (changes: Partial<N>) =>
    setDraft((current) => current.map((note) => (note.id === selected?.id ? { ...note, ...changes } : note)));
  const add = () => {
    const note = blankNote();
    setDraft((current) => [...current, note]);
    setSelectedId(note.id);
  };
  const remove = () => {
    if (!selected) return;
    const rest = draft.filter((note) => note.id !== selected.id);
    const next = rest.length ? rest : [blankNote()];
    setDraft(next);
    setSelectedId(next[Math.min(selectedIndex, next.length - 1)].id);
  };
  // Scrolls only the tab strip, so the sheet itself never moves.
  React.useEffect(() => {
    const tab = selectedId ? tabRefs.current.get(selectedId) : undefined;
    const strip = tab?.parentElement;
    if (!tab || !strip) return;
    const left = tab.offsetLeft - strip.offsetLeft;
    if (left < strip.scrollLeft) strip.scrollTo({ left: left - 16, behavior: "smooth" });
    else if (left + tab.offsetWidth > strip.scrollLeft + strip.clientWidth)
      strip.scrollTo({ left: left + tab.offsetWidth - strip.clientWidth + 16, behavior: "smooth" });
  }, [selectedId, draft]);

  const panelId = `${idPrefix}-panel`;
  const tabId = (id: string) => `${idPrefix}-tab-${id}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title} description={description} initialExpanded>
      <form
        className="flex flex-col gap-3 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (onSave) {
            const cleaned = draft.filter((note) => !isBlank(note)).map((note) => ({ ...note, title: note.title.trim() }));
            if (JSON.stringify(cleaned) !== JSON.stringify(notes)) onSave(cleaned);
          }
          onOpenChange(false);
        }}
      >
        {readOnly && !draft.length ? (
          <p className="py-6 text-center text-subhead text-label-2">{emptyText}</p>
        ) : (
          <div className="flex items-start gap-2">
            <div
              role="tablist"
              aria-label="Notes"
              className="no-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto lg:flex-wrap"
              onKeyDown={(event) => {
                const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
                if (!step) return;
                event.preventDefault();
                const next = draft[(selectedIndex + step + draft.length) % draft.length];
                select(next.id);
                tabRefs.current.get(next.id)?.focus();
              }}
            >
              {draft.map((note, index) => (
                <button
                  key={note.id}
                  ref={(element) => {
                    if (element) tabRefs.current.set(note.id, element);
                    else tabRefs.current.delete(note.id);
                  }}
                  type="button"
                  role="tab"
                  id={tabId(note.id)}
                  aria-selected={note.id === selected?.id}
                  aria-controls={panelId}
                  tabIndex={note.id === selected?.id ? 0 : -1}
                  onClick={() => select(note.id)}
                  className={cn(
                    "flex h-9 max-w-40 shrink-0 items-center gap-1 rounded-full px-3 text-subhead font-semibold transition-colors lg:h-7",
                    note.id === selected?.id ? "bg-tint text-on-tint" : "bg-fill text-label-2 hover:text-label",
                  )}
                >
                  {withVisibility && !readOnly && (
                    note.isPublic ? (
                      <Globe aria-label="Public" className="size-3.5 shrink-0" />
                    ) : (
                      <Lock aria-label="Private" className="size-3.5 shrink-0" />
                    )
                  )}
                  <span className="truncate">{note.title.trim() || `Note ${index + 1}`}</span>
                </button>
              ))}
            </div>
            {!readOnly && (
              <button
                type="button"
                aria-label="Add note"
                className={cn(button({ variant: "tinted", size: "icon" }), "shrink-0")}
                disabled={draft.length >= NOTES_MAX}
                onClick={add}
              >
                <Plus aria-hidden className="size-4" />
              </button>
            )}
          </div>
        )}
        {selected && (
          <div role="tabpanel" id={panelId} aria-labelledby={tabId(selected.id)} className="flex flex-col gap-3">
            {readOnly ? (
              <>
                {selected.title.trim() && <h3 className="text-headline font-semibold">{selected.title}</h3>}
                <p className="whitespace-pre-wrap break-words rounded-xl bg-fill p-3 text-body">
                  {selected.body.trim() || <span className="text-label-2">No description.</span>}
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <input
                    aria-label="Title"
                    autoComplete="off"
                    placeholder="Title"
                    value={selected.title}
                    maxLength={NOTE_TITLE_LIMIT}
                    onChange={(event) => edit({ title: event.target.value } as Partial<N>)}
                    className={cn(fieldClass, "h-11 min-w-0 flex-1 px-3 font-semibold lg:h-9 lg:rounded-lg")}
                  />
                  <button
                    type="button"
                    aria-label="Delete note"
                    className={cn(button({ variant: "destructive", size: "icon" }), "shrink-0")}
                    onClick={remove}
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </button>
                </div>
                {withVisibility && (
                  <div className="flex flex-col gap-1.5">
                    <Segmented
                      label="Visibility"
                      idPrefix={`${idPrefix}-visibility`}
                      value={selected.isPublic ? "public" : "private"}
                      onChange={(value) => edit({ isPublic: value === "public" } as Partial<N>)}
                      options={[
                        { value: "private", label: <span className="flex items-center gap-1.5"><Lock aria-hidden className="size-3.5" />Private</span> },
                        { value: "public", label: <span className="flex items-center gap-1.5"><Globe aria-hidden className="size-3.5" />Public</span> },
                      ]}
                    />
                    <p className="text-footnote text-label-2">
                      {selected.isPublic
                        ? "Members of this campaign's cities can read this note."
                        : "Only you can read this note."}
                    </p>
                  </div>
                )}
                <textarea
                  aria-label="Description"
                  placeholder={placeholder}
                  rows={10}
                  value={selected.body}
                  maxLength={NOTE_BODY_LIMIT}
                  onChange={(event) => edit({ body: event.target.value } as Partial<N>)}
                  className={cn(fieldClass, "resize-y p-3")}
                />
              </>
            )}
          </div>
        )}
        {readOnly ? (
          <button type="submit" className={button({ variant: "gray" })}>
            Done
          </button>
        ) : (
          <>
            <button type="submit" className={button({ variant: "filled" })}>
              <Check aria-hidden className="size-4" />
              Save notes
            </button>
            <button type="button" className={button({ variant: "gray" })} onClick={() => onOpenChange(false)}>
              Cancel
            </button>
          </>
        )}
      </form>
    </Sheet>
  );
};
