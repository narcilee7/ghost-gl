import { useCallback, useState } from 'react'
import { ResultsChart } from './components/ResultsChart'
import { ResultTable } from './components/ResultTable'
import { type BenchmarkResult, createTasks, runBenchmark } from './lib/benchmarks'
import { createFixture, FIXTURE_CONFIGS } from './lib/fixtures'
import './App.css'

export function App() {
  const [selectedScale, setSelectedScale] = useState(100)
  const [iterations, setIterations] = useState(30)
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<BenchmarkResult[] | null>(null)
  const [fixtureName, setFixtureName] = useState('')

  const handleRun = useCallback(async () => {
    const config = FIXTURE_CONFIGS.find((f) => f.nodeCount === selectedScale)
    if (!config) return

    setIsRunning(true)
    setProgress(0)
    setResults(null)
    setFixtureName(config.name)

    const data = createFixture(config.nodeCount, config.columns)
    const tasks = createTasks(data.nodes, data.viewport, data.metrics, data.constraints)

    const results = await runBenchmark(tasks, iterations, (done, total) => {
      setProgress(Math.round((done / total) * 100))
    })

    setResults(results)
    setIsRunning(false)
    setProgress(100)
  }, [selectedScale, iterations])

  return (
    <div className="app">
      <header className="app-header">
        <h1>⚡ ghost-gl Benchmark</h1>
        <p>Head-to-head performance comparison in the browser</p>
      </header>

      <section className="controls">
        <div className="control-group">
          <label>Scale</label>
          <div className="scale-buttons">
            {FIXTURE_CONFIGS.map((f) => (
              <button
                key={f.nodeCount}
                type="button"
                className={selectedScale === f.nodeCount ? 'active' : ''}
                onClick={() => setSelectedScale(f.nodeCount)}
                disabled={isRunning}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>

        <div className="control-group">
          <label>Iterations</label>
          <input
            type="range"
            min={10}
            max={100}
            step={10}
            value={iterations}
            onChange={(e) => setIterations(Number(e.target.value))}
            disabled={isRunning}
          />
          <span className="iteration-value">{iterations}</span>
        </div>

        <button type="button" className="run-button" onClick={handleRun} disabled={isRunning}>
          {isRunning ? 'Running…' : 'Run Benchmark'}
        </button>
      </section>

      {isRunning && (
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
          <span className="progress-text">{progress}%</span>
        </div>
      )}

      {results && (
        <section className="results">
          <h2>
            Results: {fixtureName} ({iterations} iterations)
          </h2>

          <ResultsChart results={results} />
          <ResultTable results={results} />

          <div className="summary">
            {results.every((r) => r.speedup >= 1) ? (
              <p className="summary-positive">
                ✅ ghost-gl is faster across all operations for this scale.
              </p>
            ) : (
              <p className="summary-neutral">
                ⚠️ Some operations are comparable or slower at this scale — usually due to fixture
                overhead dominating the runtime.
              </p>
            )}
          </div>
        </section>
      )}

      <footer className="app-footer">
        <p>
          Benchmarks run entirely in the browser using <code>performance.now()</code>. Lower is
          better. RGL baseline simulates naive O(n) algorithms.
        </p>
      </footer>
    </div>
  )
}
