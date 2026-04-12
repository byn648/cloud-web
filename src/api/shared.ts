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

export function parseString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
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
