/**
 * Console Reporter for Benchmark Results
 */

import type { Bench, Task } from 'tinybench'

export interface ReportOptions {
  /** Include detailed statistics */
  detailed?: boolean
  /** Include comparison to baseline */
  showComparison?: boolean
  /** Format numbers with locale */
  useLocale?: boolean
}

export class ConsoleReporter {
  private options: ReportOptions

  constructor(options: ReportOptions = {}) {
    this.options = {
      detailed: false,
      showComparison: true,
      useLocale: true,
      ...options,
    }
  }

  /**
   * Print a benchmark suite header
   */
  header(title: string, description?: string): void {
    console.log('\n' + '='.repeat(60))
    console.log(`# ${title}`)
    if (description) {
      console.log(`  ${description}`)
    }
    console.log('='.repeat(60))
  }

  /**
   * Print results for a single benchmark
   */
  printBench(name: string, bench: Bench): void {
    console.log(`\n## ${name}`)

    for (const task of bench.tasks) {
      this.printTask(task)
    }
  }

  /**
   * Print a single task result
   */
  private printTask(task: Task): void {
    const stats = task.result
    if (!stats) {
      console.log(`  ${task.name}: no results`)
      return
    }

    const hz = this.formatNumber(stats.hz)
    const mean = formatDuration(stats.mean)
    const p99 = formatDuration(stats.p99)

    console.log(`  ${task.name}`)
    console.log(`    throughput: ${hz} ops/s`)
    console.log(`    latency:    mean=${mean}, p99=${p99}`)

    if (this.options.detailed) {
      const min = formatDuration(stats.min)
      const max = formatDuration(stats.max)
      const variance = `${(stats.variance * 100).toFixed(2)}%`
      const samples = this.formatNumber(stats.samples.length)

      console.log(
        `    details:    min=${min}, max=${max}, variance=${variance}, samples=${samples}`
      )
    }
  }

  /**
   * Print comparison between two implementations
   */
  printComparison(
    name: string,
    baseline: { mean: number; hz: number },
    current: { mean: number; hz: number }
  ): void {
    const speedup = baseline.mean / current.mean
    const hzImprovement = ((current.hz - baseline.hz) / baseline.hz) * 100

    console.log(`\n## ${name}`)
    console.log(
      `  baseline: ${formatDuration(baseline.mean)} (${this.formatNumber(baseline.hz)} ops/s)`
    )
    console.log(
      `  current:  ${formatDuration(current.mean)} (${this.formatNumber(current.hz)} ops/s)`
    )
    console.log(`  speedup:  ${speedup.toFixed(2)}x`)
    console.log(
      `  improvement: ${hzImprovement > 0 ? '+' : ''}${hzImprovement.toFixed(1)}% throughput`
    )

    // Visual indicator
    const barLength = Math.min(50, Math.max(1, Math.round(speedup * 10)))
    const bar = '█'.repeat(barLength)
    console.log(`  ${bar} ${speedup.toFixed(1)}x`)
  }

  /**
   * Print a table of results
   */
  printTable(rows: Array<Record<string, string | number>>): void {
    if (rows.length === 0) return

    const firstRow = rows[0]
    if (!firstRow) return

    const headers = Object.keys(firstRow)
    const colWidths = headers.map((h) => {
      const maxLength = Math.max(h.length, ...rows.map((r) => String(r[h] ?? '').length))
      return maxLength
    })

    // Print header
    const headerRow = headers.map((h, i) => h.padEnd(colWidths[i]!)).join(' | ')
    console.log(`\n  ${headerRow}`)
    console.log(`  ${colWidths.map((w) => '-'.repeat(w!)).join('-+-')}`)

    // Print rows
    for (const row of rows) {
      const rowStr = headers.map((h, i) => String(row[h] ?? '').padEnd(colWidths[i]!)).join(' | ')
      console.log(`  ${rowStr}`)
    }
  }

  /**
   * Print a summary section
   */
  summary(stats: {
    totalSuites: number
    totalTests: number
    passed: number
    failed: number
  }): void {
    console.log('\n' + '='.repeat(60))
    console.log('Summary')
    console.log('='.repeat(60))
    console.log(`  Suites: ${stats.totalSuites}`)
    console.log(`  Tests:  ${stats.totalTests}`)
    console.log(`  Passed: ${stats.passed}`)
    if (stats.failed > 0) {
      console.log(`  Failed: ${stats.failed}`)
    }
  }

  private formatNumber(n: number): string {
    if (this.options.useLocale) {
      return Math.round(n).toLocaleString()
    }
    return String(Math.round(n))
  }
}

/**
 * Format duration in appropriate units
 */
export function formatDuration(ms: number): string {
  if (ms < 0.001) {
    return `${(ms * 1_000_000).toFixed(2)}ns`
  }
  if (ms < 1) {
    return `${(ms * 1000).toFixed(2)}µs`
  }
  if (ms < 1000) {
    return `${ms.toFixed(2)}ms`
  }
  return `${(ms / 1000).toFixed(2)}s`
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let unitIndex = 0
  let value = bytes

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }

  return `${value.toFixed(2)}${units[unitIndex]}`
}
