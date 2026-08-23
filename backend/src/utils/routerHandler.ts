import { NextFunction, Request, Response, Router } from "express";

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

// No auth in this app (trusted local network, no login). Every route just
// gets wrapped so thrown/rejected errors reach ErrorHandler instead of
// crashing the process.
function wrapRoute(r: Router, method: "get" | "post" | "put" | "delete", path: string, call: Handler) {
    r[method](path, (req: Request, res: Response, next: NextFunction) =>
        Promise.resolve(call(req, res, next)).catch(next)
    );
}

export function get(r: Router, path: string, call: Handler) {
    wrapRoute(r, "get", path, call);
}
export function post(r: Router, path: string, call: Handler) {
    wrapRoute(r, "post", path, call);
}
export function put(r: Router, path: string, call: Handler) {
    wrapRoute(r, "put", path, call);
}
export function delete_(r: Router, path: string, call: Handler) {
    wrapRoute(r, "delete", path, call);
}
