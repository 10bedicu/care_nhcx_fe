import { Facility } from "./facility";

export type Provider = {
  id: string;
  participant_code: string;
  facility: Facility;

  created_date: string;
  modified_date: string;
};
