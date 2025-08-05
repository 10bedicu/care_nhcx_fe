export type Participant = {
  participant_id: number;
  participant_code: string;
  participant_name: string;
  address?: string;
  primary_email: string;
  additional_email?: string;
  phone: number;
  primary_mobile: number;
  additional_mobile?: number;
  status: string;
  signing_cert_path?: string;
  encryption_cert: string;
  endpoint_url: string;
  registry_id: string;
  state: string;
  district?: string;
  authentication_applicable: "Y" | "N";
};
