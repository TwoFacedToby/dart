import { Router, Request, Response } from "express";
import { checkKeyRateLimited } from "../../utils/accessKey";

const router = Router();

router.post("/verify", (req: Request, res: Response) => {
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const key = typeof req.body?.key === "string" ? req.body.key : undefined;
    const result = checkKeyRateLimited(key, ip);

    if (result === "locked") {
        res.status(429).json({ error: "Too many failed attempts. Try again later." });
        return;
    }
    if (result === "invalid") {
        res.status(401).json({ error: "Invalid key" });
        return;
    }
    res.status(200).json({ valid: true });
});

export default router;
