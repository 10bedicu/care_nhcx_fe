import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { toast as _toast, ToasterProps } from "sonner";
import { formatDate as _formatDate } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// TODO: Share sonner toast package with core.
const defaultToastOptions = {
  position: "top-right" as ToasterProps["position"],
  richColors: true,
};

export const toast = {
  error: (message: string, options = {}) =>
    _toast.error(message, { ...defaultToastOptions, ...options }),
  warning: (message: string, options = {}) =>
    _toast.warning(message, { ...defaultToastOptions, ...options }),
  success: (message: string, options = {}) =>
    _toast.success(message, { ...defaultToastOptions, ...options }),
  info: (message: string, options = {}) =>
    _toast.info(message, { ...defaultToastOptions, ...options }),
};

export const formatCurrency = (value?: number) => {
  if (value === undefined) {
    return "NA";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(value);
};

export const formatDate = (date?: string) => {
  if (!date) {
    return "NA";
  }

  return _formatDate(date, "dd MMM yyyy");
};

export const calculateAge = (dateOfBirth?: string, yearOfBirth?: number) => {
  if (!dateOfBirth && !yearOfBirth) {
    return "NA";
  }

  const year = yearOfBirth ? yearOfBirth : new Date(dateOfBirth!).getFullYear();
  const age = new Date().getFullYear() - year;

  return `${age} Y`;
};

export const ALLOWED_UPLOAD_MIME_TYPES = [
  "application/pdf",
  "image/jpg",
  "image/jpeg",
  "image/png",
] as const;

export const ALLOWED_UPLOAD_EXTENSIONS = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
] as const;

export const ALLOWED_UPLOAD_ACCEPT = ALLOWED_UPLOAD_EXTENSIONS.join(",");

export const ALLOWED_UPLOAD_LABEL = "PDF, JPG, JPEG, or PNG";

function uploadExtensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot).toLowerCase();
}

export function isAllowedUploadFile(file: File): boolean {
  const mimeOk = (ALLOWED_UPLOAD_MIME_TYPES as readonly string[]).includes(
    file.type,
  );
  const extOk = (ALLOWED_UPLOAD_EXTENSIONS as readonly string[]).includes(
    uploadExtensionOf(file.name),
  );
  return extOk && (mimeOk || file.type === "");
}

export interface InlineAttachment {
  data: string;
  content_type: string;
  title: string;
}

export function readInlineAttachment(file: File): Promise<InlineAttachment> {
  if (!isAllowedUploadFile(file)) {
    return Promise.reject(
      new Error(
        `Unsupported file type. Allowed types: ${ALLOWED_UPLOAD_LABEL}.`,
      ),
    );
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the `data:<mime>;base64,` prefix.
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve({
        data: base64,
        content_type: file.type || "application/octet-stream",
        title: file.name,
      });
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}