import { Word } from "../types/index.ts";

interface SearchWorkerGlobalScope extends DedicatedWorkerGlobalScope {
  dataStore: Word[];
}

const ctx = self as unknown as SearchWorkerGlobalScope;

ctx.onmessage = (e: MessageEvent) => {
  const { type, data, query } = e.data;

  if (type === "SET_DATA") {
    ctx.dataStore = data as Word[];
  } else if (type === "SEARCH") {
    if (!ctx.dataStore) {
      ctx.postMessage([]);
      return;
    }

    if (!query) {
      // Если запрос пустой, возвращаем null, чтобы UI использовал полный список
      ctx.postMessage(null);
      return;
    }

    const lowerQuery = (query as string).toLowerCase();
    // Фильтрация по заранее подготовленной строке _searchStr
    const results = ctx.dataStore.filter(
      (w) => w._searchStr && w._searchStr.includes(lowerQuery),
    );
    ctx.postMessage(results);
  }
};
