type RouteParamValue =
  | string
  | number
  | readonly (string | number)[];

export type RouteParams = Record<string, RouteParamValue | undefined>;

type BaseRoute = {
  path: string;
  label: string;
  disabled?: boolean;
  hiddenBreadcrumb?: boolean;
  /**
   * Keeps the breadcrumb segment visible as plain text instead of a link,
   * without hiding it from the trail the way `hiddenBreadcrumb` does.
   */
  disableBreadcrumbLink?: boolean;
  permission?: string | readonly string[];
  permissionMode?: "all" | "any";
};

export type RouteConfig = BaseRoute & {
  name?: string;
  children?: Record<string, RouteConfig>;
};

export type Route = BaseRoute & {
  name: string;
  parent?: string;
};

const PARAMETER_PATTERN = /([:*])([A-Za-z_$][A-Za-z0-9_$]*)/g;

function normalizePath(path: string) {
  if (!path.startsWith("/")) {
    throw new Error(`Route path must start with "/": ${path}`);
  }

  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createPathMatcher(path: string) {
  const normalizedPath = normalizePath(path);
  let source = "";
  let cursor = 0;

  for (const token of normalizedPath.matchAll(PARAMETER_PATTERN)) {
    const index = token.index;
    const marker = token[1];

    source += escapeRegExp(normalizedPath.slice(cursor, index));
    source += marker === "*" ? "(.+)" : "([^/]+)";
    cursor = index + token[0].length;
  }

  source += escapeRegExp(normalizedPath.slice(cursor));

  return new RegExp(
    `^${source}${normalizedPath === "/" ? "" : "/?"}$`,
    "i",
  );
}

function isParamList(
  value: RouteParamValue,
): value is readonly (string | number)[] {
  return Array.isArray(value);
}

function compilePath(path: string, params: RouteParams) {
  return normalizePath(path).replace(
    PARAMETER_PATTERN,
    (_, marker: string, name: string) => {
      const value = params[name];

      if (value === undefined) {
        throw new TypeError(`Missing route parameter: ${name}`);
      }

      if (marker === "*") {
        if (!isParamList(value) || value.length === 0) {
          throw new TypeError(
            `Wildcard route parameter "${name}" must be a non-empty array`,
          );
        }

        return value.map((part) => encodeURIComponent(String(part))).join("/");
      }

      if (isParamList(value)) {
        throw new TypeError(`Route parameter "${name}" must be a single value`);
      }

      return encodeURIComponent(String(value));
    },
  );
}

function routeSpecificity(path: string) {
  const segments = path.split("/").filter(Boolean);
  const parameters = path.match(PARAMETER_PATTERN) ?? [];
  const wildcards = parameters.filter((parameter) => parameter.startsWith("*"));

  return (
    segments.length * 100 +
    path.length -
    parameters.length * 10 -
    wildcards.length * 20
  );
}

export function ROUTER(
  routeConfig: Record<string, RouteConfig>,
): Record<string, Route> {
  const routes: Record<string, Route> = {};

  function traverse(
    definitions: Record<string, RouteConfig>,
    parentKey?: string,
  ) {
    for (const [key, definition] of Object.entries(definitions)) {
      const fullKey = parentKey ? `${parentKey}.${key}` : key;
      const { children, name = fullKey, ...route } = definition;

      routes[fullKey] = {
        ...route,
        path: normalizePath(route.path),
        label: route.label || name,
        name,
        parent: parentKey,
      };

      if (children) {
        traverse(children, fullKey);
      }
    }
  }

  traverse(routeConfig);

  return routes;
}

export function buildRouteUtility(routes: Record<string, Route>) {
  const matchers = Object.values(routes)
    .map((route) => ({ route, matcher: createPathMatcher(route.path) }))
    .sort((a, b) => {
      const specificity =
        routeSpecificity(b.route.path) - routeSpecificity(a.route.path);

      if (specificity !== 0) {
        return specificity;
      }

      // When two routes share the exact same path (e.g. a parent whose path
      // mirrors its default child), prefer the more deeply nested route so
      // the child - not the parent - is treated as the active match.
      const depth = (name: string) => name.split(".").length;
      return depth(b.route.name) - depth(a.route.name);
    });

  function getRoute(routeName: string) {
    const route =
      routes[routeName] ??
      Object.values(routes).find((candidate) => candidate.name === routeName);

    if (!route) {
      throw new Error(`Route not found: ${routeName}`);
    }

    return route;
  }

  function getPath(routeName: string, params: RouteParams = {}) {
    return compilePath(getRoute(routeName).path, params);
  }

  function findActiveRoute(pathname: string) {
    const path = pathname.split(/[?#]/, 1)[0] || "/";
    return matchers.find(({ matcher }) => matcher.test(path))?.route ?? null;
  }

  function findRouteTrail(pathname: string) {
    const route = findActiveRoute(pathname);

    if (!route) {
      return null;
    }

    const trail = [route];
    let parentKey = route.parent;

    while (parentKey) {
      const parentRoute = routes[parentKey];

      if (!parentRoute) {
        break;
      }

      trail.unshift(parentRoute);
      parentKey = parentRoute.parent;
    }

    return trail;
  }

  return { getRoute, getPath, findRouteTrail, findActiveRoute };
}
