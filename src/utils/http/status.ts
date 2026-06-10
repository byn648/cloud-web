export const ApiStatus = {
  success: 0,
  unauthorized: 401,
  forbidden: 403,
  notFound: 404,
  methodNotAllowed: 405,
  error: 400,
  requestTimeout: 408,
  internalServerError: 500,
  badGateway: 502,
  serviceUnavailable: 503,
  gatewayTimeout: 504
} as const

export type ApiStatusType = (typeof ApiStatus)[keyof typeof ApiStatus]
