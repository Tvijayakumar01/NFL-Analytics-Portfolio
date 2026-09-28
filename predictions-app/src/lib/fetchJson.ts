import { useEffect, useState } from "react";

const cache = new Map<string, Promise<unknown>>();

/** Fetches a file from the site's data/ folder once per session; later callers share the same promise. */
export function loadJson<T>(file: string): Promise<T> {
  let p = cache.get(file);
  if (!p) {
    // BASE_URL is "./", so this resolves relative to index.html and works under a GitHub Pages subpath.
    p = fetch(`${import.meta.env.BASE_URL}data/${file}`).then((res) => {
      if (!res.ok) throw new Error(`Failed to load ${file} (${res.status})`);
      return res.json();
    });
    p.catch(() => cache.delete(file));
    cache.set(file, p);
  }
  return p as Promise<T>;
}

export function useJson<T>(file: string) {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: string | null }>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let alive = true;
    loadJson<T>(file)
      .then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((err: Error) => alive && setState({ data: null, loading: false, error: err.message }));
    return () => {
      alive = false;
    };
  }, [file]);

  return state;
}
