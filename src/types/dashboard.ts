export interface DashboardStat {
  id: string;
  title: string;
  value: string;
  trend: string;
  up: boolean;
  icon: string;
  caption: string;
}

export interface DashboardAction {
  id: string;
  title: string;
  description: string;
  route: string;
}

export interface DashboardActivity {
  id: string;
  title: string;
  detail: string;
  timestamp: number;
}

export interface DashboardOverviewResponse {
  welcomeName: string;
  stats: DashboardStat[];
  actions: DashboardAction[];
  activities: DashboardActivity[];
}
