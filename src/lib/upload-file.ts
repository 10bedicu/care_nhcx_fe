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

/*
Example usage with useMutation and Promise.all:

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "@/lib/utils";
import { uploadFile } from "@/lib/upload-file";
import { CreateFileRequest, CreateFileResponse } from "@/types/file_upload";

// In your component:
const [uploadProgress, setUploadProgress] = useState<number | null>(null);
const queryClient = useQueryClient();

// Single file upload mutation
const uploadMutation = useMutation({
  mutationFn: async ({ file, body }: { file: File; body: CreateFileRequest }): Promise<CreateFileResponse> => {
    return uploadFile(
      file,
      body,
      setUploadProgress,
      () => {
        toast.error("Upload failed");
      }
    );
  },
  onSuccess: (data: CreateFileResponse) => {
    toast.success("File uploaded successfully!");
    setUploadProgress(null);
    console.log("Uploaded file data:", data);
    queryClient.invalidateQueries({ queryKey: ["files"] });
  },
  onError: (error) => {
    toast.error(`Upload failed: ${error.message}`);
    setUploadProgress(null);
  },
});

// Multiple files upload mutation
const uploadMultipleMutation = useMutation({
  mutationFn: async ({ 
    files, 
    patientId 
  }: { 
    files: File[]; 
    patientId: string 
  }): Promise<CreateFileResponse[]> => {
    const uploadPromises = files.map((file, index) => {
      const body: CreateFileRequest = {
        file_type: "patient",
        file_category: "unspecified",
        name: file.name,
        associating_id: patientId,
        original_name: file.name,
        mime_type: file.type,
      };

      // Create individual progress trackers for each file
      const setFileProgress = (progress: number | null) => {
        setUploadProgress(progress !== null ? (progress / files.length) + (index / files.length) * 100 : null);
      };

      return uploadFile(
        file,
        body,
        setFileProgress,
        () => {
          toast.error(`Upload failed for ${file.name}`);
        }
      );
    });

    // Upload all files concurrently
    return Promise.all(uploadPromises);
  },
  onSuccess: (data: CreateFileResponse[]) => {
    toast.success(`${data.length} files uploaded successfully!`);
    setUploadProgress(null);
    console.log("All uploaded files data:", data);
    queryClient.invalidateQueries({ queryKey: ["files"] });
  },
  onError: (error) => {
    toast.error(`Upload failed: ${error.message}`);
    setUploadProgress(null);
  },
});

// Usage examples:

// Single file upload
const handleSingleFileUpload = async (file: File, patientId: string) => {
  const body: CreateFileRequest = {
    file_type: "patient",
    file_category: "unspecified",
    name: file.name,
    associating_id: patientId,
    original_name: file.name,
    mime_type: file.type,
  };

  try {
    const result = await uploadMutation.mutateAsync({ file, body });
    console.log("Upload result:", result); // CreateFileResponse
  } catch (error) {
    console.error("Upload failed:", error);
  }
};

// Multiple files upload
const handleMultipleFilesUpload = async (files: File[], patientId: string) => {
  try {
    const results = await uploadMultipleMutation.mutateAsync({ files, patientId });
    console.log("All upload results:", results); // CreateFileResponse[]
  } catch (error) {
    console.error("Upload failed:", error);
  }
};

// Manual Promise.all usage (without useMutation)
const uploadFilesManually = async (files: File[], patientId: string): Promise<CreateFileResponse[]> => {
  const uploadPromises = files.map(file => {
    const body: CreateFileRequest = {
      file_type: "patient",
      file_category: "unspecified",
      name: file.name,
      associating_id: patientId,
      original_name: file.name,
      mime_type: file.type,
    };

    return uploadFile(file, body);
  });

  try {
    const results = await Promise.all(uploadPromises);
    toast.success(`${results.length} files uploaded successfully!`);
    return results;
  } catch (error) {
    toast.error("Some files failed to upload");
    throw error;
  }
};

// In your JSX:
{uploadProgress !== null && (
  <div className="w-full bg-gray-200 rounded-full h-2.5">
    <div 
      className="bg-blue-600 h-2.5 rounded-full" 
      style={{ width: `${uploadProgress}%` }}
    ></div>
    <span className="text-sm text-gray-600">{Math.round(uploadProgress)}%</span>
  </div>
)}

{uploadMutation.isPending && <div>Uploading single file...</div>}
{uploadMultipleMutation.isPending && <div>Uploading multiple files...</div>}
*/
