/** 与 kube-nova 一致的通用 API 响应结构 */
export interface BaseResponse<T = unknown> {
  code: number
  message: string
  data: T
}
