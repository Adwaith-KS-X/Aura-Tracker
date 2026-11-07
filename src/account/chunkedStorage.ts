type Store = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};
// Each SecureStore item stays below historical iOS payload limits, including Unicode.
export function splitUtf8(value: string, maxBytes = 1500): string[] {
  const chunks: string[] = []; let chunk = '', bytes = 0;
  for (const char of value) {
    const point = char.codePointAt(0)!;
    const size = point < 128 ? 1 : point < 2048 ? 2 : point < 65536 ? 3 : 4;
    if (bytes + size > maxBytes) { chunks.push(chunk); chunk = ''; bytes = 0; }
    chunk += char; bytes += size;
  }
  if (chunk || !chunks.length) chunks.push(chunk);
  return chunks;
}
export function createChunkedStorage(store: Store) {
  let pending: Promise<unknown> = Promise.resolve();
  function serialize<T>(action: () => Promise<T>): Promise<T> {
    const result = pending.then(action); pending = result.catch(() => {}); return result;
  }
  function indexKey(key: string) {
    if (!/^[\w.-]+$/.test(key)) throw new Error('Unsupported session storage key.');
    return `aura.${key}`;
  }
  async function manifest(key: string): Promise<string[]> {
    const raw = await store.getItem(indexKey(key));
    if (!raw) return [];
    const values: unknown = JSON.parse(raw);
    if (!Array.isArray(values) || values.length > 128 || !values.every(item => typeof item === 'string' && item.startsWith(`${indexKey(key)}.`))) throw new Error('Invalid saved session.');
    return values as string[];
  }
  return {
    getItem: (key: string) => serialize(async () => {
      const keys = await manifest(key); if (!keys.length) return null;
      const values = await Promise.all(keys.map(item => store.getItem(item)));
      return values.some(value => value === null) ? null : values.join('');
    }),
    setItem: (key: string, value: string) => serialize(async () => {
      const oldKeys = await manifest(key);
      const chunks = splitUtf8(value);
      if (chunks.length > 128) throw new Error('Session exceeds secure storage limit.');
      const generation = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      const keys = chunks.map((_, i) => `${indexKey(key)}.${generation}.${i}`);
      try {
        for (let i = 0; i < chunks.length; i++) await store.setItem(keys[i], chunks[i]);
        await store.setItem(indexKey(key), JSON.stringify(keys));
      } catch (error) {
        await Promise.allSettled(keys.map(item => store.removeItem(item))); throw error;
      }
      await Promise.allSettled(oldKeys.map(item => store.removeItem(item)));
    }),
    removeItem: (key: string) => serialize(async () => {
      const keys = await manifest(key);
      await store.removeItem(indexKey(key));
      await Promise.allSettled(keys.map(item => store.removeItem(item)));
    }),
  };
}
