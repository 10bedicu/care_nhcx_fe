export type Patient = {
  id: string;
  name: string;
  date_of_birth?: string;
  year_of_birth?: number;
  gender: string;
  extensions?: Record<string, Record<string, unknown>>;

  [key: string]: unknown;
};
