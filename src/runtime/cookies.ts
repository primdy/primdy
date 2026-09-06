type CookieOptions = {
  maxAge?: number;
  expires?: Date;
  domain?: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "strict" | "lax" | "none";
};

function parse(value: string | null) {
  const out = new Map<string, string>();
  if (!value) return out;
  for (const part of value.split(";")) {
    const i = part.indexOf("=");
    if (i === -1) continue;
    out.set(
      part.slice(0, i).trim(),
      decodeURIComponent(part.slice(i + 1).trim()),
    );
  }
  return out;
}

function serialize(name: string, value: string, options: CookieOptions = {}) {
  let result = `${name}=${encodeURIComponent(value)}`;
  if (options.maxAge !== undefined) result += `; Max-Age=${options.maxAge}`;
  if (options.expires) result += `; Expires=${options.expires.toUTCString()}`;
  if (options.domain) result += `; Domain=${options.domain}`;
  if (options.path) result += `; Path=${options.path}`;
  if (options.secure) result += "; Secure";
  if (options.httpOnly) result += "; HttpOnly";
  if (options.sameSite)
    result += `; SameSite=${options.sameSite[0].toUpperCase()}${options.sameSite.slice(1)}`;
  return result;
}

export function cookies(request: Request) {
  const values = parse(request.headers.get("cookie"));
  return {
    get(name: string) {
      const value = values.get(name);
      return value === undefined ? undefined : { name, value };
    },
    getAll() {
      return [...values].map(([name, value]) => ({ name, value }));
    },
  };
}

export function setCookie(
  response: Response,
  name: string,
  value: string,
  options?: CookieOptions,
) {
  response.headers.append("Set-Cookie", serialize(name, value, options));
  return response;
}

export function deleteCookie(
  response: Response,
  name: string,
  options: Omit<CookieOptions, "expires"> = {},
) {
  return setCookie(response, name, "", { ...options, maxAge: 0 });
}
