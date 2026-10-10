import * as React from "react";

/** On phones the detail sits below a tall list, so bring it into view whenever the selection changes. */
export const useScrollToDetail = (selectedId: string | undefined) => {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!selectedId || !window.matchMedia("(max-width: 767px)").matches) return;
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedId]);
  return ref;
};
