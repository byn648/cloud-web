import api from "@/utils/http";
import type {
  SLOResponse,
  ErrorBudgetResponse,
  ResourceResponse,
  PowerStorageResponse,
  ServiceChainResponse
} from "./types";

export function fetchSLO() {
  return api.get<SLOResponse>({ url: "/green/v1/performance/slo" });
}

export function fetchErrorBudget() {
  return api.get<ErrorBudgetResponse>({ url: "/green/v1/performance/error-budget" });
}

export function fetchResource() {
  return api.get<ResourceResponse>({ url: "/green/v1/performance/resource" });
}

export function fetchPowerStorage() {
  return api.get<PowerStorageResponse>({ url: "/green/v1/performance/power-storage" });
}

export function fetchServiceChain() {
  return api.get<ServiceChainResponse>({ url: "/green/v1/performance/service-chain" });
}
