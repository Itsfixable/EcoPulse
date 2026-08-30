const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Open-Meteo is free and unauthenticated but rate-limits bursts.
 * Retries 429 and 5xx with exponential backoff, honouring Retry-After.
 */
export async function fetchRetry(
  url: string,
  init?: RequestInit & { next?: { revalidate?: number } },
  attempts = 5,
): Promise<Response> {
  let lastStatus = 0;
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(url, init);
    if (res.ok) return res;
    lastStatus = res.status;
    if (res.status !== 429 && res.status < 500) return res;

    const header = Number(res.headers.get("retry-after"));
    const waitMs = Number.isFinite(header) && header > 0 ? header * 1000 : 500 * 2 ** i;
    await sleep(Math.min(waitMs, 8000));
  }
  throw new Error(`upstream ${lastStatus} after ${attempts} attempts`);
}
