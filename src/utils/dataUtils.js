/**
 * Data processing utilities for Delta Exchange option chain data.
 *
 * Delta Exchange option symbol format:
 *   {C|P}-{ASSET}-{STRIKE}-{DDMMYY}
 *   e.g. C-BTC-95200-200225  →  BTC CALL  95200  20-Feb-2025
 */

// ─── Constants ────────────────────────────────────────────────────────────────

export const METRICS = [
  { value: 'mark_price',  label: 'Mark Price'     },
  { value: 'open_interest', label: 'Open Interest' },
  { value: 'volume',      label: 'Volume'          },
  { value: 'bid_price',   label: 'Bid Price'       },
  { value: 'ask_price',   label: 'Ask Price'       },
  { value: 'bid_iv',      label: 'Bid IV'          },
  { value: 'ask_iv',      label: 'Ask IV'          },
  { value: 'delta',       label: 'Delta'           },
  { value: 'gamma',       label: 'Gamma'           },
  { value: 'theta',       label: 'Theta'           },
  { value: 'vega',        label: 'Vega'            },
];

/** Resolutions supported by Delta Exchange chart/history endpoint (in minutes) */
export const RESOLUTIONS = [
  { value: 1,     label: '1 Min'  },
  { value: 3,     label: '3 Min'  },
  { value: 5,     label: '5 Min'  },
  { value: 15,    label: '15 Min' },
  { value: 30,    label: '30 Min' },
  { value: 60,    label: '1 Hour' },
  { value: 120,   label: '2 Hour' },
  { value: 240,   label: '4 Hour' },
  { value: 360,   label: '6 Hour' },
  { value: 1440,  label: '1 Day'  },
  { value: 10080, label: '1 Week' },
];

// ─── Symbol Parsing ────────────────────────────────────────────────────────────

/**
 * Parse a Delta Exchange option symbol into its components.
 * "C-BTC-95200-200225" → { type: 'call', asset: 'BTC', strike: 95200, expiryDate: '2025-02-20', expiryMs: ... }
 * Returns null if the symbol cannot be parsed.
 */
export function parseOptionSymbol(symbol) {
  if (!symbol) return null;
  const parts = symbol.split('-');
  if (parts.length < 4) return null;

  const [typeChar, asset, strikeStr, expiryStr] = parts;
  if (!['C', 'P'].includes(typeChar)) return null;

  const optionType = typeChar === 'C' ? 'call' : 'put';
  const strike = parseFloat(strikeStr);
  if (isNaN(strike)) return null;

  // expiryStr: DDMMYY  e.g. "200225" → 20-Feb-25
  if (expiryStr.length < 6) return null;
  const day   = expiryStr.slice(0, 2);
  const month = expiryStr.slice(2, 4);
  const year  = `20${expiryStr.slice(4, 6)}`;
  // ISO date
  const expiryDate = `${year}-${month}-${day}`;
  const expiryMs = new Date(`${year}-${month}-${day}T08:00:00Z`).getTime();

  return { optionType, asset, strike, expiryDate, expiryMs, expiryRaw: expiryStr };
}

/**
 * Format a Delta expiry raw string (DDMMYY) into display format DD-MM-YYYY.
 */
export function formatExpiryRaw(expiryStr) {
  if (!expiryStr || expiryStr.length < 6) return expiryStr;
  return `${expiryStr.slice(0, 2)}-${expiryStr.slice(2, 4)}-20${expiryStr.slice(4, 6)}`;
}

// ─── Data Normalization ────────────────────────────────────────────────────────

/**
 * Normalize a raw Delta Exchange ticker object into a flat record.
 * Compatible with the shape expected by StrikeChart and OptionChainTable.
 *
 * ticker shape (from GET /v2/tickers?contract_types=call_options,put_options):
 * {
 *   symbol, contract_type, strike_price, mark_price, spot_price, oi, volume,
 *   quotes: { best_bid, best_ask, bid_iv, ask_iv, bid_size, ask_size },
 *   greeks: { delta, gamma, rho, theta, vega },
 *   timestamp, product_id
 * }
 */
export function normalizeTicker(ticker) {
  const sym = parseOptionSymbol(ticker.symbol);
  if (!sym) return null;

  const { optionType, asset, strike, expiryDate, expiryMs, expiryRaw } = sym;
  const quotes  = ticker.quotes  ?? {};
  const greeks  = ticker.greeks  ?? {};

  return {
    symbol:        ticker.symbol,
    product_id:    ticker.product_id,
    asset,
    option_type:   optionType,
    strike:        strike,
    expiry_date:   expiryDate,
    expiry_ms:     expiryMs,
    expiry_raw:    expiryRaw,

    // Pricing
    mark_price:    parseFloat(ticker.mark_price) || null,
    spot_price:    parseFloat(ticker.spot_price) || null,
    bid_price:     parseFloat(quotes.best_bid)   || null,
    ask_price:     parseFloat(quotes.best_ask)   || null,
    bid_iv:        parseFloat(quotes.bid_iv)     || null,
    ask_iv:        parseFloat(quotes.ask_iv)     || null,
    bid_size:      parseFloat(quotes.bid_size)   || null,
    ask_size:      parseFloat(quotes.ask_size)   || null,

    // Market data
    open_interest: parseFloat(ticker.oi)         || null,
    volume:        parseFloat(ticker.volume)      || null,
    turnover_usd:  parseFloat(ticker.turnover_usd) || null,

    // Greeks
    delta: parseFloat(greeks.delta) || null,
    gamma: parseFloat(greeks.gamma) || null,
    rho:   parseFloat(greeks.rho)   || null,
    theta: parseFloat(greeks.theta) || null,
    vega:  parseFloat(greeks.vega)  || null,
  };
}

