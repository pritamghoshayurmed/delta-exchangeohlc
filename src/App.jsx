import { useState } from 'react';
import ControlPanel     from './components/ControlPanel';
import StrikeChart      from './components/StrikeChart';
import CandlestickChart from './components/CandlestickChart';
import OptionChainTable from './components/OptionChainTable';
import useDeltaData     from './hooks/useDeltaData';
import { PROD_BASE_URL } from './api/deltaClient';
import { recordsToCsv, candlestickToCsv, downloadCsv } from './utils/dataUtils';
import './App.css';

const DEFAULT_SETTINGS = {
  baseUrl:          PROD_BASE_URL,
  assets:           ['BTC', 'ETH'],
  metric:           'mark_price',
  minOpenInterest:  0,
  candlestick:      false,
  resolution:       60,
  lookbackHours:    24,
  topPerType:       5,
};

const TABS = ['Strike Charts', 'Candlestick', 'Option Chain'];

export default function App() {
  const [settings, setSettings]       = useState(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab]     = useState('Strike Charts');
  const [activeAsset, setActiveAsset] = useState(null);

  const { assetData, loading, errors, fetchAll } = useDeltaData();

  async function handleFetch() {
    const results = await fetchAll(settings);
    if (settings.assets.length > 0) setActiveAsset(settings.assets[0]);

    // Auto-save a CSV for every fetched asset
    const ts = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
    for (const [asset, { records, candlestickData }] of results) {
      if (records.length > 0) {
        downloadCsv(recordsToCsv(records), `${asset}_option_chain_${ts}.csv`);
      }
      if (candlestickData && candlestickData.length > 0) {
        downloadCsv(candlestickToCsv(candlestickData), `${asset}_candlestick_${ts}.csv`);
      }
    }
  }

  const assets = [...assetData.keys()];
  const cur    = activeAsset && assetData.has(activeAsset)
    ? activeAsset
    : assets[0] ?? null;
  const data   = cur ? assetData.get(cur) : null;

  return (
    <div className="app-layout">
      <ControlPanel
        settings={settings}
        onChange={setSettings}
        onFetch={handleFetch}
        loading={loading}
      />

      <main className="main-content">
        <header className="app-header">
          <div className="app-title-row">
            <h1 className="app-title">
              <span className="brand">Delta Exchange</span> Options Dashboard
            </h1>
          </div>

          {assets.length > 0 && (
            <div className="currency-tabs">
              {assets.map((a) => (
                <button
                  key={a}
                  className={`cur-tab ${a === cur ? 'cur-tab--active' : ''}`}
                  onClick={() => setActiveAsset(a)}
                >
                  {a}
                </button>
              ))}
            </div>
          )}
        </header>

        {errors.length > 0 && (
          <div className="error-banner">
            {errors.map((e, i) => <div key={i}>⚠ {e}</div>)}
          </div>
        )}

        {loading && (
          <div className="loading-banner">
            Fetching option chain from Delta Exchange…
          </div>
        )}

        {!loading && data && (
          <>
            {/* Summary bar */}
            <div className="summary-bar">
              <span className="summary-item">
                <span className="summary-label">Strikes:</span>{' '}
                <span className="summary-value">{[...new Set(data.records.map((r) => r.strike))].length}</span>
              </span>
              <span className="summary-item">
                <span className="summary-label">Expiries:</span>{' '}
                <span className="summary-value">{[...new Set(data.records.map((r) => r.expiry_date))].length}</span>
              </span>
              <span className="summary-item">
                <span className="summary-label">Total Contracts:</span>{' '}
                <span className="summary-value">{data.records.length}</span>
              </span>
              {data.records[0]?.spot_price && (
                <span className="summary-item">
                  <span className="summary-label">Spot:</span>{' '}
                  <span className="summary-value summary-spot">
                    ${Number(data.records[0].spot_price).toLocaleString()}
                  </span>
                </span>
              )}
            </div>

            {/* Tab nav */}
            <nav className="tab-nav">
              {TABS.map((t) => {
                const disabled = t === 'Candlestick' && data.candlestickData.length === 0;
                return (
                  <button
                    key={t}
                    className={`nav-tab ${activeTab === t ? 'nav-tab--active' : ''} ${disabled ? 'nav-tab--disabled' : ''}`}
                    onClick={() => !disabled && setActiveTab(t)}
                  >
                    {t}
                    {t === 'Option Chain' && (
                      <span className="badge">{data.records.length}</span>
                    )}
                    {t === 'Candlestick' && data.candlestickData.length > 0 && (
                      <span className="badge">{data.candlestickData.length}</span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="tab-content">
              {activeTab === 'Strike Charts' && (
                <StrikeChart
                  asset={cur}
                  records={data.records}
                  metric={settings.metric}
                />
              )}

              {activeTab === 'Candlestick' && data.candlestickData.length > 0 && (
                <div>
                  {data.candlestickData.map((item) => (
                    <CandlestickChart
                      key={item.symbol}
                      asset={cur}
                      symbol={item.symbol}
                      optionType={item.option_type}
                      resolution={settings.resolution}
                      chartData={item.chartData}
                    />
                  ))}
                </div>
              )}

              {activeTab === 'Option Chain' && (
                <OptionChainTable
                  asset={cur}
                  records={data.records}
                />
              )}
            </div>
          </>
        )}

        {!loading && assets.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h2>No data loaded yet</h2>
            <p>
              Select your underlying assets in the left panel and click{' '}
              <strong>▶ Fetch Data</strong>.
            </p>
            <p className="empty-note">
              Uses the Delta Exchange public REST API — no authentication required
              for market data.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
