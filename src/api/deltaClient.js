/**
 * Delta Exchange public API client (v2).
 *
 * All requests are routed through the Vite dev-server proxy so the browser
 * never contacts api.india.delta.exchange directly (avoids CORS blocks):
 *   /delta-proxy/*      → https://api.india.delta.exchange
 *   /delta-test-proxy/* → https://cdn-ind.testnet.deltaex.org
 *
 * Reference: https://docs.delta.exchange/
 */

export const PROD_BASE_URL = 'https://api.india.delta.exchange';
export const TEST_BASE_URL = 'https://cdn-ind.testnet.deltaex.org';

/** Map a real base URL to the Vite proxy prefix. */
function proxyPrefix(baseUrl) {
  if (baseUrl.startsWith('https://cdn-ind.testnet')) return '/delta-test-proxy';
  return '/delta-proxy';
}

async function parseErrorPayload(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function formatHttpError(status, path, payload) {
  if (payload?.error && typeof payload.error === 'string') {
    const message = payload?.message ? `: ${payload.message}` : '';
    return `HTTP ${status} for ${path} (${payload.error}${message})`;
  }

  if (payload?.error?.code) {
    return `HTTP ${status} for ${path} (${payload.error.code})`;
  }

  if (payload?.raw) {
    const compact = String(payload.raw).replace(/\s+/g, ' ').trim();
    const clipped = compact.slice(0, 220);
    return `HTTP ${status} for ${path} (${clipped})`;
  }

  return `HTTP ${status} for ${path}`;
}

/**
 * Generic GET helper — uses Vite's dev-server proxy to avoid CORS.
 */
async function _get(baseUrl, path, params = {}) {
  const prefix = proxyPrefix(baseUrl);
  const url = new URL(`${prefix}${path}`, window.location.origin);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  });

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
    },
  });
  if (!response.ok) {
    const errorPayload = await parseErrorPayload(response);
    throw new Error(formatHttpError(response.status, path, errorPayload));
  }

  const payload = await response.json();
  if (!payload.success) {
    throw new Error(`Delta API error for ${path}: ${JSON.stringify(payload.error ?? payload)}`);
  }
  return payload.result ?? [];
}

/**
 * Paginate through a Delta Exchange list endpoint, collecting all pages.
 * The API returns cursor-based pagination via payload.meta.after.
 */
async function _getAll(baseUrl, path, params = {}) {
  const results = [];
  let after = null;
  const PAGE_SIZE = 1000;

  do {
    const pageParams = { ...params, page_size: PAGE_SIZE, ...(after ? { after } : {}) };
    const prefix = proxyPrefix(baseUrl);
    const url = new URL(`${prefix}${path}`, window.location.origin);
    Object.entries(pageParams).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    });

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      const errorPayload = await parseErrorPayload(response);
      throw new Error(formatHttpError(response.status, path, errorPayload));
    }

    const payload = await response.json();
    if (!payload.success) {
      throw new Error(`Delta API error for ${path}: ${JSON.stringify(payload.error ?? payload)}`);
    }

    const page = payload.result ?? [];
    results.push(...page);

    after = payload.meta?.after ?? null;
    // Stop if we got a partial page (no more data)
    if (page.length < PAGE_SIZE) after = null;
  } while (after);

  return results;
}

/**
 * Create a configured Delta Exchange REST client.
 */
export function createDeltaClient(baseUrl = PROD_BASE_URL) {
  const base = baseUrl.replace(/\/$/, '');

  return {
    /**
     * Fetch all live option products for a given underlying asset.
     * Used to discover available expiry dates.
     * GET /v2/products?contract_types=call_options,put_options&states=live
     */
    getOptionProducts(underlyingAssetSymbol) {
      return _getAll(base, '/v2/products', {
        contract_types: 'call_options,put_options',
        states: 'live',
      }).then((products) =>
        // Filter by underlying asset (the product.underlying_asset.symbol field)
        products.filter(
          (p) =>
            p.underlying_asset?.symbol === underlyingAssetSymbol ||
            p.contract_type === 'call_options' ||
            p.contract_type === 'put_options'
        )
      );
    },

    /**
     * Fetch option chain tickers for a specific underlying asset.
     * Optionally filtered by expiry date (DD-MM-YYYY).
     * GET /v2/tickers?contract_types=call_options,put_options&underlying_asset_symbols=BTC[&expiry_date=...]
     */
    getOptionChain(underlyingAssetSymbol, expiryDate = '') {
      return _get(base, '/v2/tickers', {
        contract_types: 'call_options,put_options',
        underlying_asset_symbols: underlyingAssetSymbol,
        ...(expiryDate ? { expiry_date: expiryDate } : {}),
      });
    },

    /**
     * Fetch OHLC candlestick data for a given symbol and time range.
     * start / end are Unix timestamps in SECONDS.
     * GET /v2/history/candles?symbol=C-BTC-95200-200225&resolution=5m&start=...&end=...
     *
     * Supported resolutions: 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 1d, 1w
     */
    getOhlcCandles(symbol, resolution, startSec, endSec) {
      return _get(base, '/v2/history/candles', {
        symbol,
        resolution,
        start: String(startSec),
        end:   String(endSec),
      });
    },
  };
}
