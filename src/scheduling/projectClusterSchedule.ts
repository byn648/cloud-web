import type { ClusterScheduleInput, ScheduleStrategy } from './types'

const eps = 1e-9

export type ScheduleTimeBand = 'peak' | 'valley' | 'flat'

const SCHEDULE_TIME_BANDS: readonly ScheduleTimeBand[] = ['peak', 'valley', 'flat']

export function normalizeScheduleTimeBands(raw: unknown): ScheduleTimeBand[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const out: ScheduleTimeBand[] = []
  for (const x of raw) {
    if (SCHEDULE_TIME_BANDS.includes(x as ScheduleTimeBand) && !out.includes(x as ScheduleTimeBand)) {
      out.push(x as ScheduleTimeBand)
    }
  }
  return out
}

/** 应用中心集群下拉内：用户偏好（示意性影响展示分，可后续接真实模型） */
export interface ClusterScheduleUiPrefs {
  /** 峰/谷/平可多选；各自满足条件时叠加示意加分 */
  timeBands: ScheduleTimeBand[]
  /** 期望储能 SOC 区间 0–100 */
  socRangeMin: number
  socRangeMax: number
}

function clampSocRange(prefs: ClusterScheduleUiPrefs): { lo: number; hi: number } {
  const a = Math.max(0, Math.min(100, prefs.socRangeMin))
  const b = Math.max(0, Math.min(100, prefs.socRangeMax))
  return { lo: Math.min(a, b), hi: Math.max(a, b) }
}

/**
 * 在 `scoreProjectClusterInList` 基础上叠加下拉内配置的偏好分（仅用于前端展示与参考排序）。
 */
export function scoreClusterWithUiPrefs(
  cluster: ClusterScheduleInput,
  list: readonly ClusterScheduleInput[],
  prefs?: ClusterScheduleUiPrefs | null
): number {
  const raw = scoreProjectClusterInList(cluster, list)
  if (!prefs) {
    return Math.round(raw)
  }
  const { lo, hi } = clampSocRange(prefs)
  let s = raw
  const soc =
    cluster.hasStorageSoc && cluster.storageSoc !== undefined ? cluster.storageSoc : 50
  if (soc >= lo && soc <= hi) {
    s += 8
  } else {
    s -= 5
  }
  const bands = new Set(prefs.timeBands ?? [])
  if (bands.has('peak') && cluster.hasEnergyProfile) {
    s += 3
  }
  if (bands.has('valley') && cluster.hasStorageSoc && (cluster.storageSoc ?? 0) >= 55) {
    s += 4
  }
  if (bands.has('flat')) {
    s += 1
  }
  return Math.max(0, Math.min(100, Math.round(s)))
}

/**
 * 单节点调度分 0–100，越高越优。`list` 为本次参与归一化的一批集群（与推荐 id、排名同源）。
 * 有能源画像时按电价(低优)+储能 SOC(高优)；无画像时回退 CPU/内存余量。
 */
export function scoreProjectClusterInList(
  cluster: ClusterScheduleInput,
  list: readonly ClusterScheduleInput[]
): number {
  const withProf = list.filter((x) => x.hasEnergyProfile)
  if (withProf.length) {
    const prices = withProf.map((x) => x.gridPricePerKwh ?? 0)
    const minP = Math.min(...prices)
    const maxP = Math.max(...prices)
    const gp = cluster.gridPricePerKwh ?? 0
    let pricePart: number
    if (!cluster.hasEnergyProfile) {
      pricePart = 0
    } else if (Math.abs(maxP - minP) < eps) {
      pricePart = 100
    } else {
      pricePart = (100 * (maxP - gp)) / (maxP - minP + eps)
      pricePart = Math.max(0, Math.min(100, pricePart))
    }
    const socVal =
      cluster.hasStorageSoc && cluster.storageSoc !== undefined
        ? cluster.storageSoc
        : 50
    const socPart = Math.max(0, Math.min(100, socVal))
    return 0.5 * pricePart + 0.5 * socPart
  }
  const cpuCap = Math.max(cluster.cpuCapacity, eps)
  const memCap = Math.max(cluster.memCapacity, eps)
  const cpuFree = (cpuCap - cluster.cpuAllocated) / cpuCap
  const memFree = (memCap - cluster.memAllocated) / memCap
  return Math.max(0, Math.min(100, 100 * (0.5 * cpuFree + 0.5 * memFree)))
}

export interface ProjectClusterScheduleResult {
  /** 本批空列表时为 `empty` */
  strategy: ScheduleStrategy
  /** 分数最高者；列表为空为 null。同分取列表中先出现者。 */
  recommendedClusterId: number | null
  getScore: (c: ClusterScheduleInput) => number
  /**
   * 1-based 名次；0 表示不在本批中（对列表外 id 调 `getScore` 仍与同一 list 归一化，
   * 但 `getRank` 对未知 id 返回 0 需调用方在列表内使用）。
   */
  getRank: (c: ClusterScheduleInput) => number
  scoreById: ReadonlyMap<number, number>
  rankById: ReadonlyMap<number, number>
}

/**
 * 对一批集群 + 环境类字段做打分、排名与推荐 id。实现可整体替换，页面只依赖此返回结构。
 */
export function computeProjectClusterSchedule(
  clusters: readonly ClusterScheduleInput[],
  prefs?: ClusterScheduleUiPrefs | null
): ProjectClusterScheduleResult {
  if (!clusters.length) {
    const empty = new Map<number, number>()
    return {
      strategy: 'empty',
      recommendedClusterId: null,
      getScore: () => 0,
      getRank: () => 0,
      scoreById: empty,
      rankById: empty
    }
  }

  const list = clusters
  const withProf = list.filter((x) => x.hasEnergyProfile)
  const strategy: ScheduleStrategy = withProf.length > 0 ? 'energy' : 'resource'

  const scoreById = new Map<number, number>()
  for (const c of list) {
    scoreById.set(c.id, scoreClusterWithUiPrefs(c, list, prefs))
  }

  let best: { id: number; s: number } | null = null
  for (const c of list) {
    const s = scoreById.get(c.id) ?? 0
    if (!best || s > best.s) {
      best = { id: c.id, s }
    }
  }

  const scored = list.map((c) => ({ id: c.id, s: scoreById.get(c.id) ?? 0 }))
  scored.sort((a, b) => b.s - a.s)
  const rankById = new Map<number, number>()
  scored.forEach((e, i) => {
    rankById.set(e.id, i + 1)
  })

  return {
    strategy,
    recommendedClusterId: best?.id ?? null,
    getScore: (c) => scoreClusterWithUiPrefs(c, list, prefs),
    getRank: (c) => rankById.get(c.id) ?? 0,
    scoreById,
    rankById
  }
}
