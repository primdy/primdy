export type HTTPMethod =
  "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export type RouteContext<
  P extends Record<string, string | string[]> = Record<
    string,
    string | string[]
  >,
> = {
  params: P;
};

export type RouteHandler<
  P extends Record<string, string | string[]> = Record<
    string,
    string | string[]
  >,
> = (
  request: Request,
  context: RouteContext<P>,
) => Response | Promise<Response>;

export type RouteModule = Partial<Record<HTTPMethod, RouteHandler>>;

export type MiddlewareHandler = (
  request: Request,
  context: RouteContext,
) => Response | void | Promise<Response | void>;

export type MiddlewareModule = {
  default?: MiddlewareHandler;
  middleware?: MiddlewareHandler;
  proxy?: MiddlewareHandler;
};

export type NotFoundHandler = (
  request: Request,
  context: RouteContext,
) => Response | Promise<Response>;

export type NotFoundModule = {
  default?: NotFoundHandler;
  notFound?: NotFoundHandler;
};

export type ErrorHandler = (
  request: Request,
  error: unknown,
) => Response | Promise<Response>;

export type ErrorModule = {
  default?: ErrorHandler;
  error?: ErrorHandler;
};

export type PrimdyConfig = {
  src?: string;
  port?: number;
  hostname?: string;
  node?: boolean;
};
