import { useState, useCallback } from 'react';
import { createDeltaClient } from '../api/deltaClient';
import { normalizeOptionChain, topInstrumentsForCandles } from '../utils/dataUtils';

/**
 * Manages all Delta Exchange data fetching.
 *
 * Returns { assetData, loading, errors, fetchAll }
 *
 * assetData: Map<assetSymbol, { records, candlestickData }>
 *   records: normalized option chain records
 *   candlestickData: Array<{ symbol, option_type, chartData }>
 */
export default function useDeltaData() {
  const [assetData, setAssetData]   = useState(new Map());
  const [loading, setLoading]       = useState(false);
  const [errors, setErrors]         = useState([]);

  const fetchAll = useCallback(async (settings) => {
    const {
      baseUrl,
      assets,
      minOpenInterest,
      candlestick,
      resolution,
      lookbackHours,
      topPerType,
    } = settings;

    setLoading(true);
    setErrors([]);
    const results   = new Map();
    const newErrors = [];

    const client = createDeltaClient(baseUrl);

    for (const asset of assets) {
      try {
        // Fetch option chain tickers for this asset (all expiries)
        const rawTickers = await client.getOptionChain(asset);
        const records    = normalizeOptionChain(rawTickers, minOpenInterest);

        let candlestickData = [];

        if (candlestick && records.length > 0) {
          const nowSec  = Math.floor(Date.now() / 1000);
          const endSec  = nowSec;
          const startSec = nowSec - lookbackHours * 3600;

          const topCalls = topInstrumentsForCandles(records, 'call', topPerType);
          const topPuts  = topInstrumentsForCandles(records, 'put',  topPerType);
          const targets  = [...topCalls, ...topPuts];

          const cdResults = await Promise.all(
            targets.map(async (row) => {
              try {
                const chartData = await client.getOhlcCandles(
                  row.symbol,
                  resolution,
                  startSec,
                  endSec,
                );
                return { symbol: row.symbol, option_type: row.option_type, chartData };
              } catch {
                return { symbol: row.symbol, option_type: row.option_type, chartData: null };
              }
            })
          );
          candlestickData = cdResults;
        }

        results.set(asset, { records, candlestickData });
      } catch (err) {
        newErrors.push(`${asset}: ${err.message}`);
      }
    }

    setAssetData(results);
    setErrors(newErrors);
    setLoading(false);
  }, []);

  return { assetData, loading, errors, fetchAll };
}
