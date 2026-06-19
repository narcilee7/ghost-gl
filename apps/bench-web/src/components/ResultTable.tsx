import type { BenchmarkResult } from '../lib/benchmarks'

interface ResultTableProps {
  results: BenchmarkResult[]
}

export function ResultTable({ results }: ResultTableProps) {
  return (
    <table className="result-table">
      <thead>
        <tr>
          <th>Operation</th>
          <th>ghost-gl</th>
          <th>RGL Baseline</th>
          <th>Speedup</th>
        </tr>
      </thead>
      <tbody>
        {results.map((r) => (
          <tr key={r.name}>
            <td>{r.name}</td>
            <td className="num">{r.ghostglMs.toFixed(2)} ms</td>
            <td className="num">{r.rglMs.toFixed(2)} ms</td>
            <td className={`num ${r.speedup >= 1 ? 'positive' : 'negative'}`}>
              {r.speedup >= 1
                ? `${r.speedup.toFixed(1)}×`
                : `${(1 / r.speedup).toFixed(1)}× slower`}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
