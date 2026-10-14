import React, { useState, useEffect, useMemo } from 'react';

/**
 * 五方 SVG 生成性能对比 —— 交互式图表
 *
 * 数据来源: /benchmark_svg_five_way.json
 * 由 `node bench/svg-benchmark/collect-five-way.mjs` 生成（统一纠错级别 M）。
 *
 * 组件运行时 fetch 该 JSON，因此文档里显示的永远是数据文件的真实内容，
 * 不会出现「markdown 里手抄一份数字、与 JSON 不一致」的情况。
 */

// ---------- 类型 ----------

interface Row {
  impl: string;
  runtime: string;
  case: string;
  bytes: number;
  avg_us: number;
  median_us: number;
  min_us: number;
  p95_us: number;
  module_count: number;
  svg_bytes: number;
}

interface Payload {
  _status: string;
  _note: string;
  generated_at: string;
  generator: string;
  methodology: {
    ec_level: string;
    warmup: number;
    runs: number;
    metric: string;
    unit: string;
  };
  cases: string[];
  results: Row[];
  warnings: string[];
}

// ---------- 展示配置 ----------

const IMPL_META: Record<string, { label: string; color: string; icon: string; dark?: boolean; lang: 'rust' | 'js' }> = {
  'qrcode-fast': { label: '@veaba/qrcode-fast', color: '#f59e0b', icon: '⚡', lang: 'rust' },
  'qrcode-rust': { label: '@veaba/qrcode-rust', color: '#d97706', icon: '🦀', lang: 'rust' },
  kennytm: { label: 'kennytm-qrcode', color: '#6b7280', icon: '📦', lang: 'rust' },
  'qrcode-bun': { label: '@veaba/qrcode-bun', color: '#8b7355', icon: '🥟', lang: 'js' },
  'qrcode-node': { label: '@veaba/qrcode-node', color: '#339933', icon: '🟢', lang: 'js' },
};

/** 稳定排序：按 short 用例的 avg 升序，保证各视图顺序一致 */
function orderImpls(rows: Row[], cases: string[]): string[] {
  const base = cases[0];
  const first = rows.filter((r) => r.case === base);
  return [...new Set(rows.map((r) => r.impl))].sort((a, b) => {
    const av = first.find((r) => r.impl === a)?.avg_us ?? Infinity;
    const bv = first.find((r) => r.impl === b)?.avg_us ?? Infinity;
    return av - bv;
  });
}

const fmt = (n: number) => (n >= 100 ? n.toFixed(0) : n.toFixed(1));

// ---------- 横向条形图（对数刻度，因为跨度达 250 倍） ----------

interface BarChartProps {
  rows: Row[];
  caseName: string;
  impls: string[];
  caseBytes?: number;
  showWarning?: boolean;
}

const Chart: React.FC<BarChartProps> = ({ rows, caseName, impls, caseBytes, showWarning }) => {
  const items = impls
    .map((impl) => ({ impl, row: rows.find((r) => r.case === caseName && r.impl === impl) }))
    .filter((x): x is { impl: string; row: Row } => Boolean(x.row));

  if (items.length === 0) {
    return <div style={{ color: '#94a3b8', padding: '1rem' }}>该用例无数据</div>;
  }

  const values = items.map((i) => i.row.avg_us);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  // 对数刻度：性能对比常用，避免小值被压扁
  const lo = Math.log10(Math.max(minV, 0.1));
  const hi = Math.log10(maxV);
  const span = Math.max(hi - lo, 0.001);
  const pos = (v: number) => ((Math.log10(Math.max(v, 0.1)) - lo) / span) * 100;

  const LABEL_W = 168;
  const VALUE_W = 92;
  const ROW_H = 34;

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width="100%" viewBox={`0 0 760 ${items.length * ROW_H + 34}`} style={{ minWidth: 560 }}>
        {/* 刻度网格 */}
        {[0, 25, 50, 75, 100].map((p) => {
          const x = LABEL_W + (p / 100) * (760 - LABEL_W - VALUE_W);
          const v = Math.pow(10, lo + (p / 100) * span);
          return (
            <g key={p}>
              <line x1={x} y1={6} x2={x} y2={items.length * ROW_H + 6} stroke="#eef2f7" strokeWidth={1} />
              <text x={x} y={items.length * ROW_H + 24} fontSize="10" fill="#94a3b8" textAnchor="middle">
                {fmt(v)}
              </text>
            </g>
          );
        })}

        {items.map(({ impl, row }, i) => {
          const meta = IMPL_META[impl] ?? { label: impl, color: '#94a3b8', icon: '📦', lang: 'js' as const };
          const y = i * ROW_H + 8;
          const barW = Math.max((pos(row.avg_us) / 100) * (760 - LABEL_W - VALUE_W), 2);
          const fastest = row.avg_us === minV;
          return (
            <g key={impl}>
              <text x={0} y={y + 14} fontSize="12" fill="#334155" fontWeight={fastest ? 600 : 400}>
                {meta.icon} {meta.label}
              </text>
              <rect x={LABEL_W} y={y + 3} width={barW} height={16} rx={3} fill={meta.color} opacity={fastest ? 1 : 0.82} />
              <text x={LABEL_W + barW + 8} y={y + 15} fontSize="12" fill="#0f172a" fontWeight={fastest ? 700 : 500}>
                {fmt(row.avg_us)} µs
              </text>
            </g>
          );
        })}
      </svg>

      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <span>横轴：平均耗时 µs（<strong>对数刻度</strong>，越短越快）</span>
        {caseBytes !== undefined && <span>输入 {caseBytes} 字节</span>}
        <span>模块数 {items[0].row.module_count}×{items[0].row.module_count}</span>
      </div>

      {showWarning && (
        <div style={{ fontSize: 12, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '8px 10px', marginTop: 8 }}>
          ⚠️ 本图混排了 Rust（同进程）与 Node / Bun（各自独立进程）。跨语言倍数不可解读，
          详见下方「口径限制」。
        </div>
      )}
    </div>
  );
};

