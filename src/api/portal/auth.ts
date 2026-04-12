import type { AuthLoginRequest, AuthLoginResponse } from "../../types/auth";
import { encodePasswordLikeKubeNova } from "../../utils/encoding";

const AUTH_BASE_PATH = "/portal/v1/auth";

type ApiEnvelope<T> = {
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

function resolveLoginErrorMessage(code?: number, message?: string): string {
  if (typeof message === "string" && message.trim()) {
    return message;
  }

  if (typeof code === "number" && code !== 0 && code !== 200) {
    return `登录失败（${code}）`;
  }

  return "登录失败";
}

function normalizeLoginErrorFromPayload(payload: unknown, fallback?: string): string {
  if (payload && typeof payload === "object") {
    const wrapped = payload as ApiEnvelope<unknown>;
    if (typeof wrapped.code === "number" || typeof wrapped.message === "string") {
      return resolveLoginErrorMessage(wrapped.code, wrapped.message);
    }
  }

  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  return fallback || "登录失败";
}

function isAuthLoginResponse(value: unknown): value is AuthLoginResponse {
  if (!value || typeof value !== "object") {
    return false;
  }
  const v = value as Partial<AuthLoginResponse>;
  return !!v.token && typeof v.token.accessToken === "string" && typeof v.token.refreshToken === "string";
}

function unwrapLoginPayload(payload: unknown): AuthLoginResponse {
  if (isAuthLoginResponse(payload)) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const wrapped = payload as ApiEnvelope<AuthLoginResponse>;
    if (isAuthLoginResponse(wrapped.data)) {
      return wrapped.data;
    }
    if (wrapped.code !== undefined && wrapped.code !== 0 && wrapped.code !== 200) {
      throw new Error(resolveLoginErrorMessage(wrapped.code, wrapped.message));
    }
  }

  throw new Error("Login response format mismatch");
}

export async function loginApi(data: AuthLoginRequest): Promise<AuthLoginResponse> {
  const response = await fetch(`${AUTH_BASE_PATH}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      username: data.username,
      password: encodePasswordLikeKubeNova(data.password)
    })
  });

  const text = await response.text();
  const payload = parseResponsePayload(text);

  if (!response.ok) {
    throw new Error(normalizeLoginErrorFromPayload(payload, `Login failed with status ${response.status}`));
  }

  return unwrapLoginPayload(payload);
}
