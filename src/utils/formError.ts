type ApiErrorResponse = {
  response?: {
    status?: number;
    data?: {
      errors?: {
        message?: unknown;
        details?: unknown;
      };
    };
  };
};

export type ApiErrorInfo = {
  status?: number;
  message: string;
  fieldErrors: Record<string, string>;
};

function detailMessage(value: unknown): string {
  if (typeof value === "string") return value;

  if (Array.isArray(value)) {
    return value.filter(item => typeof item === "string").join("，");
  }

  return "";
}

/** 解析后端统一错误响应，并保留 changeset 返回的字段级错误。 */
export function parseApiError(
  error: unknown,
  fallbackMessage: string
): ApiErrorInfo {
  const response = (error as ApiErrorResponse)?.response;
  const payload = response?.data?.errors;
  const fieldErrors: Record<string, string> = {};

  if (
    payload?.details &&
    typeof payload.details === "object" &&
    !Array.isArray(payload.details)
  ) {
    Object.entries(payload.details).forEach(([field, value]) => {
      const errorMessage = detailMessage(value);
      if (errorMessage) fieldErrors[field] = errorMessage;
    });
  }

  return {
    status: response?.status,
    message:
      typeof payload?.message === "string" && payload.message
        ? payload.message
        : fallbackMessage,
    fieldErrors
  };
}

/** 将 API 字段名映射到当前表单字段，返回是否写入了至少一个错误。 */
export function applyApiFieldErrors<T extends string>(
  target: Record<T, string>,
  source: Record<string, string>,
  fieldMap: Record<string, T>
): boolean {
  let applied = false;

  Object.entries(source).forEach(([apiField, errorMessage]) => {
    const formField = fieldMap[apiField];
    if (!formField) return;

    target[formField] = errorMessage;
    applied = true;
  });

  return applied;
}

export function isServerError(status?: number): boolean {
  return typeof status === "number" && status >= 500 && status < 600;
}
