import { Coding } from "@/types/base";

export type DiagnosticReport = {
  id: string;
  status: string;
  category?: Coding;
  code?: Coding;
  conclusion?: string | null;
  encounter?: string | null;
  created_date: string;

  [key: string]: unknown;
};
