import { useState, useMemo, useEffect } from 'react';
import ControlPanel     from './components/ControlPanel';
import MobileControlBar from './components/MobileControlBar';
import StrikeChart      from './components/StrikeChart';
import CandlestickChart from './components/CandlestickChart';
import OptionChainTable from './components/OptionChainTable';
import useDeltaData     from './hooks/useDeltaData';
import { PROD_BASE_URL } from './api/deltaClient';
import { recordsToCsv, downloadCsv } from './utils/dataUtils';
import './App.css';

const DEFAULT_SETTINGS = {
  baseUrl:          PROD_BASE_URL,
  assets:           ['BTC', 'ETH'],
  metric:           'mark_price',
  minOpenInterest:  0,
  candlestick:      true,
  resolution:       60,
  lookbackHours:    24,
  topPerType:       5,
};

const TABS = ['Candlestick', 'Strike Charts', 'Option Chain'];

export default function App() {
  /* ── Shared state ── */
  const [settings, setSettings]       = useState(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab]     = useState('Candlestick');
  const [activeAsset, setActiveAsset] = useState(null);

  /* ── Mobile-specific state ── */
  const [mobileAssetIdx, setMobileAssetIdx] = useState(0);
  const [mobileOptType,  setMobileOptType]  = useState('call'); // 'call' | 'put'
  const [mobileSymIdx,   setMobileSymIdx]   = useState(0);

  const { assetData, loading, errors, fetchAll } = useDeltaData();

  /* ── Fetch handler ── */
  async function handleFetch() {
    const results = await fetchAll(settings);
    if (settings.assets.length > 0) setActiveAsset(settings.assets[0]);
    setMobileSymIdx(0);
    setMobileAssetIdx(0);
    // Always land on Candlestick tab – fall back to Strike Charts if not fetched
    setActiveTab(settings.candlestick ? 'Candlestick' : 'Strike Charts');
  }

  /* ── Desktop: current asset / data ── */
  const assets = [...assetData.keys()];
  const cur    = activeAsset && assetData.has(activeAsset)
    ? activeAsset
    : assets[0] ?? null;
  const data   = cur ? assetData.get(cur) : null;

  /* ── Mobile: cycle through fetched assets ── */
  const effectiveAssets = assets.length > 0 ? assets : settings.assets;
  const mobileAsset     = effectiveAssets[mobileAssetIdx % effectiveAssets.length] ?? 'BTC';
  const mobileData      = assetData.has(mobileAsset)
    ? assetData.get(mobileAsset)
    : (assets.length > 0 ? assetData.get(assets[0]) : null);

  /* ── Mobile: symbols sorted closest-to-spot first ── */
  const mobileSymbols = useMemo(() => {
    if (!mobileData?.records?.length) return [];
    const spot = mobileData.records.find((r) => r.spot_price)?.spot_price ?? 0;
    return [...mobileData.records]
      .filter((r) => r.option_type === mobileOptType)
      .sort((a, b) => Math.abs(a.strike - spot) - Math.abs(b.strike - spot));
  }, [mobileData, mobileOptType]);

  /* ── Reset symbol index when asset / option-type changes ── */
  useEffect(() => { setMobileSymIdx(0); }, [mobileAsset, mobileOptType]);
  useEffect(() => { if (!loading) setMobileSymIdx(0); }, [loading]);

  const mobileSymbol     = mobileSymbols[mobileSymIdx] ?? null;
  const mobileSpot       = mobileData?.records?.find((r) => r.spot_price)?.spot_price ?? null;
  const mobileCandleItem =
    mobileData?.candlestickData?.find((cd) => cd.symbol === mobileSymbol?.symbol)
    ?? mobileData?.candlestickData?.[0]
    ?? null;
  const mobileStrikeRecords = useMemo(() => {
    if (!mobileData?.records) return [];
    return mobileData.records.filter((r) => r.option_type === mobileOptType);
  }, [mobileData, mobileOptType]);

  /* ── Mobile handlers ── */
  function toggleMobileAsset() {
    setMobileAssetIdx((i) => (i + 1) % effectiveAssets.length);
  }
  function toggleMobileOptType() {
    setMobileOptType((t) => (t === 'call' ? 'put' : 'call'));
  }
  function navigateMobileSymbol(dir) {
    setMobileSymIdx((i) => Math.max(0, Math.min(mobileSymbols.length - 1, i + dir)));
  }

  return (
    <div className="app-layout">

      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <ControlPanel
        settings={settings}
        onChange={setSettings}
        onFetch={handleFetch}
        loading={loading}
      />

      <main className="main-content">

        {/* ── Mobile top bar ── */}
        <MobileControlBar
          settings={settings}
          onChange={setSettings}
          onFetch={handleFetch}
          loading={loading}
          asset={mobileAsset}
          onAssetToggle={toggleMobileAsset}
          optionType={mobileOptType}
          onOptionTypeToggle={toggleMobileOptType}
          symbols={mobileSymbols}
          symbolIndex={mobileSymIdx}
          onSymbolNav={navigateMobileSymbol}
          spotPrice={mobileSpot}
        />

        {/* ── Desktop header (hidden on mobile) ── */}
        <header className="app-header desktop-only">
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

        {/* ── Shared banners ── */}
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

        {/* ═════════════════════════════════════════════
            DESKTOP CONTENT  (hidden on mobile)
        ══════════════════════════════════════════════ */}
        {!loading && data && (
          <div className="desktop-only desktop-content-wrapper">
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
                const disabled =
                  t === 'Candlestick' && data.candlestickData.length === 0;
                return (
                  <button
                    key={t}
                    className={`nav-tab ${activeTab === t ? 'nav-tab--active' : ''} ${
                      disabled ? 'nav-tab--disabled' : ''
                    }`}
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

              {activeTab === 'Candlestick' &&
                data.candlestickData.length > 0 && (
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
          </div>
        )}

        {/* Desktop empty state */}
        {!loading && assets.length === 0 && (
          <div className="empty-state desktop-only">
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

        {/* ═════════════════════════════════════════════
            MOBILE CONTENT  (hidden on desktop)
        ══════════════════════════════════════════════ */}
        <div className="mobile-only mobile-content">
          {!loading && mobileData && (
            <>
              {/* Mobile summary strip */}
              <div className="mobile-summary-strip">
                <div className="mobile-summary-item">
                  <span className="mobile-summary-label">Asset</span>
                  <span className="mobile-summary-value">{mobileAsset}</span>
                </div>
                <div className="mobile-summary-item">
                  <span className="mobile-summary-label">Type</span>
                  <span
                    className={`mobile-summary-value ${
                      mobileOptType === 'call'
                        ? 'mobile-summary-call'
                        : 'mobile-summary-put'
                    }`}
                  >
                    {mobileOptType === 'call' ? 'Call (CE)' : 'Put (PE)'}
                  </span>
                </div>
                <div className="mobile-summary-item">
                  <span className="mobile-summary-label">Spot</span>
                  <span className="mobile-summary-value mobile-summary-spot">
                    {mobileSpot != null
                      ? `$${Number(mobileSpot).toLocaleString()}`
                      : '—'}
                  </span>
                </div>
                <div className="mobile-summary-item">
                  <span className="mobile-summary-label">Strikes</span>
                  <span className="mobile-summary-value">{mobileSymbols.length}</span>
                </div>
              </div>

              {/* Candlestick — primary view */}
              {mobileCandleItem ? (
                <div className="mobile-chart-wrap">
                  <CandlestickChart
                    asset={mobileAsset}
                    symbol={mobileCandleItem.symbol}
                    optionType={mobileCandleItem.option_type}
                    resolution={settings.resolution}
                    chartData={mobileCandleItem.chartData}
                  />
                </div>
              ) : (
                <div className="mobile-chart-wrap">
                  {mobileStrikeRecords.length > 0 ? (
                    <StrikeChart
                      asset={mobileAsset}
                      records={mobileStrikeRecords}
                      metric={settings.metric}
                    />
                  ) : (
                    <div className="mobile-no-data">
                      No {mobileOptType === 'call' ? 'CE' : 'PE'} data for{' '}
                      {mobileAsset}.
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {!loading && !mobileData && (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <h2>No data yet</h2>
              <p>Tap <strong>Fetch</strong> to load option chain data.</p>
            </div>
          )}

          {loading && (
            <div className="mobile-loading">
              <div className="mobile-loading-spinner" />
              <span>Loading…</span>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
