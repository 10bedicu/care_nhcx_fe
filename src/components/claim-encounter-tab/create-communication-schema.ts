import { z } from "zod";

const communicationPayloadSchema = z
  .object({
    content_string: z.string().optional(),
    content_attachment: z.string().uuid().optional(),
    content_file: z.instanceof(File).optional(),
  })
  .refine(
    (data) => {
      return (
        (data.content_string &&
          !data.content_attachment &&
          !data.content_file) ||
        (!data.content_string &&
          data.content_attachment &&
          !data.content_file) ||
        (!data.content_string && !data.content_attachment && data.content_file)
      );
    },
    {
      message:
        "Only one of content_string, content_attachment, or content_file can be filled",
    }
  );

export const createCommunicationFormSchema = z.object({
  based_on: z.string().uuid(),
  payload: z.array(communicationPayloadSchema),
});
