import { AppError } from "./AppError";

export class ValidationException extends AppError {
    public fields?: Record<string, string>;

    constructor(
        message: string,
        fields?: Record<string, string>
    ) {
        super(message, 400);
        this.fields = fields;
    }
}
