/**
 * JSON Reporter for Benchmark Results
 *
 * Outputs results in JSON format for further analysis and visualization.
 */

import * as fs from 'fs'
import * as path from 'path'
import type { Bench, Task } from 'tinybench'

export interface BenchmarkReport {
  meta: {
    timestamp: string
    version: string
    environment: {
      node: string
      platform: string
      arch: string
      cpus: number
    }
  }
  suites: BenchmarkSuite[]
}

export interface BenchmarkSuite {
  name: string
  description?: string
  tasks: BenchmarkTask[]
}

export interface BenchmarkTask {
  name: string
  stats: {
    hz: number
    mean: number
    p99: number
    p95: number
    p75: number
    p50: number
    min: number
    max: number
    variance: number
    sd: number
    sem: number
    df: number
    critical: number
    moe: number
    rme: number
    samples: number
  }
}

export class JSONReporter {
  private outputDir: string

  constructor(outputDir: string = 'bench-results') {
    this.outputDir = outputDir
  }

  /**
   * Generate a complete benchmark report
   */
  generateReport(
    suites: Array<{ name: string; bench: Bench; description?: string }>
  ): BenchmarkReport {
    const report: BenchmarkReport = {
      meta: {
        timestamp: new Date().toISOString(),
        version: this.getVersion(),
        environment: this.getEnvironment(),
      },
      suites: suites.map((s) => this.convertSuite(s.name, s.bench, s.description)),
    }

    return report
  }

  /**
   * Save report to JSON file
   */
  saveReport(report: BenchmarkReport, filename?: string): string {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const name = filename ?? `benchmark-${timestamp}.json`
    const filepath = path.join(this.outputDir, name)

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2))

    return filepath
  }

  /**
   * Load a previously saved report
   */
  loadReport(filename: string): BenchmarkReport {
    const filepath = path.join(this.outputDir, filename)
    const content = fs.readFileSync(filepath, 'utf-8')
    return JSON.parse(content) as BenchmarkReport
  }

  /**
   * Compare two reports and generate delta
   */
  compareReports(baseline: BenchmarkReport, current: BenchmarkReport): ComparisonResult {
    const deltas: TaskDelta[] = []

    for (const baselineSuite of baseline.suites) {
      const currentSuite = current.suites.find((s) => s.name === baselineSuite.name)

      if (!currentSuite) continue

      for (const baselineTask of baselineSuite.tasks) {
        const currentTask = currentSuite.tasks.find((t) => t.name === baselineTask.name)

        if (!currentTask) continue

        const meanDelta = currentTask.stats.mean - baselineTask.stats.mean
        const hzDelta = currentTask.stats.hz - baselineTask.stats.hz
        const meanChange = (meanDelta / baselineTask.stats.mean) * 100
        const hzChange = (hzDelta / baselineTask.stats.hz) * 100

        deltas.push({
          suite: baselineSuite.name,
          task: baselineTask.name,
          baseline: baselineTask.stats,
          current: currentTask.stats,
          delta: {
            mean: meanDelta,
            hz: hzDelta,
            meanChange,
            hzChange,
          },
          status: this.getStatus(meanChange),
        })
      }
    }

    return {
      meta: {
        baselineTimestamp: baseline.meta.timestamp,
        currentTimestamp: current.meta.timestamp,
      },
      deltas,
      summary: {
        improved: deltas.filter((d) => d.status === 'improved').length,
        regressed: deltas.filter((d) => d.status === 'regressed').length,
        unchanged: deltas.filter((d) => d.status === 'unchanged').length,
      },
    }
  }

  private convertSuite(name: string, bench: Bench, description?: string): BenchmarkSuite {
    const suite: BenchmarkSuite = {
      name,
      tasks: bench.tasks.map((t) => this.convertTask(t)),
    }
    if (description) {
      suite.description = description
    }
    return suite
  }

  private convertTask(task: Task): BenchmarkTask {
    const stats = task.result!

    return {
      name: task.name,
      stats: {
        hz: stats.hz,
        mean: stats.mean,
        p99: stats.p99,
        p95: (stats as unknown as Record<string, number>).p95 ?? stats.p99,
        p75: (stats as unknown as Record<string, number>).p75 ?? stats.p99,
        p50: (stats as unknown as Record<string, number>).p50 ?? stats.mean,
        min: stats.min,
        max: stats.max,
        variance: stats.variance,
        sd: stats.sd,
        sem: stats.sem,
        df: stats.df,
        critical: stats.critical,
        moe: stats.moe,
        rme: stats.rme,
        samples: stats.samples.length,
      },
    }
  }

  private getEnvironment() {
    return {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      cpus: require('node:os').cpus().length,
    }
  }

  private getVersion(): string {
    try {
      const pkg = require('../../../package.json')
      return pkg.version
    } catch {
      return 'unknown'
    }
  }

  private getStatus(meanChange: number): 'improved' | 'regressed' | 'unchanged' {
    // Negative meanChange is good (faster)
    if (meanChange < -5) return 'improved'
    if (meanChange > 5) return 'regressed'
    return 'unchanged'
  }
}

export interface ComparisonResult {
  meta: {
    baselineTimestamp: string
    currentTimestamp: string
  }
  deltas: TaskDelta[]
  summary: {
    improved: number
    regressed: number
    unchanged: number
  }
}

export interface TaskDelta {
  suite: string
  task: string
  baseline: BenchmarkTask['stats']
  current: BenchmarkTask['stats']
  delta: {
    mean: number
    hz: number
    meanChange: number
    hzChange: number
  }
  status: 'improved' | 'regressed' | 'unchanged'
}
