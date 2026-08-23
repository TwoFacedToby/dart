import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";
import { ValidationException } from "../errors/ValidationException";
import { isMySqlError } from "../errors/DatabaseException";
import { inProduction } from "../config/inProduction";

export function errorHandler(
    err: unknown,
    req: Request,
    res: Response,
    next: NextFunction
) {
    console.error(err);

    if (!inProduction && err instanceof ValidationException) {
        return res.status(err.statusCode).json({
            error: err.message,
            fields: err.fields,
        });
    }

    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            error: err.message,
        });
    }

    if (!inProduction && isMySqlError(err)) {
        return res.status(400).json({
            error: err.sqlMessage,
            code: err.code,
        });
    }

    return res.status(500).json({
        error: "Internal server error",
    });
}
