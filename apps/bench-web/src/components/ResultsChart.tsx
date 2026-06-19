import type { BenchmarkResult } from '../lib/benchmarks'

interface ResultsChartProps {
  results: BenchmarkResult[]
}

export function ResultsChart({ results }: ResultsChartProps) {
  const maxMs = Math.max(...results.map((r) => Math.max(r.ghostglMs, r.rglMs)), 1)

  return (
    <div className="results-chart">
      {results.map((r) => {
        const ghostglPct = (r.ghostglMs / maxMs) * 100
        const rglPct = (r.rglMs / maxMs) * 100
        return (
          <div key={r.name} className="chart-row">
            <div className="chart-label">{r.name}</div>
            <div className="chart-bars">
              <div className="bar-group">
                <span className="bar-label">ghost-gl</span>
                <div className="bar-track">
                  <div className="bar ghostgl" style={{ width: `${ghostglPct}%` }} />
                </div>
                <span className="bar-value">{r.ghostglMs.toFixed(2)}ms</span>
              </div>
              <div className="bar-group">
                <span className="bar-label">RGL</span>
                <div className="bar-track">
                  <div className="bar rgl" style={{ width: `${rglPct}%` }} />
                </div>
                <span className="bar-value">{r.rglMs.toFixed(2)}ms</span>
              </div>
            </div>
            <div className="speedup-badge">
              {r.speedup >= 1
                ? `${r.speedup.toFixed(1)}×`
                : `${(1 / r.speedup).toFixed(1)}× slower`}
            </div>
          </div>
        )
      })}
    </div>
  )
}
