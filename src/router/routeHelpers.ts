export function createSingleFlight<T>(operation: () => Promise<T>) {
  let pending: Promise<T> | null = null;

  return function run(): Promise<T> {
    if (pending) return pending;

    let operationPromise: Promise<T>;

    try {
      operationPromise = operation();
    } catch (error) {
      operationPromise = Promise.reject(error);
    }

    const trackedPromise = operationPromise.finally(() => {
      if (pending === trackedPromise) pending = null;
    });

    pending = trackedPromise;
    return trackedPromise;
  };
}

export function resolveRouteComponent<T>(
  component: string,
  modules: Record<string, T>
): T {
  const normalized = normalizeComponentPath(component);
  const candidates = [
    `/src/views/${normalized}.vue`,
    `/src/views/${normalized}.tsx`
  ].filter(path => Object.hasOwn(modules, path));

  if (candidates.length === 0) {
    throw new Error(`Route component not found: ${component}`);
  }

  if (candidates.length > 1) {
    throw new Error(`Route component is ambiguous: ${component}`);
  }

  return modules[candidates[0]];
}

function normalizeComponentPath(component: string): string {
  const normalized = component
    .trim()
    .replace(/^\/+/, "")
    .replace(/^src\/views\//, "")
    .replace(/\.(vue|tsx)$/, "");

  const segments = normalized.split("/");
  const invalid =
    !normalized ||
    component.includes("\\") ||
    component.includes("://") ||
    segments.some(segment => !segment || segment === "." || segment === "..") ||
    !/^[A-Za-z0-9_/-]+$/.test(normalized);

  if (invalid) {
    throw new Error(`Invalid route component: ${component}`);
  }

  return normalized;
}
