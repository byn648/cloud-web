/**
 * 调度层输入：与 UI 解耦的窄类型；`ProjectCluster` 满足此接口。
 * 仅包含打分所需字段，便于单测与后续换实现。
 */
export type ScheduleStrategy = 'energy' | 'resource' | 'empty'

export interface ClusterScheduleInput {
  id: number
  clusterName?: string
  cpuCapacity: number
  cpuAllocated: number
  memCapacity: number
  memAllocated: number
  hasEnergyProfile?: boolean
  gridPricePerKwh?: number
  hasStorageSoc?: boolean
  storageSoc?: number
}
