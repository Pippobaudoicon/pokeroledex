import * as React from "react";

import type * as T from "../../../shared/types";

/** The latest generator output, shown in the results panel. */
export type GeneratorContent = T.Pokemon[] | T.Item[] | null;

const GeneratorContentContext = React.createContext<{
  content: GeneratorContent;
  setContent: (content: GeneratorContent) => void;
}>({ content: null, setContent: () => {} });

export const useGeneratorContent = () => React.useContext(GeneratorContentContext);

export const GeneratorContentProvider = ({ children }: { children: React.ReactNode }) => {
  const [content, setContent] = React.useState<GeneratorContent>(null);
  return <GeneratorContentContext.Provider value={{ content, setContent }}>{children}</GeneratorContentContext.Provider>;
};
