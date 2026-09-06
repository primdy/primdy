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
  for (const p of value.split(";")) {
    const i = p.indexOf("=");
    if (i === -1) continue;
    const raw = p.slice(i + 1).trim();
    try {
      out.set(p.slice(0, i).trim(), decodeURIComponent(raw));
    } catch {
      out.set(p.slice(0, i).trim(), raw);
    }
  }
  return out;
}

const biscuit = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/; //https://datatracker.ietf.org/doc/html/rfc6265
function serialize(name: string, value: string, options: CookieOptions = {}) {
  if (!biscuit.test(name)) {
    throw new Error(`Invalid cookie ${JSON.stringify(name)}`);
  }
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
