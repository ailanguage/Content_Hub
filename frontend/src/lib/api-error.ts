import { NextResponse } from "next/server";

/**
 * Generates a short unique error ID for log correlation.
 * Format: err-<8 hex chars> (e.g., err-a1b2c3d4)
 */
function generateErrorId(): string {
  const hex = Math.random().toString(16).slice(2, 10).padEnd(8, "0");
  return `err-${hex}`;
}

/**
 * Extracts a meaningful message from an unknown caught value.
 */
function extractMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/**
 * Extracts the stack trace if available.
 */
function extractStack(error: unknown): string | undefined {
  if (error instanceof Error) return error.stack;
  return undefined;
}

/**
 * Standard API error handler. Use in catch blocks of all API routes.
 *
 * - Logs the FULL error (message + stack) to server console with context
 * - Returns a descriptive but safe error to the client with a correlation ID
 *
 * @param operation - Human-readable description of what was attempted (e.g., "Create template", "List tasks")
 * @param error - The caught error value
 * @param status - HTTP status code (default 500)
 *
 * @example
 * ```ts
 * } catch (error) {
 *   return apiError("Create template", error);
 * }
 * ```
 */
export function apiError(
  operation: string,
  error: unknown,
  status: number = 500,
  headers?: Record<string, string>
): NextResponse {
  const errorId = generateErrorId();
  const message = extractMessage(error);
  const stack = extractStack(error);

  // Full details logged server-side (visible in Docker/Portainer logs)
  console.error(
    `[API ERROR] ${operation} | ${errorId} | ${message}${stack ? `\n${stack}` : ""}`
  );

  // Client gets the operation context + correlation ID, but not internals
  return NextResponse.json(
    {
      error: `${operation} failed`,
      errorId,
      hint: "Check server logs for full details using the error ID above.",
    },
    { status, headers }
  );
}
