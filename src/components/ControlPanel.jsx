import { METRICS, RESOLUTIONS } from '../utils/dataUtils';
import styles from './ControlPanel.module.css';

const ASSETS = ['BTC', 'ETH', 'SOL', 'XRP', 'BNB', 'AVAX'];

export default function ControlPanel({ settings, onChange, onFetch, loading }) {
  function set(key, value) {
    onChange({ ...settings, [key]: value });
  }

  function toggleAsset(asset) {
    const next = settings.assets.includes(asset)
      ? settings.assets.filter((a) => a !== asset)
      : [...settings.assets, asset];
    if (next.length > 0) set('assets', next);
  }

  return (
    <aside className={styles.panel}>
      <h2 className={styles.title}>⚙ Settings</h2>

      {/* API Endpoint */}
      <label className={styles.label}>
        API Endpoint
        <select
          className={styles.select}
          value={settings.baseUrl}
          onChange={(e) => set('baseUrl', e.target.value)}
        >
          <option value="https://api.india.delta.exchange">Production (India)</option>
          <option value="https://cdn-ind.testnet.deltaex.org">Testnet (Demo)</option>
        </select>
      </label>

      {/* Underlying Assets */}
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Underlying Assets</legend>
        <div className={styles.checkRow}>
          {ASSETS.map((asset) => (
            <label key={asset} className={styles.checkLabel}>
              <input
                type="checkbox"
                checked={settings.assets.includes(asset)}
                onChange={() => toggleAsset(asset)}
              />
              {asset}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Y-Axis Metric */}
      <label className={styles.label}>
        Y-Axis Metric
        <select
          className={styles.select}
          value={settings.metric}
          onChange={(e) => set('metric', e.target.value)}
        >
          {METRICS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </label>

      {/* Min Open Interest */}
      <label className={styles.label}>
        Min Open Interest
        <input
          type="number"
          className={styles.input}
          min={0}
          step={1}
          value={settings.minOpenInterest}
          onChange={(e) => set('minOpenInterest', parseFloat(e.target.value) || 0)}
        />
      </label>

      {/* Candlestick toggle */}
      <label className={`${styles.label} ${styles.inline}`}>
        <input
          type="checkbox"
          checked={settings.candlestick}
          onChange={(e) => set('candlestick', e.target.checked)}
        />
        Fetch Candlestick Charts
      </label>

      {settings.candlestick && (
        <>
          {/* Resolution */}
          <label className={styles.label}>
            Resolution
            <select
              className={styles.select}
              value={settings.resolution}
              onChange={(e) => set('resolution', e.target.value)}
            >
              {RESOLUTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </label>

          {/* Lookback */}
          <label className={styles.label}>
            Lookback (hours)
            <input
              type="number"
              className={styles.input}
              min={1}
              max={720}
              step={1}
              value={settings.lookbackHours}
              onChange={(e) => set('lookbackHours', parseInt(e.target.value, 10) || 24)}
            />
          </label>

          {/* Top N per type */}
          <label className={styles.label}>
            Top Instruments per Type
            <input
              type="number"
              className={styles.input}
              min={1}
              max={10}
              step={1}
              value={settings.topPerType}
              onChange={(e) => set('topPerType', parseInt(e.target.value, 10) || 2)}
            />
          </label>
        </>
      )}

      {/* Fetch button */}
      <button
        className={styles.fetchBtn}
        onClick={onFetch}
        disabled={loading || settings.assets.length === 0}
      >
        {loading ? '⏳ Loading…' : '▶ Fetch Data'}
      </button>

      <p className={styles.hint}>
        Data from{' '}
        <a
          href="https://www.delta.exchange"
          target="_blank"
          rel="noreferrer"
          className={styles.link}
        >
          Delta Exchange
        </a>
      </p>
    </aside>
  );
}
