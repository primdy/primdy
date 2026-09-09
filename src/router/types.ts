export type Segment =
  | { type: "static"; value: string }
  | { type: "dynamic"; name: string }
  | { type: "catchAll"; name: string }
  | { type: "optionalCatchAll"; name: string };

export type Route = {
  id: string;
  file: string;
  dir: string;
  pathname: string;
  segments: Segment[];
  methods: string[];
};

export type Middleware = {
  file: string;
  dir: string;
};

/**
 * A file that's associated with a directory rather than an exact route,
 * such as `middleware.ts`, `not-found.ts`, or `error.ts`.
 */
export type Boundary = Middleware;

export type Match = {
  route: Route;
  params: Record<string, string | string[]>;
};
