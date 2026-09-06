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

export type YlodeConfig = {
  appDir?: string;
  port?: number;
  hostname?: string;
};
