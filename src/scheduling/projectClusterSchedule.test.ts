import { describe, expect, it } from 'vitest'
import {
  computeProjectClusterSchedule,
  normalizeScheduleTimeBands,
  scoreClusterWithUiPrefs,
  scoreProjectClusterInList
} from './projectClusterSchedule'
import type { ClusterScheduleInput } from './types'

const base: Omit<ClusterScheduleInput, 'id' | 'clusterName'> = {
  cpuCapacity: 10,
  cpuAllocated: 2,
  memCapacity: 20,
  memAllocated: 5
}

function row(
  id: number,
  patch: Partial<ClusterScheduleInput> = {}
): ClusterScheduleInput {
  return { id, clusterName: `c${id}`, ...base, ...patch }
}

describe('computeProjectClusterSchedule', () => {
  it('empty list', () => {
    const r = computeProjectClusterSchedule([])
    expect(r.strategy).toBe('empty')
    expect(r.recommendedClusterId).toBeNull()
    expect(r.getScore(row(1))).toBe(0)
    expect(r.getRank(row(1))).toBe(0)
  })

  it('resource fallback: higher free resources scores higher', () => {
    const a = row(1, { cpuCapacity: 10, cpuAllocated: 8, memCapacity: 10, memAllocated: 5 })
    const b = row(2, { cpuCapacity: 10, cpuAllocated: 2, memCapacity: 10, memAllocated: 5 })
    const r = computeProjectClusterSchedule([a, b])
    expect(r.strategy).toBe('resource')
    expect(r.recommendedClusterId).toBe(2)
    expect(r.getRank(b)).toBe(1)
    expect(r.getRank(a)).toBe(2)
  })

  it('energy path: lower price and higher default SOC', () => {
    const a = row(1, { hasEnergyProfile: true, gridPricePerKwh: 0.5 })
    const b = row(2, { hasEnergyProfile: true, gridPricePerKwh: 0.8, hasStorageSoc: true, storageSoc: 90 })
    const r = computeProjectClusterSchedule([a, b])
    expect(r.strategy).toBe('energy')
    expect(r.recommendedClusterId).toBe(1)
    const sa = r.getScore(a)
    const sb = r.getScore(b)
    expect(sa).toBeGreaterThan(sb)
  })

  it('tie: first in list wins', () => {
    const a = row(1, { hasEnergyProfile: true, gridPricePerKwh: 0.5 })
    const b = row(2, { hasEnergyProfile: true, gridPricePerKwh: 0.5 })
    expect(scoreProjectClusterInList(a, [a, b])).toBeCloseTo(
      scoreProjectClusterInList(b, [a, b]),
      5
    )
    const r = computeProjectClusterSchedule([a, b])
    expect(r.recommendedClusterId).toBe(1)
  })

  it('UI prefs can change recommended cluster vs base energy scores', () => {
    const a = row(1, {
      hasEnergyProfile: true,
      gridPricePerKwh: 0.55,
      hasStorageSoc: true,
      storageSoc: 10
    })
    const b = row(2, {
      hasEnergyProfile: true,
      gridPricePerKwh: 0.56,
      hasStorageSoc: true,
      storageSoc: 95
    })
    const base = computeProjectClusterSchedule([a, b])
    expect(base.recommendedClusterId).toBe(1)
    const withPrefs = computeProjectClusterSchedule([a, b], {
      timeBands: ['valley'],
      socRangeMin: 90,
      socRangeMax: 100
    })
    expect(withPrefs.recommendedClusterId).toBe(2)
    expect(withPrefs.getScore(b)).toBeGreaterThan(withPrefs.getScore(a))
  })
})

describe('normalizeScheduleTimeBands', () => {
  it('dedupes and filters invalid', () => {
    expect(normalizeScheduleTimeBands(['peak', 'peak', 'valley', 'x', 1])).toEqual([
      'peak',
      'valley'
    ])
  })
})

describe('scoreClusterWithUiPrefs multi timeBands', () => {
  it('sums bonuses for each selected band when conditions match', () => {
    const c = row(1, {
      hasEnergyProfile: true,
      gridPricePerKwh: 0.5,
      hasStorageSoc: true,
      storageSoc: 80
    })
    const list = [c]
    const flatOnly = scoreClusterWithUiPrefs(c, list, {
      timeBands: ['flat'],
      socRangeMin: 0,
      socRangeMax: 100
    })
    const peakFlat = scoreClusterWithUiPrefs(c, list, {
      timeBands: ['peak', 'flat'],
      socRangeMin: 0,
      socRangeMax: 100
    })
    expect(peakFlat).toBeGreaterThan(flatOnly)
  })
})
