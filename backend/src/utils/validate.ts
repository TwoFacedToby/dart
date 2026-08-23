import { z } from "zod";
import { ValidationException } from "../errors/ValidationException";

export function validateBody<T extends z.ZodType>(
    schema: T,
    body: unknown
): z.infer<T> {
    const result = schema.safeParse(body);

    if (!result.success) {
        const fieldErrors: Record<string, string> = {};

        for (const issue of result.error.issues) {
            const field = issue.path.join(".");
            fieldErrors[field] = issue.message;
        }

        throw new ValidationException(
            "Validation failed",
            fieldErrors
        );
    }

    return result.data;
}
