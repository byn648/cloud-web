export interface UserSearchFormModel {
  username: string;
  nickname: string;
  phone: string;
  email: string;
  workNumber: string;
  status: "" | "0" | "1";
}

export function createDefaultSearchForm(): UserSearchFormModel {
  return {
    username: "",
    nickname: "",
    phone: "",
    email: "",
    workNumber: "",
    status: ""
  };
}

export function toUserSearchParams(form: UserSearchFormModel): {
  username?: string;
  nickname?: string;
  phone?: string;
  email?: string;
  workNumber?: string;
  status?: number;
} {
  return {
    username: form.username.trim() || undefined,
    nickname: form.nickname.trim() || undefined,
    phone: form.phone.trim() || undefined,
    email: form.email.trim() || undefined,
    workNumber: form.workNumber.trim() || undefined,
    status: form.status === "" ? undefined : Number(form.status)
  };
}

export function formatTimestamp(timestamp: number): string {
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return "-";
  }

  return new Date(timestamp * 1000).toLocaleString("zh-CN", {
    hour12: false
  });
}

export function getStatusMeta(status: number): {
  label: string;
  className: "enabled" | "disabled";
} {
  if (status === 1) {
    return { label: "启用", className: "enabled" };
  }

  return { label: "禁用", className: "disabled" };
}
