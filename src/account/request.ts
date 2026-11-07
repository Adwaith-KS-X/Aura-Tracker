// AbortController works across native and web without requiring AbortSignal.timeout.
export const fetchWithTimeout: typeof fetch = async (input, init) => {
  const controller = new AbortController();
  const upstream = init?.signal;
  const abort = () => controller.abort();
  if (upstream?.aborted) abort(); else upstream?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, 20000);
  try { return await fetch(input, { ...init, signal: controller.signal }); }
  finally { clearTimeout(timer); upstream?.removeEventListener('abort', abort); }
};
