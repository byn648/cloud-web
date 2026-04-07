import type { DashboardOverviewResponse } from "../../types/dashboard";

const DASHBOARD_BASE_PATH = "/portal/v1/dashboard";

// Fetches dashboard summary data for the post-login workbench page.
export async function getDashboardOverviewApi(
  username?: string,
  clusterUuid?: string
): Promise<DashboardOverviewResponse> {
  const params = new URLSearchParams();
  if (username) params.set("username", username);
  if (clusterUuid) params.set("clusterUuid", clusterUuid);
  const query = params.size > 0 ? `?${params.toString()}` : "";
  const response = await fetch(`${DASHBOARD_BASE_PATH}/overview${query}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Dashboard request failed with status ${response.status}`);
  }

  return (await response.json()) as DashboardOverviewResponse;
}
