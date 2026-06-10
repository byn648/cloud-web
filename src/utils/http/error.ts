import { ElMessage } from 'element-plus'
import { ApiStatus } from './status'

export interface ErrorResponse {
  code: number
  msg: string
  data?: unknown
}

export interface ErrorLogData {
  code: number
  message: string
  data?: unknown
  timestamp: string
  url?: string
  method?: string
  stack?: string
}

export class HttpError extends Error {
  public readonly code: number
  public readonly data?: unknown
  public readonly timestamp: string
  public readonly url?: string
  public readonly method?: string

  constructor(
    message: string,
    code: number,
    options?: {
      data?: unknown
      url?: string
      method?: string
    }
  ) {
    super(message)
    this.name = 'HttpError'
    this.code = code
    this.data = options?.data
    this.timestamp = new Date().toISOString()
    this.url = options?.url
    this.method = options?.method
  }

  public toLogData(): ErrorLogData {
    return {
      code: this.code,
      message: this.message,
      data: this.data,
      timestamp: this.timestamp,
      url: this.url,
      method: this.method,
      stack: this.stack
    }
  }
}

const statusMessages: Record<number, string> = {
  [ApiStatus.unauthorized]: '未授权，请重新登录',
  [ApiStatus.forbidden]: '没有权限访问',
  [ApiStatus.notFound]: '请求的资源不存在',
  [ApiStatus.methodNotAllowed]: '请求方法不允许',
  [ApiStatus.requestTimeout]: '请求超时',
  [ApiStatus.internalServerError]: '服务器内部错误',
  [ApiStatus.badGateway]: '网关错误',
  [ApiStatus.serviceUnavailable]: '服务暂时不可用',
  [ApiStatus.gatewayTimeout]: '网关超时'
}

export function showError(error: HttpError, showMessage = true): void {
  if (showMessage) {
    ElMessage.error(error.message)
  }
  console.error('[HTTP Error]', error.toLogData())
}

export function showSuccess(message: string, showMessage = true): void {
  if (showMessage) {
    ElMessage.success(message)
  }
}

export const isHttpError = (error: unknown): error is HttpError => {
  return error instanceof HttpError
}

export function httpStatusMessage(status: number): string {
  return statusMessages[status] || '请求失败'
}
