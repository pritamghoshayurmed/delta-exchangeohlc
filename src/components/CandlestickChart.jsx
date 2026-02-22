import { useMemo, useRef, useCallback } from 'react';
import Highcharts from 'highcharts/highstock';
import _HighchartsReact from 'highcharts-react-official';
const HighchartsReact = _HighchartsReact.default ?? _HighchartsReact;
import { buildCandlestickSeries } from '../utils/dataUtils';

function buildOptions(asset, symbol, optionType, resolution, chartData, isMobile) {
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
      color: '#546e7a',
      opacity: 0.8,
      yAxis: 1,
      dataGrouping: { enabled: false },
    });
  }

  return {
    chart: {
      backgroundColor: '#131722',
      style: { fontFamily: 'inherit' },
      // height is controlled by CSS / container — let Highcharts fill 100%
      height: isMobile ? null : 420,
      width: null,
      margin: [32, 72, 0, 0],   // top, right, bottom, left  — right gives room for Y labels
      spacing: [4, 4, 4, 4],
    },
    rangeSelector: { enabled: false },
    navigator: {
      enabled: true,
      maskFill: 'rgba(38,166,154,0.15)',
      height: isMobile ? 30 : 40,
      margin: 6,
      xAxis: { labels: { style: { color: '#9598a1', fontSize: '10px' } } },
    },
    scrollbar: { enabled: false },
    title: { text: '' },  // title is shown in the header div above the chart
    xAxis: {
      type: 'datetime',
      labels: { style: { color: '#9598a1', fontSize: isMobile ? '10px' : '11px' } },
      gridLineColor: '#2a2e39',
      lineColor: '#2a2e39',
      tickColor: '#2a2e39',
    },
    yAxis: [
      {
        // Price pane — top 72%
        title: { text: null },
        labels: {
          style: { color: '#9598a1', fontSize: isMobile ? '10px' : '11px' },
          align: 'left',
          x: 4,
          y: 3,
        },
        gridLineColor: '#2a2e39',
        height: '72%',
        resize: { enabled: true, lineColor: '#2a2e39', lineWidth: 1 },
        opposite: true,
        tickLength: 0,
        lineWidth: 0,
      },
      {
        // Volume pane — bottom 24%, flush against price pane
        title: { text: null },
        labels: {
          style: { color: '#9598a1', fontSize: '10px' },
          align: 'left',
          x: 4,
          y: 3,
          formatter: function () {
            const v = this.value;
            if (v === 0) return '0';
            if (v >= 1000) return (v / 1000).toFixed(0) + 'k';
            return v;
          },
        },
        gridLineColor: '#2a2e39',
        top: '74%',
        height: '26%',
        offset: 0,
        opposite: true,
        tickLength: 0,
        lineWidth: 0,
        maxPadding: 0.05,
      },
    ],
    tooltip: {
      split: false,
      shared: false,
      backgroundColor: '#1e222d',
      borderColor: '#2a2e39',
      borderRadius: 6,
      shadow: false,
      style: { color: '#d1d4dc', fontSize: '12px' },
      valueDecimals: 2,
    },
    plotOptions: {
      candlestick: { groupPadding: 0.1, pointPadding: 0.02 },
      column: { groupPadding: 0.05, pointPadding: 0 },
    },
    legend: { enabled: false },
    credits: { enabled: false },
    accessibility: { enabled: false },
    series: series.length
      ? series
      : [{ type: 'candlestick', name: 'No data', data: [] }],
  };
}

export default function CandlestickChart({ asset, symbol, optionType, resolution, chartData, height }) {
  const isMobile = height === '100%';
  const chartRef = useRef(null);

  // reflow once the chart mounts so it picks up the flex-container's computed size
  const onChartCreated = useCallback((chart) => {
    if (isMobile) {
      requestAnimationFrame(() => {
        try { chart.reflow(); } catch (_) {/* ignore */}
      });
    }
  }, [isMobile]);

  const options = useMemo(
    () => buildOptions(asset, symbol, optionType, resolution, chartData, isMobile),
    [asset, symbol, optionType, resolution, chartData, isMobile]
  );

  const label = optionType === 'call' ? 'CE' : 'PE';

  /* ── header strip above the chart ── */
  const headerStyle = {
    fontSize: 11,
    color: '#9598a1',
    marginBottom: 3,
    flexShrink: 0,
    paddingLeft: 4,
    paddingRight: 4,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  };

  if (isMobile) {
    /* Mobile: fill the flex parent fully — chart resizes to whatever height is available */
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        <div style={headerStyle}>
          <span style={{ color: '#26a69a', fontWeight: 700 }}>{asset} {label}</span>
          <span style={{ color: '#5a5e6b' }}>|</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{symbol}</span>
          <span style={{ color: '#5a5e6b' }}>|</span>
          <span>{resolution}m</span>
          {(!chartData || chartData.length === 0) && (
            <span style={{ color: '#ef5350' }}>(no data)</span>
          )}
        </div>
        {/* This div must have a known height for Highcharts to fill 100% */}
        <div ref={chartRef} style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden' }}>
          <HighchartsReact
            highcharts={Highcharts}
            options={options}
            constructorType="stockChart"
            containerProps={{ style: { position: 'absolute', inset: 0 } }}
            callback={onChartCreated}
          />
        </div>
      </div>
    );
  }

  /* Desktop: fixed-height card */
  return (
    <div style={{ marginBottom: 20, background: '#131722', borderRadius: 6, overflow: 'hidden', border: '1px solid #2a2e39' }}>
      <div style={{ ...headerStyle, padding: '8px 12px 4px', borderBottom: '1px solid #1e2230' }}>
        <span style={{ color: '#26a69a', fontWeight: 700 }}>{asset} {label}</span>
        <span style={{ color: '#5a5e6b' }}>|</span>
        <span style={{ fontWeight: 600, color: '#d1d4dc' }}>{symbol}</span>
        <span style={{ color: '#5a5e6b' }}>|</span>
        <span>Res: {resolution}m</span>
        {(!chartData || chartData.length === 0) && (
          <span style={{ color: '#ef5350', marginLeft: 4 }}>(no candle data)</span>
        )}
      </div>
      <HighchartsReact
        highcharts={Highcharts}
        options={options}
        constructorType="stockChart"
        containerProps={{ style: { width: '100%', display: 'block' } }}
      />
    </div>
  );
}
