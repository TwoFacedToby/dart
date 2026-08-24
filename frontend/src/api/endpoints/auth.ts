const BASE_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:4000/api/").replace(/\/+$/, "");

export type VerifyResult = "ok" | "invalid" | "locked" | "error";

export async function verifyAccessKey(key: string): Promise<VerifyResult> {
    try {
        const res = await fetch(`${BASE_URL}/auth/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key }),
        });
        if (res.status === 200) return "ok";
        if (res.status === 429) return "locked";
        if (res.status === 401) return "invalid";
        return "error";
    } catch {
        return "error";
    }
}
