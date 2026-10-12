import * as React from "react";

export interface ListFilter<T> {
  id: string;
  filter: (entry: T) => boolean;
}

/**
 * Keeps one entry of a page's filter list up to date. Memoize `filter`: the entry is
 * replaced whenever it changes, merged with the latest list so filters never overwrite each other.
 */
export const useRegisterFilter = <T,>(
  id: string,
  filter: (entry: T) => boolean,
  setFilters: React.Dispatch<React.SetStateAction<ListFilter<T>[]>>,
) => {
  React.useEffect(() => {
    setFilters((filters) => [...filters.filter((other) => other.id !== id), { id, filter }]);
  }, [id, filter, setFilters]);
};
