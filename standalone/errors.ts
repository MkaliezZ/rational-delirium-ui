export class KnowledgeError extends Error {
    constructor(readonly code: string, message: string, readonly details?: unknown) {
        super(message);
        this.name = "KnowledgeError";
    }
}
export function requireValue(condition: unknown, code: string, message: string, details?: unknown): asserts condition {
    if (!condition)
        throw new KnowledgeError(code, message, details);
}
export function errorData(error: unknown) {
    return error instanceof KnowledgeError
        ? { code: error.code, message: error.message, ...(error.details === undefined ? {} : { details: error.details }) }
        : { code: "IO_ERROR", message: error instanceof Error ? error.message : String(error) };
}
export function record(value: unknown): Record<string, unknown> {
    requireValue(value !== null && typeof value === "object" && !Array.isArray(value), "INVALID_ARGUMENT", "Expected a JSON object");
    return value as Record<string, unknown>;
}
export function string(value: unknown, label: string): string {
    requireValue(typeof value === "string" && value.trim().length > 0, "INVALID_ARGUMENT", `${label} must be a non-empty string`);
    return value;
}
export function integer(value: unknown, fallback: number, min: number, max: number): number {
    if (value === undefined)
        return fallback;
    const n = typeof value === "string" ? Number(value) : value;
    requireValue(typeof n === "number" && Number.isInteger(n) && n >= min && n <= max, "INVALID_ARGUMENT", `Expected an integer from ${min} to ${max}`);
    return n;
}
