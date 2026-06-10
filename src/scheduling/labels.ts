import type { ClusterScheduleInput } from './types'

/** 集群下拉内调度分说明 */
export const CLUSTER_SCHEDULE_TOOLTIP =
  '展示分综合电价（越低越好）、储能 SOC（越高越好）及 CPU/内存余量，用于列表排序与「参考推荐」（当前为前端示意，可对接后端模型）。'

/** 展示用：保留一位小数的字符串，非有限数显示为「—」 */
export function formatScheduleScore(score: number): string {
  if (!Number.isFinite(score)) {
    return '—'
  }
  return String(Math.round(score * 10) / 10)
}

export function formatEnergyPriceLabel(
  c: Pick<ClusterScheduleInput, 'hasEnergyProfile' | 'gridPricePerKwh'>
): string {
  if (!c.hasEnergyProfile) {
    return '—'
  }
  return `${formatScheduleScore(c.gridPricePerKwh ?? 0)} 元/kWh`
}

export function formatStorageSocLabel(
  c: Pick<ClusterScheduleInput, 'hasStorageSoc' | 'storageSoc'>
): string {
  if (!c.hasStorageSoc) {
    return '—'
  }
  return `${formatScheduleScore(c.storageSoc ?? 0)}%`
}

export function formatClusterSelectLabel(
  cluster: Pick<ClusterScheduleInput, 'clusterName'>,
  score: number
): string {
  const name = cluster.clusterName ?? ''
  return `${name}（分 ${formatScheduleScore(score)}）`
}
