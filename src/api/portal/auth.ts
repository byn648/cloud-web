import type { AuthLoginRequest, AuthLoginResponse } from "../../types/auth";
import { encodePasswordLikeKubeNova } from "../../utils/encoding";

const AUTH_BASE_PATH = "/portal/v1/auth";

type ApiEnvelope<T> = {
  code?: number;
  message?: string;
  data?: T;
};

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
      throw new Error(wrapped.message || `Login failed with code ${wrapped.code}`);
    }
    if (wrapped.message) {
      throw new Error(wrapped.message);
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

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Login failed with status ${response.status}`);
  }

  const json = (await response.json()) as unknown;
  return unwrapLoginPayload(json);
}