// ---------- 表格 ----------

const Table: React.FC<{ rows: Row[]; caseName: string; impls: string[] }> = ({ rows, caseName, impls }) => {
  const items = impls
    .map((impl) => ({ impl, row: rows.find((r) => r.case === caseName && r.impl === impl) }))
    .filter((x): x is { impl: string; row: Row } => Boolean(x.row));
  const minV = Math.min(...items.map((i) => i.row.avg_us));

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            {['实现', 'avg (µs)', 'median', 'min', 'p95', '相对最快', 'SVG 字节'].map((h) => (
              <th key={h} style={{ padding: '8px 10px', textAlign: h === '实现' ? 'left' : 'right', borderBottom: '2px solid #e2e8f0', fontSize: 12, color: '#475569' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map(({ impl, row }) => {
            const meta = IMPL_META[impl] ?? { label: impl, color: '#94a3b8', icon: '📦' };
            const ratio = row.avg_us / minV;
            const fastest = ratio === 1;
            return (
              <tr key={impl} style={{ background: fastest ? '#f0fdf4' : 'transparent' }}>
                <td style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: meta.color, marginRight: 8 }} />
                  {meta.icon} {meta.label}
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: fastest ? 700 : 400, borderBottom: '1px solid #f1f5f9' }}>
                  {fmt(row.avg_us)}
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>{fmt(row.median_us)}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>{fmt(row.min_us)}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>{fmt(row.p95_us)}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: fastest ? '#16a34a' : '#334155', borderBottom: '1px solid #f1f5f9' }}>
                  {fastest ? '最快' : `${ratio.toFixed(1)}×`}
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>
                  {row.svg_bytes.toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ---------- 主组件 ----------

const CASE_LABEL: Record<string, string> = {
  short: 'short',
  url: 'url',
  long: 'long',
};

export const SvgFiveWayChart: React.FC = () => {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [caseName, setCaseName] = useState<string>('long');
  const [view, setView] = useState<'all' | 'rust' | 'js'>('all');

  useEffect(() => {
    fetch('/benchmark_svg_five_way.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  const impls = useMemo(() => (data ? orderImpls(data.results, data.cases) : []), [data]);

  if (error) {
    return (
      <div style={{ padding: '1.5rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#991b1b' }}>
        ❌ 无法加载 <code>/benchmark_svg_five_way.json</code>: {error}
        <div style={{ fontSize: 13, marginTop: 8 }}>
          请先生成数据：<code>node bench/svg-benchmark/collect-five-way.mjs</code>
        </div>
      </div>
    );
  }
  if (!data) {
    return <div style={{ padding: '1.5rem', color: '#64748b' }}>⏳ 加载中…</div>;
  }

  const rustImpls = impls.filter((i) => IMPL_META[i]?.lang === 'rust');
  const jsImpls = impls.filter((i) => IMPL_META[i]?.lang === 'js');
  const shown = view === 'all' ? impls : view === 'rust' ? rustImpls : jsImpls;
  const caseBytes = data.results.find((r) => r.case === caseName)?.bytes;

  const btn = (active: boolean): React.CSSProperties => ({
    padding: '0.4rem 0.9rem',
    borderRadius: 6,
    border: 'none',
    cursor: 'pointer',
    background: active ? '#3b82f6' : '#e2e8f0',
    color: active ? '#fff' : '#475569',
    fontWeight: active ? 600 : 400,
    fontSize: 13,
  });

  return (
    <div style={{ padding: '1.25rem', background: '#f8fafc', borderRadius: 10, marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <strong style={{ fontSize: 15 }}>🔬 五方 SVG 生成性能（统一纠错级别 {data.methodology.ec_level}）</strong>
        <span style={{ fontSize: 12, color: '#64748b' }}>
          预热 {data.methodology.warmup} + 测量 {data.methodology.runs} 次，取平均
        </span>
      </div>

      {/* 视图切换 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <button style={btn(view === 'all')} onClick={() => setView('all')}>
          五方同图（{impls.length}）
        </button>
        <button style={btn(view === 'rust')} onClick={() => setView('rust')}>
          🦀 仅 Rust 三方（可比）
        </button>
        <button style={btn(view === 'js')} onClick={() => setView('js')}>
          🟢🥟 仅 Node / Bun
        </button>
      </div>

      {/* 用例切换 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {data.cases.map((c) => (
          <button key={c} style={btn(caseName === c)} onClick={() => setCaseName(c)}>
            {CASE_LABEL[c] ?? c}
            <span style={{ opacity: 0.75, marginLeft: 6, fontSize: 11 }}>
              {data.results.find((r) => r.case === c)?.bytes}B
            </span>
          </button>
        ))}
      </div>

      <Chart rows={data.results} caseName={caseName} impls={shown} caseBytes={caseBytes} showWarning={view === 'all'} />

      <div style={{ marginTop: 16 }}>
        <Table rows={data.results} caseName={caseName} impls={shown} />
      </div>

      {data.warnings.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 12, color: '#92400e' }}>
          ⚠️ {data.warnings.join('；')}
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>
        数据：<code>docs/public/benchmark_svg_five_way.json</code>（生成于{' '}
        {new Date(data.generated_at).toLocaleString()}）
        <br />
        复现：<code>node bench/svg-benchmark/collect-five-way.mjs</code>
        <br />
        状态：<code>{data._status}</code>
      </div>
    </div>
  );
};

export default SvgFiveWayChart;
