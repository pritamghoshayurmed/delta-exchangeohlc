import { useState } from 'react';
import { RESOLUTIONS } from '../utils/dataUtils';
import styles from './MobileControlBar.module.css';

const LOOKBACK_OPTIONS = [1, 2, 4, 6, 12, 24, 48, 72, 168];
const TOP_N_OPTIONS    = [3, 5, 10, 15, 20];

/**
 * Compact top control bar shown only on mobile (≤768 px).
 * Layout mirrors the hand-drawn sketch:
 *   Row 1 → resolution | lookback | top-N | FETCH
 *   Row 2 → [ASSET toggle] [OPT-TYPE toggle] strike-pill  spot-pill
 *   Row 3 → ‹  symbol-name  ›   (n / total, sorted closest-to-spot)
 */
export default function MobileControlBar({
  settings,
  onChange,
  onFetch,
  loading,
  /* single active asset string, e.g. "BTC" */
  asset,
  /* () => void  — cycles to next fetched asset */
  onAssetToggle,
  /* 'call' | 'put' */
  optionType,
  /* () => void */
  onOptionTypeToggle,
  /* sorted records array (closest strike first) */
  symbols,
  symbolIndex,
  /* (dir: -1 | 1) => void */
  onSymbolNav,
  spotPrice,
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  function set(key, value) {
    onChange({ ...settings, [key]: value });
  }

  const sym    = symbols[symbolIndex] ?? null;
  const strike = sym?.strike;

  return (
    <div className={styles.bar}>

      {/* ── Row 1: Quick settings ── */}
      <div className={styles.row}>
        <div className={styles.pillGroup}>

          {/* Gear icon toggles the expanded settings panel */}
          <button
            className={`${styles.iconBtn} ${settingsOpen ? styles.iconBtnActive : ''}`}
            onClick={() => setSettingsOpen((o) => !o)}
            aria-label="Settings"
          >
            ⚙
          </button>

          <label className={styles.pillWrap}>
            <span className={styles.pillHint}>Res</span>
            <select
              className={styles.pill}
              value={settings.resolution}
              onChange={(e) => set('resolution', Number(e.target.value))}
            >
              {RESOLUTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </label>

          <label className={styles.pillWrap}>
            <span className={styles.pillHint}>LB</span>
            <select
              className={styles.pill}
              value={settings.lookbackHours}
              onChange={(e) => set('lookbackHours', Number(e.target.value))}
            >
              {LOOKBACK_OPTIONS.map((h) => (
                <option key={h} value={h}>{h}h</option>
              ))}
            </select>
          </label>

          <label className={styles.pillWrap}>
            <span className={styles.pillHint}>Top</span>
            <select
              className={styles.pill}
              value={settings.topPerType}
              onChange={(e) => set('topPerType', Number(e.target.value))}
            >
              {TOP_N_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>

        <button
          className={styles.fetchBtn}
          onClick={onFetch}
          disabled={loading}
        >
          {loading ? '⏳' : 'Fetch'}
        </button>
      </div>

      {/* ── Expanded settings panel ── */}
      {settingsOpen && (
        <div className={styles.expandedSettings}>
          <label className={styles.settingsRow}>
            <span className={styles.settingsLabel}>API</span>
            <select
              className={styles.settingsSelect}
              value={settings.baseUrl}
              onChange={(e) => set('baseUrl', e.target.value)}
            >
              <option value="https://api.india.delta.exchange">Production (India)</option>
              <option value="https://cdn-ind.testnet.deltaex.org">Testnet</option>
            </select>
          </label>
          <label className={`${styles.settingsRow} ${styles.checkRow}`}>
            <input
              type="checkbox"
              checked={settings.candlestick}
              onChange={(e) => set('candlestick', e.target.checked)}
            />
            <span className={styles.settingsLabel}>Fetch candlestick charts</span>
          </label>
          <label className={styles.settingsRow}>
            <span className={styles.settingsLabel}>Min OI</span>
            <input
              type="number"
              className={styles.settingsInput}
              min={0}
              step={1}
              value={settings.minOpenInterest}
              onChange={(e) => set('minOpenInterest', parseFloat(e.target.value) || 0)}
            />
          </label>
        </div>
      )}

      {/* ── Row 2: Asset toggle · Option-type toggle · Strike / Spot pills ── */}
      <div className={styles.row}>
        <button
          className={styles.assetToggle}
          onClick={onAssetToggle}
          title="Tap to switch asset"
        >
          {asset}
          <span className={styles.toggleArrow}>⇄</span>
        </button>

        <button
          className={`${styles.typeToggle} ${
            optionType === 'call' ? styles.callToggle : styles.putToggle
          }`}
          onClick={onOptionTypeToggle}
          title="Tap to switch option type"
        >
          {optionType === 'call' ? 'CE' : 'PE'}
          <span className={styles.toggleArrow}>⇄</span>
        </button>

        <div className={styles.priceInfo}>
          {strike != null && (
            <span className={styles.strikePill}>
              ⚡&nbsp;{Number(strike).toLocaleString()}
            </span>
          )}
          {spotPrice != null && (
            <span className={styles.spotPill}>
              ${Number(spotPrice).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* ── Row 3: Symbol navigator ── */}
      <div className={styles.symRow}>
        <button
          className={styles.navBtn}
          onClick={() => onSymbolNav(-1)}
          disabled={symbolIndex <= 0}
          aria-label="Previous symbol"
        >
          ‹
        </button>

        <div className={styles.symCenter}>
          <span className={styles.symName}>
            {sym?.symbol ?? (symbols.length === 0 ? 'Tap Fetch to load' : '—')}
          </span>
          {symbols.length > 0 && (
            <span className={styles.symMeta}>
              {symbolIndex + 1}&nbsp;/&nbsp;{symbols.length}
              &nbsp;·&nbsp;closest to spot first
            </span>
          )}
        </div>

        <button
          className={styles.navBtn}
          onClick={() => onSymbolNav(1)}
          disabled={symbolIndex >= symbols.length - 1}
          aria-label="Next symbol"
        >
          ›
        </button>
      </div>
    </div>
  );
}
