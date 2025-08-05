import { Card, CardContent, CardFooter } from "../ui/card";
import {
  CornerUpRightIcon,
  FileText,
  MessageSquareReplyIcon,
  PaperclipIcon,
  Send,
  TextIcon,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FC, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { CommunicationRequest } from "@/types/communication";
import { Encounter } from "@/types/encounter";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { apis } from "@/apis";
import { createCommunicationFormSchema } from "./create-communication-schema";
import { toast } from "@/lib/utils";
import { uploadFile } from "@/lib/upload-file";
import { useGlobalStore } from "@/hooks/use-global-store";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

interface CommunicationReplyModalProps {
  communicationRequest: CommunicationRequest;
}

const CommunicationReplyModal: FC<CommunicationReplyModalProps> = ({
  communicationRequest,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { getStore } = useGlobalStore();

  const form = useForm<z.infer<typeof createCommunicationFormSchema>>({
    resolver: zodResolver(createCommunicationFormSchema),
    defaultValues: {
      based_on: communicationRequest.id,
      payload: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "payload",
  });

  const { mutate: sendCommunication } = useMutation({
    mutationFn: apis.communication.send,
    onSuccess: () => {
      form.reset();
      toast.success("Communication sent successfully");
      setIsOpen(false);
    },
  });

  const { mutate: createCommunication } = useMutation({
    mutationFn: apis.communication.create,
    onSuccess: (data) => {
      toast.success("Communication created successfully");
      sendCommunication(data.id);
      queryClient.invalidateQueries({
        queryKey: ["tasks", communicationRequest.about],
      });
    },
  });

  const onSubmit = async (
    data: z.infer<typeof createCommunicationFormSchema>
  ) => {
    try {
      const updatedValues = { ...data };

      if (updatedValues.payload?.length) {
        for (let i = 0; i < updatedValues.payload.length; i++) {
          const message = updatedValues.payload[i];

          if (message.content_file && !message.content_attachment) {
            try {
              const fileUploadRequest = {
                file_type: "encounter" as const,
                file_category: "unspecified" as const,
                name: message.content_file.name,
                associating_id: getStore<Encounter>("encounter")?.id,
                original_name: message.content_file.name,
                mime_type: message.content_file.type,
              };

              const uploadResponse = await uploadFile(
                message.content_file,
                fileUploadRequest
              );

              updatedValues.payload[i].content_attachment = uploadResponse.id;

              delete updatedValues.payload[i].content_file;
            } catch (error) {
              console.error("Error uploading file:", error);
              throw new Error(
                `Failed to upload file: ${message.content_file?.name}`
              );
            }
          }
        }
      }

      createCommunication(updatedValues);
      setIsOpen(false);
    } catch (error) {
      console.error("Error in onSubmit:", error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (file) {
      append({
        content_string: undefined,
        content_file: file,
        content_attachment: undefined,
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const currentMessage = (e.target as HTMLTextAreaElement).value.trim();

      if (currentMessage) {
        append({
          content_string: currentMessage,
          content_file: undefined,
          content_attachment: undefined,
        });

        (e.target as HTMLTextAreaElement).value = "";
      }
    }
  };

  const removeMessage = (index: number) => {
    remove(index);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CornerUpRightIcon className="w-5 h-5" />
          Reply
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Reply to Communication Request
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="h-[400px] flex flex-col">
            <CardContent className="p-4 flex-1 overflow-y-auto">
              <div className="flex flex-col gap-4">
                {fields.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <MessageSquareReplyIcon className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
                    <p>No messages yet. Start typing to add your reply.</p>
                  </div>
                ) : (
                  fields.map((field, index) => {
                    const message = form.watch(
                      `payload.${index}.content_string`
                    );
                    const file = form.watch(`payload.${index}.content_file`);

                    return (
                      <div key={field.id} className="flex justify-end">
                        {message && (
                          <div className="px-4 pb-2">
                            <div className="p-2 bg-secondary border border-secondary-foreground/20 rounded-lg">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <div>
                                    <TextIcon className="w-4 h-4 text-primary" />
                                  </div>
                                  <span className="text-sm text-foreground">
                                    {message}
                                  </span>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeMessage(index)}
                                  className="text-destructive hover:text-destructive h-6 w-6 p-0"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                        {file && (
                          <div className="px-4 pb-2">
                            <div className="p-2 bg-secondary border border-secondary-foreground/20 rounded-lg">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <div>
                                    <FileText className="w-4 h-4 text-primary" />
                                  </div>
                                  <span className="text-sm text-foreground">
                                    {file.name}
                                  </span>
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {(file.size / 1024).toFixed(1)} KB
                                  </Badge>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeMessage(index)}
                                  className="text-destructive hover:text-destructive h-6 w-6 p-0"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>

            <CardFooter>
              <form className="relative w-full flex items-center gap-2">
                <Input
                  id="message"
                  placeholder="Type your message..."
                  className="flex-1 pr-20"
                  autoComplete="off"
                  onKeyPress={handleKeyPress}
                />
                <div className="flex items-center space-x-1">
                  <div className="relative">
                    <Label className="transition-all duration-200 ease-in-out">
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="cursor-pointer"
                      >
                        <PaperclipIcon className="h-5 w-5" />
                        <input
                          type="file"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={handleFileSelect}
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                        />
                      </Button>
                    </Label>
                  </div>
                </div>
              </form>
            </CardFooter>
          </Card>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="submit"
              className="flex items-center space-x-2"
              disabled={fields.length === 0}
            >
              <Send className="w-4 h-4" />
              <span>Send Reply</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CommunicationReplyModal;
