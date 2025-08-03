import { CreateFileRequest, CreateFileResponse } from "@/types/file_upload";
import { Dispatch, SetStateAction } from "react";

import { apis } from "@/apis";
import { default as uploadFileToS3 } from "@/apis/upload-file";

export const uploadFile = async (
  file: File,
  body: CreateFileRequest,
  setProgress?: Dispatch<SetStateAction<number>> | null,
  onError?: () => void
): Promise<CreateFileResponse> => {
  try {
    const data = await apis.file.createUpload(body);

    if (!data) {
      throw new Error("Failed to create upload");
    }

    const newFile = new File([file], data.internal_name);

    await uploadFileToS3(
      data.signed_url,
      newFile,
      "PUT",
      { "Content-Type": file.type },
      async (xhr: XMLHttpRequest) => {
        if (xhr.status >= 200 && xhr.status < 300) {
          await apis.file.markUploadCompleted(data.id);
        } else {
          throw new Error(`Upload failed with status: ${xhr.status}`);
        }
      },
      setProgress,
      onError
    );

    return data;
  } catch (error) {
    onError?.();
    throw error;
  }
};
