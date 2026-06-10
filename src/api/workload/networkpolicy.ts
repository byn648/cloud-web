import request from '@/utils/http'

const BASE = '/workload/v1/networkpolicy'

export interface NetworkPolicyListItem {
  name: string
  namespace: string
  age: string
  creationTimestamp: number
  labels?: Record<string, string>
  annotations?: Record<string, string>
}

export interface NetworkPolicyListResponse {
  total: number
  items: NetworkPolicyListItem[]
}

export interface NetworkPolicyListParams {
  clusterUuid: string
  namespace: string
  search?: string
  labelSelector?: string
}

export interface NetworkPolicyNameParams {
  clusterUuid: string
  namespace: string
  name: string
}

export interface NetworkPolicyYamlBody {
  clusterUuid: string
  namespace: string
  yamlStr: string
}

/** NetworkPolicy 列表 */
export function getNetworkPolicyListApi(params: NetworkPolicyListParams) {
  return request.get<NetworkPolicyListResponse>({
    url: BASE,
    params
  })
}

/** NetworkPolicy YAML */
export function getNetworkPolicyYamlApi(params: NetworkPolicyNameParams) {
  return request.get<string>({
    url: `${BASE}/yaml`,
    params
  })
}

/** 创建 NetworkPolicy（YAML） */
export function createNetworkPolicyApi(data: NetworkPolicyYamlBody) {
  return request.post<string>({
    url: BASE,
    data
  })
}

/** 更新 NetworkPolicy（YAML） */
export function updateNetworkPolicyApi(data: NetworkPolicyYamlBody) {
  return request.put<string>({
    url: BASE,
    data
  })
}

/** 删除 NetworkPolicy */
export function deleteNetworkPolicyApi(params: NetworkPolicyNameParams) {
  return request.del<string>({
    url: BASE,
    params
  })
}
