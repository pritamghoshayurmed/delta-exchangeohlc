import { useMemo } from 'react';
import Highcharts from 'highcharts';
import _HighchartsReact from 'highcharts-react-official';
const HighchartsReact = _HighchartsReact.default ?? _HighchartsReact;
import { buildStrikeSeriesForExpiry, groupByExpiry } from '../utils/dataUtils';

const METRIC_LABELS = {
  mark_price:    'Mark Price',
  open_interest: 'Open Interest (contracts)',
  volume:        'Volume',
  bid_price:     'Bid Price',
  ask_price:     'Ask Price',
  bid_iv:        'Bid IV',
  ask_iv:        'Ask IV',
  delta:         'Delta',
  gamma:         'Gamma',
  theta:         'Theta',
  vega:          'Vega',
};

function buildOptions(asset, rows, metric, expiryDate) {
  const series = buildStrikeSeriesForExpiry(rows, metric);

  return {
    chart: {
      type: 'line',
      backgroundColor: '#131722',
      style: { fontFamily: 'inherit' },
      height: 340,
    },
    title: {
      text: `${asset} Options — Expiry ${expiryDate}`,
      style: { color: '#d1d4dc', fontSize: '13px' },
    },
    xAxis: {
      title: { text: 'Strike Price', style: { color: '#9598a1' } },
      labels: { style: { color: '#9598a1' } },
      gridLineColor: '#2a2e39',
      lineColor: '#2a2e39',
      tickColor: '#2a2e39',
    },
    yAxis: {
      title: { text: METRIC_LABELS[metric] ?? metric, style: { color: '#9598a1' } },
      labels: { style: { color: '#9598a1' } },
      gridLineColor: '#2a2e39',
    },
    legend: {
      itemStyle: { color: '#d1d4dc', fontSize: '12px' },
      itemHoverStyle: { color: '#ffffff' },
    },
    tooltip: {
      backgroundColor: '#1e222d',
      borderColor: '#2a2e39',
      style: { color: '#d1d4dc' },
      formatter() {
        return `<b>Strike:</b> ${this.x.toLocaleString()}<br/><b>${this.series.name}:</b> ${
          typeof this.y === 'number' ? this.y.toFixed(6) : this.y
        }`;
      },
    },
    plotOptions: {
      line: {
        lineWidth: 2,
        states: { hover: { lineWidth: 3 } },
      },
    },
    credits: { enabled: false },
    accessibility: { enabled: false },
    series,
  };
}

export default function StrikeChart({ asset, records, metric }) {
  const byExpiry = useMemo(() => {
    const map = groupByExpiry(records);
    return [...map.entries()];     // [[expiryMs, rows[]], …]
  }, [records]);

  if (byExpiry.length === 0) return null;

  return (
    <div>
      {byExpiry.map(([ts, rows]) => (
        <div key={ts} style={{ marginBottom: 24 }}>
          <HighchartsReact
            highcharts={Highcharts}
            options={buildOptions(asset, rows, metric, rows[0]?.expiry_date ?? '')}
          />
        </div>
      ))}
    </div>
  );
}
