import { useState, useMemo } from 'react';
import { expiryLabel, downloadCsv, recordsToCsv, getExpiryOptions } from '../utils/dataUtils';
import styles from './OptionChainTable.module.css';

const COLUMNS = [
  { key: 'symbol',       label: 'Symbol'     },
  { key: 'option_type',  label: 'Type'       },
  { key: 'strike',       label: 'Strike'     },
  { key: 'expiry_date',  label: 'Expiry'     },
  { key: 'mark_price',   label: 'Mark'       },
  { key: 'bid_price',    label: 'Bid'        },
  { key: 'ask_price',    label: 'Ask'        },
  { key: 'bid_iv',       label: 'Bid IV'     },
  { key: 'ask_iv',       label: 'Ask IV'     },
  { key: 'open_interest',label: 'OI'         },
  { key: 'volume',       label: 'Volume'     },
  { key: 'spot_price',   label: 'Spot'       },
  { key: 'delta',        label: 'Δ Delta'    },
  { key: 'gamma',        label: 'Γ Gamma'    },
  { key: 'theta',        label: 'Θ Theta'    },
  { key: 'vega',         label: 'V Vega'     },
];

function fmt(value, key) {
  if (value == null) return '-';
  if (typeof value === 'number') {
    if (['delta', 'gamma', 'rho', 'theta', 'vega', 'bid_iv', 'ask_iv'].includes(key))
      return value.toFixed(4);
    return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }
  return String(value);
}

export default function OptionChainTable({ asset, records }) {
  const [typeFilter,   setTypeFilter]   = useState('all');
  const [expiryFilter, setExpiryFilter] = useState('all');
  const [sortKey,      setSortKey]      = useState('strike');
  const [sortAsc,      setSortAsc]      = useState(true);
  const [page,         setPage]         = useState(1);
  const PAGE_SIZE = 50;

  // Build available expiry options from records
  const expiryOptions = useMemo(() => getExpiryOptions(records), [records]);

  const filtered = useMemo(() => {
    let rows = records;
    if (typeFilter !== 'all')   rows = rows.filter((r) => r.option_type === typeFilter);
    if (expiryFilter !== 'all') rows = rows.filter((r) => r.expiry_date === expiryFilter);

    rows = [...rows].sort((a, b) => {
      const va = a[sortKey] ?? '';
      const vb = b[sortKey] ?? '';
      if (va < vb) return sortAsc ? -1 :  1;
      if (va > vb) return sortAsc ?  1 : -1;
      return 0;
    });
    return rows;
  }, [records, typeFilter, expiryFilter, sortKey, sortAsc]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSort(key) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
    setPage(1);
  }

  function handleDownload() {
    downloadCsv(recordsToCsv(filtered), `${asset}_option_chain.csv`);
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <span className={styles.count}>{filtered.length} records</span>

        {/* Expiry filter */}
        <select
          className={styles.select}
          value={expiryFilter}
          onChange={(e) => { setExpiryFilter(e.target.value); setPage(1); }}
        >
          <option value="all">All Expiries</option>
          {expiryOptions.map((exp) => (
            <option key={exp.expiryDate} value={exp.expiryDate}>
              {exp.displayLabel}
            </option>
          ))}
        </select>

        {/* Type filter */}
        <select
          className={styles.select}
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
        >
          <option value="all">All Types</option>
          <option value="call">CE (Call)</option>
          <option value="put">PE (Put)</option>
        </select>

        <button className={styles.dlBtn} onClick={handleDownload}>⬇ CSV</button>
      </div>

      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={styles.th}
                  onClick={() => handleSort(col.key)}
                >
                  {col.label}
                  {sortKey === col.key ? (sortAsc ? ' ↑' : ' ↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((row) => (
              <tr key={row.symbol} className={styles.tr}>
                {COLUMNS.map((col) => (
                  <td
                    key={col.key}
                    className={`${styles.td} ${
                      col.key === 'option_type'
                        ? row.option_type === 'call' ? styles.call : styles.put
                        : ''
                    }`}
                  >
                    {fmt(row[col.key], col.key)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className={styles.pgBtn}
          >‹</button>
          <span className={styles.pgInfo}>Page {page} / {totalPages}</span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className={styles.pgBtn}
          >›</button>
        </div>
      )}
    </div>
  );
}
