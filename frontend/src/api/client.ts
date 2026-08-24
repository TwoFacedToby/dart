const BASE_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/").replace(/\/+$/, "");
const ACCESS_KEY_STORAGE_KEY = "dart-app-access-key";

export function getStoredAccessKey(): string | null {
    return localStorage.getItem(ACCESS_KEY_STORAGE_KEY);
}

export function setStoredAccessKey(key: string): void {
    localStorage.setItem(ACCESS_KEY_STORAGE_KEY, key);
}

export function clearStoredAccessKey(): void {
    localStorage.removeItem(ACCESS_KEY_STORAGE_KEY);
}

// Fired whenever a request comes back 401, so the app-level auth gate can
// drop back to the key screen without every caller having to check for it.
type UnauthorizedListener = () => void;
let unauthorizedListener: UnauthorizedListener | null = null;
export function onUnauthorized(listener: UnauthorizedListener): void {
    unauthorizedListener = listener;
}

export async function apiFetch<T>(
    path: string,
    options: RequestInit = {}
): Promise<T> {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const res = await fetch(`${BASE_URL}${normalizedPath}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            "X-App-Key": getStoredAccessKey() ?? "",
            ...options.headers,
        },
    });

    if (res.status === 401) {
        clearStoredAccessKey();
        unauthorizedListener?.();
    }

    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(error.error ?? `HTTP ${res.status}`);
    }

    return res.json() as Promise<T>;
}
