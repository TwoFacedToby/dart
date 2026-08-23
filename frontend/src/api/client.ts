const BASE_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/").replace(/\/+$/, "");

export async function apiFetch<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const res = await fetch(`${BASE_URL}${normalizedPath}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
    });

    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(error.error ?? `HTTP ${res.status}`);
    }

    return res.json() as Promise<T>;
}
