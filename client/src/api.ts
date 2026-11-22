async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    credentials: "include",
    ...options,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) {
    const msg = json.error?.message || `Request failed with status ${res.status}`;
    throw new Error(msg);
  }
  return json.data as T;
}

export const api = {
  getMe: () => request<{ user: any; profileCompletion: number; stats: any }>("/users/me"),
  login: (data: any) => request<any>("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  register: (data: any) => request<any>("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  logout: () => request<any>("/auth/logout", { method: "POST" }),
  getRequests: (query?: string) => request<any>(`/requests${query || ""}`),
  getRequest: (id: string) => request<any>(`/requests/${id}`),
  createRequest: (data: any) => request<any>("/requests", { method: "POST", body: JSON.stringify(data) }),
  offerHelp: (requestId: string, message: string) => request<any>(`/requests/${requestId}/offers`, { method: "POST", body: JSON.stringify({ message }) }),
  getDashboard: () => request<any>("/users/me"), // or dashboard endpoint
  getNexconnToken: () => request<any>("/nexconn/token", { method: "POST" }),
};