/**
 * Take a raw ticker list from the Delta API, normalize it,
 * filter by minOpenInterest, and return a clean array.
 */
export function normalizeOptionChain(tickers, minOpenInterest = 0) {
  const records = [];
  for (const t of tickers) {
    const r = normalizeTicker(t);
    if (!r) continue;
    if ((r.open_interest ?? 0) < minOpenInterest) continue;
    records.push(r);
  }
  return records;
}

// ─── Grouping / Sorting ────────────────────────────────────────────────────────

/**
 * Group normalized records by expiry_ms → Map<expiryMs, records[]>
 * Sorted by expiry ascending.
 */
export function groupByExpiry(records) {
  const map = new Map();
  for (const row of records) {
    const key = row.expiry_ms;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return new Map([...map.entries()].sort((a, b) => a[0] - b[0]));
}

/**
 * Return the top-N records for a given option type, sorted by open_interest desc.
 */
export function topInstrumentsForCandles(records, optionType, topN) {
  return records
    .filter((r) => r.option_type === optionType)
    .sort((a, b) => (b.open_interest ?? 0) - (a.open_interest ?? 0))
    .slice(0, topN);
}

/**
 * Format a millisecond timestamp as YYYY-MM-DD display string.
 */
export function expiryLabel(timestampMs) {
  return new Date(timestampMs).toISOString().slice(0, 10);
}

/**
 * Get distinct expiry dates (label + raw) from a normalized records array.
 * Returns sorted array of { expiryMs, expiryDate, expiryRaw, displayLabel }.
 */
export function getExpiryOptions(records) {
  const seen = new Map();
  for (const r of records) {
    if (!seen.has(r.expiry_ms)) {
      seen.set(r.expiry_ms, {
        expiryMs:     r.expiry_ms,
        expiryDate:   r.expiry_date,
        expiryRaw:    r.expiry_raw,
        displayLabel: r.expiry_date,
      });
    }
  }
  return [...seen.values()].sort((a, b) => a.expiryMs - b.expiryMs);
}

// ─── Chart Data Helpers ────────────────────────────────────────────────────────

/**
 * Build Highcharts series for a strike chart.
 * Y-axis = metric, X-axis = strike, one series per option type.
 */
export function buildStrikeSeriesForExpiry(rows, metric) {
  const calls = rows
    .filter((r) => r.option_type === 'call' && r[metric] != null)
    .sort((a, b) => a.strike - b.strike);
  const puts = rows
    .filter((r) => r.option_type === 'put' && r[metric] != null)
    .sort((a, b) => a.strike - b.strike);

  const series = [];
  if (calls.length) {
    series.push({
      name: 'CE (Call)',
      data: calls.map((r) => [r.strike, r[metric]]),
      color: '#26a69a',
      marker: { enabled: calls.length < 30 },
    });
  }
  if (puts.length) {
    series.push({
      name: 'PE (Put)',
      data: puts.map((r) => [r.strike, r[metric]]),
      color: '#ef5350',
      marker: { enabled: puts.length < 30 },
    });
  }
  return series;
}

/**
 * Build OHLCV arrays for Highcharts from TradingView chart/history response.
 * TradingView format: { s: "ok", t: [...], o: [...], h: [...], l: [...], c: [...], v: [...] }
 * t = timestamps (Unix seconds), o = open, h = high, l = low, c = close, v = volume
 */
export function buildCandlestickSeries(chartData) {
  if (!chartData || !chartData.t || !Array.isArray(chartData.t) || chartData.t.length === 0) {
    return null;
  }

  const { t, o, h, l, c, v } = chartData;
  const ohlcData = t.map((time, i) => [time * 1000, o[i], h[i], l[i], c[i]]);
  const volData  = t.map((time, i) => [time * 1000, v?.[i] ?? 0]);

  return { ohlcData, volData };
}

// ─── CSV Export ────────────────────────────────────────────────────────────────

/**
 * Convert normalized option chain records to CSV string.
 * Includes every field shown in the frontend table.
 */
export function recordsToCsv(records) {
  const headers = [
    'symbol', 'product_id', 'asset', 'option_type', 'strike',
    'expiry_date', 'expiry_raw',
    'spot_price',
    'mark_price', 'bid_price', 'ask_price', 'bid_size', 'ask_size',
    'bid_iv', 'ask_iv',
    'open_interest', 'volume', 'turnover_usd',
    'delta', 'gamma', 'theta', 'vega', 'rho',
  ];
  const rows = records.map((r) =>
    headers.map((h) => {
      const v = r[h];
      if (v == null) return '';
      // Wrap strings containing commas/quotes in double-quotes
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

/**
 * Convert candlestick data (array of { symbol, option_type, chartData }) to CSV.
 * chartData is TradingView format: { s, t, o, h, l, c, v } where each field is an array.
 */
export function candlestickToCsv(candlestickData) {
  const headers = [
    'symbol', 'option_type', 'timestamp_unix', 'datetime_utc',
    'open', 'high', 'low', 'close', 'volume',
  ];
  const rows = [];
  for (const item of candlestickData) {
    const cd = item.chartData;
    if (!cd || !cd.t || !Array.isArray(cd.t)) continue;
    const { t, o, h, l, c, v } = cd;
    for (let i = 0; i < t.length; i++) {
      const time = t[i];
      const dt = new Date(time * 1000).toISOString();
      rows.push([
        item.symbol,
        item.option_type,
        time,
        dt,
        o?.[i] ?? '',
        h?.[i] ?? '',
        l?.[i] ?? '',
        c?.[i] ?? '',
        v?.[i] ?? '',
      ].join(','));
    }
  }
  return [headers.join(','), ...rows].join('\n');
}

/**
 * Trigger a browser CSV file download.
 */
export function downloadCsv(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
