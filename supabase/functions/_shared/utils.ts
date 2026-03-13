import { corsHeaders } from "./constants.ts";

/**
 * Creates a standardized JSON error response.
 * @param error The error object or message.
 * @param status The HTTP status code.
 * @returns A Response object.
 */
export function createErrorResponse(error: unknown, status = 500): Response {
  let errorPayload: object;
  if (error instanceof Error) {
    errorPayload = { error: error.message };
  } else if (typeof error === "object" && error !== null) {
    // Instead of spreading, nest the object to prevent crashes on circular references
    // and to keep a predictable error structure.
    errorPayload = {
      error: "An object was thrown. See details.",
      details: error,
    };
  } else {
    errorPayload = { error: String(error) };
  }

  console.error(`💥 Function Error (${status}):`, errorPayload);

  // Свойства `success` и `timestamp` размещены последними, чтобы гарантировать,
  // что они не будут перезаписаны объектом ошибки.
  const responsePayload = {
    ...errorPayload,
    success: false,
    timestamp: new Date().toISOString(),
  };

  // Use a replacer to handle potential circular references inside the error object.
  const getCircularReplacer = () => {
    const seen = new WeakSet();
    return (_key: string, value: unknown) => {
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) {
          return "[Circular]";
        }
        seen.add(value);
      }
      return value;
    };
  };

  return new Response(
    JSON.stringify(responsePayload, getCircularReplacer()),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}