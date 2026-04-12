import { buildQuery, parseNumber, parseString, requestJson } from "../shared";

const BILLING_BASE_PATH = "/manager/v1/billing";

export interface BillingPriceConfig {
  id: number;
  configName: string;
  description: string;
  cpuPrice: number;
  memoryPrice: number;
  storagePrice: number;
  gpuPrice: number;
  podPrice: number;
  managementFee: number;
  isSystem: number;
  createdBy: string;
  updatedBy: string;
  createdAt: number;
  updatedAt: number;
}

function normalizePriceConfig(payload: unknown): BillingPriceConfig {
  const item = (payload ?? {}) as Record<string, unknown>;

  return {
    id: parseNumber(item.id),
    configName: parseString(item.configName),
    description: parseString(item.description),
    cpuPrice: parseNumber(item.cpuPrice),
    memoryPrice: parseNumber(item.memoryPrice),
    storagePrice: parseNumber(item.storagePrice),
    gpuPrice: parseNumber(item.gpuPrice),
    podPrice: parseNumber(item.podPrice),
    managementFee: parseNumber(item.managementFee),
    isSystem: parseNumber(item.isSystem),
    createdBy: parseString(item.createdBy),
    updatedBy: parseString(item.updatedBy),
    createdAt: parseNumber(item.createdAt),
    updatedAt: parseNumber(item.updatedAt)
  };
}

export async function getBillingPriceConfigListApi(configName?: string): Promise<BillingPriceConfig[]> {
  const query = buildQuery({
    configName: configName?.trim() || undefined
  });

  const response = await requestJson<unknown[]>(`${BILLING_BASE_PATH}/price-config${query}`, {
    method: "GET",
    unwrapData: true
  });

  return Array.isArray(response) ? response.map((item) => normalizePriceConfig(item)) : [];
}
