import { Request, Response, NextFunction } from "express";

// Simple in-memory per-IP failure limiter
// Only *failed* attempts count against the limit, so a client that already has the correct key (the viewer polling every few seconds, say) 
const FAILURE_THRESHOLD = 5;
const WINDOW_MS = 60 * 1000;

interface FailureRecord {
    count: number;
    windowStart: number;
}

const failures = new Map<string, FailureRecord>();

function clientIp(req: Request): string {
    return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

function isLockedOut(ip: string): boolean {
    const record = failures.get(ip);
    if (!record) return false;
    if (Date.now() - record.windowStart > WINDOW_MS) {
        failures.delete(ip);
        return false;
    }
    return record.count >= FAILURE_THRESHOLD;
}

function recordFailure(ip: string): void {
    const record = failures.get(ip);
    if (!record || Date.now() - record.windowStart > WINDOW_MS) {
        failures.set(ip, { count: 1, windowStart: Date.now() });
    } else {
        record.count += 1;
    }
}

function isValidKey(candidate: string | undefined | null): boolean {
    const expected = process.env.APP_ACCESS_KEY;
    if (!expected) return false; // fail closed if the server isn't configured with one
    return !!candidate && candidate === expected;
}

export function checkKeyRateLimited(candidate: string | undefined | null, ip: string): "ok" | "invalid" | "locked" {
    if (isLockedOut(ip)) return "locked";
    if (isValidKey(candidate)) return "ok";
    recordFailure(ip);
    return "invalid";
}

export function accessKeyMiddleware(req: Request, res: Response, next: NextFunction): void {
    const result = checkKeyRateLimited(req.header("X-App-Key"), clientIp(req));

    if (result === "locked") {
        res.status(429).json({ error: "Too many failed attempts. Try again later." });
        return;
    }
    if (result === "invalid") {
        res.status(401).json({ error: "Invalid or missing access key" });
        return;
    }
    next();
}
