export type QuestionnaireResponse = {
  id: string;
  status: string;
  subject_id: string;
  encounter: string | null;
  questionnaire: {
    id: string;
    slug: string | null;
    title: string;
    subject_type: "patient" | "encounter";
  } | null;

  [key: string]: unknown;
};
