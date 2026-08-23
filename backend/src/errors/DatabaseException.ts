import { AppError } from "./AppError";

export interface MySqlError {
    code: string;
    sqlMessage: string;
}

export function isMySqlError(err: unknown): err is MySqlError {
    return (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        "sqlMessage" in err
    );
}

export class DatabaseException extends AppError {
    constructor(message: string, statusCode = 500) {
        super(message, statusCode);
    }
}
