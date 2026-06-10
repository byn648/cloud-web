type ApiWrappedPayload<T> = {
  code?: number;
  message?: string;
  data?: T;
};

function parseResponsePayload(text: string): unknown {
  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function getPayloadErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object") {
    const wrapped = payload as ApiWrappedPayload<unknown>;
    if (typeof wrapped.code === "number" && wrapped.code !== 0 && wrapped.code !== 200) {
      return wrapped.message || `Request failed with code ${wrapped.code}`;
    }
    if (typeof wrapped.message === "string" && wrapped.message.trim()) {
      return wrapped.message;
    }
  }

  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  return fallback;
}

function toHeaders(init?: HeadersInit): Headers {
  return new Headers(init);
}

export function getAuthHeaders(withJsonContentType = true): Headers {
  const headers = new Headers();
  if (withJsonContentType) {
    headers.set("Content-Type", "application/json");
  }

  const token = localStorage.getItem("accessToken");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
}

export function buildQuery(
  params: Record<string, string | number | boolean | undefined | null>
): string {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    query.set(key, String(value));
  });

  return query.size > 0 ? `?${query.toString()}` : "";
}

export function parseNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return fallback;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

const GIB_BYTES = 1024 * 1024 * 1024;
const MIB_BYTES = 1024 * 1024;
const KIB_BYTES = 1024;

/**
 * 将 K8s 资源量、数字或带 Gi/Mi 等后缀的字符串统一解析为 **GiB** 浮点数，供项目资源池/工作空间等列表展示。
 * - 支持 `"6.00Gi"`, `"512Mi"` 等
 * - 无后缀的大整数按 **字节** 换算为 GiB（修复误将字节当 GiB 入库时的展示）
 * - 无后缀的较小数按 **GiB** 理解
 */
export function parseK8sMemoryStringToGib(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) {
      return 0;
    }
    if (value === 0) {
      return 0;
    }
    if (value >= 1_000_000) {
      return value / GIB_BYTES;
    }
    return value;
  }
  if (typeof value !== "string") {
    return 0;
  }
  const t = value.trim();
  if (!t || t === "0") {
    return 0;
  }
  const m = /^(-?[\d.]+)\s*([A-Za-z]*)$/.exec(t);
  if (!m) {
    return 0;
  }
  const n = parseFloat(m[1]!);
  if (!Number.isFinite(n) || n < 0) {
    return 0;
  }
  const unitRaw = m[2]!.trim();
  if (!unitRaw) {
    if (n > 1_000_000) {
      return n / GIB_BYTES;
    }
    return n;
  }
  const u = unitRaw.toLowerCase();
  // 二进制 (Kubernetes) — 长后缀在前，避免 "gi" 被 "g" 误伤
  if (u === "eib" || u === "ei") {
    // 1 EiB → GiB: ×2^30
    return n * 1024 * 1024 * 1024;
  }
  if (u === "pib" || u === "pi") {
    // 1 PiB → GiB: ×2^20
    return n * 1024 * 1024;
  }
  if (u === "tib" || u === "ti") {
    // 1 TiB → GiB: ×2^10
    return n * 1024;
  }
  if (u === "gib" || u === "gi") {
    return n;
  }
  if (u === "mib" || u === "mi") {
    return (n * MIB_BYTES) / GIB_BYTES;
  }
  if (u === "kib" || u === "ki") {
    return (n * KIB_BYTES) / GIB_BYTES;
  }
  // 十进 SI 单字符 (k, M, G, T, P, E)
  if (unitRaw.length === 1) {
    const c = u[0]!;
    if (c === "e") {
      return (n * 1e18) / GIB_BYTES;
    }
    if (c === "p") {
      return (n * 1e15) / GIB_BYTES;
    }
    if (c === "t") {
      return (n * 1e12) / GIB_BYTES;
    }
    if (c === "g") {
      return (n * 1e9) / GIB_BYTES;
    }
    if (c === "m") {
      return (n * 1e6) / GIB_BYTES;
    }
    if (c === "k") {
      return (n * 1e3) / GIB_BYTES;
    }
  }
  return n;
}

export function parseString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function readPositiveNumberFromStorage(keys: string[]): number | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  for (const key of keys) {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      continue;
    }
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return undefined;
}

export function resolvePlatformId(explicit?: number): number {
  if (Number.isFinite(explicit) && Number(explicit) > 0) {
    return Number(explicit);
  }

  const storageValue = readPositiveNumberFromStorage([
    "platformId",
    "currentPlatformId",
    "selectedPlatformId",
    "resourcePlatformId"
  ]);
  if (storageValue) {
    return storageValue;
  }

  const envValue = Number(import.meta.env.VITE_DEFAULT_PLATFORM_ID);
  if (Number.isFinite(envValue) && envValue > 0) {
    return envValue;
  }

  return 1;
}

interface RequestJsonOptions extends RequestInit {
  auth?: boolean;
  unwrapData?: boolean;
}

export async function requestJson<T>(url: string, options: RequestJsonOptions = {}): Promise<T> {
  const { auth = true, unwrapData = false, headers: inputHeaders, body, ...rest } = options;
  const headers = auth ? getAuthHeaders(!(body instanceof FormData)) : getAuthHeaders(!(body instanceof FormData));

  if (!auth) {
    headers.delete("Authorization");
  }

  const mergedHeaders = toHeaders(headers);
  const extraHeaders = toHeaders(inputHeaders);
  extraHeaders.forEach((value, key) => {
    mergedHeaders.set(key, value);
  });

  if (body instanceof FormData) {
    mergedHeaders.delete("Content-Type");
  }

  const response = await fetch(url, {
    ...rest,
    body,
    headers: mergedHeaders
  });

  const text = await response.text();
  const payload = parseResponsePayload(text);

  if (!response.ok) {
    throw new Error(getPayloadErrorMessage(payload, `Request failed with status ${response.status}`));
  }

  if (!text) {
    return undefined as T;
  }

  if (payload && typeof payload === "object") {
    const wrapped = payload as ApiWrappedPayload<T>;
    if (typeof wrapped.code === "number" && wrapped.code !== 0 && wrapped.code !== 200) {
      throw new Error(wrapped.message || `Request failed with code ${wrapped.code}`);
    }

    if ((unwrapData || typeof wrapped.code === "number") && "data" in wrapped) {
      return wrapped.data as T;
    }
  }

  return payload as T;
}
