type ErrorWithMessage = {
  message: string;
};

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as Record<string, unknown>).message === "string"
  );
}

export function toErrorWithMessage(maybeError: unknown): Error {
  if (maybeError instanceof Error) {
    return maybeError;
  }

  if (isErrorWithMessage(maybeError)) {
    return new Error(maybeError.message);
  }

  if (typeof maybeError === "string") {
    return new Error(maybeError);
  }

  try {
    return new Error(JSON.stringify(maybeError));
  } catch {
    return new Error(String(maybeError));
  }
}

export function getErrorMessage(error: unknown): string {
  return toErrorWithMessage(error).message;
}
