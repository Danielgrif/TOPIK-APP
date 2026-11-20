import { corsHeaders } from "./constants.ts";

/**
 * Ошибка с явным HTTP-статусом. Используется для валидации и авторизации:
 * только такие ошибки (со статусом < 500) показываются клиенту как есть.
 */
export class HttpError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

/**
 * Creates a standardized JSON error response.
 *
 * Важно: во внутренние ошибки (БД, Gemini, storage) клиент не попадает —
 * они логируются на сервере, а наружу отдаётся обобщённое сообщение.
 *
 * @param error The error object or message.
 * @param status Optional explicit HTTP status code.
 * @returns A Response object.
 */
export function createErrorResponse(error: unknown, status?: number): Response {
  const errorStatus =
    status ??
    (error instanceof HttpError
      ? error.status
      : typeof error === "object" && error !== null && "status" in error &&
          typeof error.status === "number"
        ? error.status
        : 500);

  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : error && typeof error === "object" && "message" in error
          ? String((error as { message: unknown }).message)
          : "Unknown error";

  // 4xx — это ошибки ввода/авторизации, их можно показать пользователю.
  // 5xx — внутренние ошибки: детали остаются только в логах функции.
  const publicMessage =
    errorStatus >= 500 ? "Internal server error" : rawMessage.slice(0, 300);

  // Полный ответ логируем только на сервере (никогда не отправляем details).
  console.error(`💥 Function Error (${errorStatus}):`, rawMessage, error);

  return new Response(
    JSON.stringify({
      error: publicMessage,
      success: false,
      timestamp: new Date().toISOString(),
    }),
    {
      status: errorStatus,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

/** Успешный ответ с едиными CORS-заголовками. */
export function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Стандартный ответ на preflight-запрос. Все функции должны вызывать его
 * до чтения тела запроса и проверки авторизации.
 */
export function corsPreflightResponse(): Response {
  return new Response("ok", { headers: corsHeaders });
}

/**
 * Ограничение времени ожидания асинхронной операции (AI, внешние API).
 * Не отменяет сам запрос внутри SDK, но не даёт функции зависнуть.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new HttpError(message, 504)), ms);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
