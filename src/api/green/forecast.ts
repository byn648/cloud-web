import api from "@/utils/http";
import type {
  ForecastResponse,
  EnergyForecastResponse,
  CollectResponse
} from "./types";

export function fetchForecast(params: {
  taskType?: string;
  timeRange?: string;
  confidenceLevel?: number;
  forecastHorizon?: number;
  smoothingFactor?: number;
}) {
  return api.get<ForecastResponse>({
    url: "/green/v1/forecast",
    params
  });
}

export function fetchEnergyForecast(params?: {
  hours?: number;
  confidenceLevel?: number;
  taskType?: string;
}) {
  return api.get<EnergyForecastResponse>({
    url: "/green/v1/forecast/energy",
    params
  });
}

export function triggerCollection() {
  return api.post<CollectResponse>({
    url: "/green/v1/forecast/collect"
  });
}
