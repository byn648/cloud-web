/**
 * 与 Kubernetes Quantity 常见写法兼容，用于前端校验 request/limit 与提示异常输入。
 * 不追求与 apiserver 100% 一致，覆盖 Gi/Mi/Ti/CPU m 等常见形式即可。
 */

const BIN: Record<string, number> = {
  Ki: 1024,
  Mi: 1024 ** 2,
  Gi: 1024 ** 3,
  Ti: 1024 ** 4,
  Pi: 1024 ** 5,
  Ei: 1024 ** 6
}

/** 将 memory quantity 解析为字节数；无法解析时返回 null */
export function parseMemoryToBytes(quantity: string | undefined | null): number | null {
  if (quantity == null) return null
  const t = String(quantity).trim()
  if (!t) return null

  const m = t.match(/^([\d.]+)\s*([A-Za-z]+)$/)
  if (!m) {
    const n = Number(t)
    return Number.isFinite(n) && n >= 0 ? n : null
  }
  const n = parseFloat(m[1])
  const u = m[2]
  if (!Number.isFinite(n) || n < 0) return null
  const mult = BIN[u]
  if (mult) return n * mult
  return null
}

/** CPU 转为 millicores；无法解析时返回 null */
export function parseCpuToMilli(quantity: string | undefined | null): number | null {
  if (quantity == null) return null
  const t = String(quantity).trim()
  if (!t) return null
  if (t.endsWith("m")) {
    const n = parseFloat(t.slice(0, -1))
    return Number.isFinite(n) && n >= 0 ? n : null
  }
  const cores = parseFloat(t)
  return Number.isFinite(cores) && cores >= 0 ? Math.round(cores * 1000) : null
}

export interface QuotaFieldStrings {
  requests: { cpu?: string; memory?: string }
  limits: { cpu?: string; memory?: string }
}

/** 返回空数组表示在「已填写」的前提下未发现明显非法关系 */
export function getQuotaInconsistencies(quota: QuotaFieldStrings): string[] {
  const issues: string[] = []

  const rCpu = quota.requests.cpu
  const lCpu = quota.limits.cpu
  const rMem = quota.requests.memory
  const lMem = quota.limits.memory

  if (rCpu && lCpu) {
    const a = parseCpuToMilli(rCpu)
    const b = parseCpuToMilli(lCpu)
    if (a != null && b != null && a > b) {
      issues.push(`CPU：Requests（${rCpu}）不能大于 Limits（${lCpu}）`)
    }
  }

  if (rMem && lMem) {
    const a = parseMemoryToBytes(rMem)
    const b = parseMemoryToBytes(lMem)
    if (a != null && b != null && a > b) {
      issues.push(
        `内存：Requests（${rMem}）不能大于 Limits（${lMem}），否则 Pod 无法被调度/创建。请检查单位是否输错（例如误将 Mi 打成 Ti）。`
      )
    }
  }

  // 单资源过大提示（避免误打 Ti）
  if (lMem) {
    const b = parseMemoryToBytes(lMem)
    if (b != null && b > 1024 ** 5) {
      issues.push(`内存 Limits 数值极大（${lMem}），若非正常需求请检查单位。`)
    }
  }
  if (rMem) {
    const a = parseMemoryToBytes(rMem)
    if (a != null && a > 1024 ** 5) {
      issues.push(
        `内存 Requests 数值极大（${rMem}），极可能导致无一节点可调度。若本意是百兆级，常误选为「Ti」而非「Mi」或「Gi」。`
      )
    }
  }

  return issues
}
