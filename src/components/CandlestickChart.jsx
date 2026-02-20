import { useMemo } from 'react';
import Highcharts from 'highcharts/highstock';
import _HighchartsReact from 'highcharts-react-official';
const HighchartsReact = _HighchartsReact.default ?? _HighchartsReact;
import { buildCandlestickSeries } from '../utils/dataUtils';

function buildOptions(asset, symbol, optionType, resolution, chartData) {
  const parsed = buildCandlestickSeries(chartData);
  const label = optionType === 'call' ? 'CE' : 'PE';

  const series = [];
  if (parsed) {
    series.push({
      type: 'candlestick',
      name: symbol,
      data: parsed.ohlcData,
      upColor: '#26a69a',
      color: '#ef5350',
      upLineColor: '#26a69a',
      lineColor: '#ef5350',
      dataGrouping: { enabled: false },
      yAxis: 0,
    });
    series.push({
      type: 'column',
      name: 'Volume',
      data: parsed.volData,
      color: '#4c525e',
      yAxis: 1,
      dataGrouping: { enabled: false },
    });
  }

  return {
    chart: {
      backgroundColor: '#131722',
      style: { fontFamily: 'inherit' },
      height: 420,
    },
    rangeSelector: { enabled: false },
    navigator: { enabled: true, maskFill: 'rgba(38,166,154,0.15)' },
    scrollbar: { enabled: false },
    title: {
      text: `${asset} ${label}  |  ${symbol}  |  ${resolution}`,
      style: { color: '#d1d4dc', fontSize: '13px' },
    },
    xAxis: {
      type: 'datetime',
      labels: { style: { color: '#9598a1' } },
      gridLineColor: '#2a2e39',
      lineColor: '#2a2e39',
    },
    yAxis: [
      {
        title: { text: 'Price', style: { color: '#9598a1' } },
        labels: { style: { color: '#9598a1' }, align: 'left', x: 4 },
        gridLineColor: '#2a2e39',
        height: '70%',
        resize: { enabled: true },
        opposite: true,
      },
      {
        title: { text: 'Volume', style: { color: '#9598a1' } },
        labels: { style: { color: '#9598a1' }, align: 'left', x: 4 },
        gridLineColor: '#2a2e39',
        top: '72%',
        height: '28%',
        offset: 0,
        opposite: true,
      },
    ],
    tooltip: {
      split: false,
      shared: false,
      backgroundColor: '#1e222d',
      borderColor: '#2a2e39',
      style: { color: '#d1d4dc' },
    },
    legend: { enabled: false },
    credits: { enabled: false },
    accessibility: { enabled: false },
    series: series.length
      ? series
      : [{ type: 'candlestick', name: 'No data', data: [] }],
  };
}

export default function CandlestickChart({ asset, symbol, optionType, resolution, chartData }) {
  const options = useMemo(
    () => buildOptions(asset, symbol, optionType, resolution, chartData),
    [asset, symbol, optionType, resolution, chartData]
  );

  const label = optionType === 'call' ? 'CE' : 'PE';

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, color: '#9598a1', marginBottom: 4 }}>
        {asset} {label} — {symbol} — {resolution}
        {(!chartData || chartData.length === 0) && (
          <span style={{ color: '#ef5350', marginLeft: 8 }}>(no candle data)</span>
        )}
      </div>
      <HighchartsReact highcharts={Highcharts} options={options} constructorType="stockChart" />
    </div>
  );
}
