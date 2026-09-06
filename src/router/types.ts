export type Segment =
  | { type: "static"; value: string }
  | { type: "dynamic"; name: string }
  | { type: "catchAll"; name: string }
  | { type: "optionalCatchAll"; name: string };

export type Route = {
  id: string;
  file: string;
  pathname: string;
  segments: Segment[];
  methods: string[];
};

export type Match = {
  route: Route;
  params: Record<string, string | string[]>;
};
