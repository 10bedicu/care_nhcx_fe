import { ClaimResponseItem } from "@medplum/fhirtypes";

import { ClaimResponse } from "@/types/claim";

export type ParsedItemAdjudication = {
  sequence: number | undefined;
  submitted: number | null;
  eligible: number | null;
  eligPercent: number | null;
  eligQuantity: number | null;
  notes: string | null;
  itemStatus: string | null;
};

export function parseItemAdjudication(
  item: ClaimResponseItem,
): ParsedItemAdjudication {
  const adj = item.adjudication ?? [];
  const find = (code: string) =>
    adj.find((a) => a.category?.coding?.[0]?.code === code);
  return {
    sequence: item.itemSequence,
    submitted: find("submitted")?.amount?.value ?? null,
    eligible: find("eligible")?.amount?.value ?? null,
    eligPercent: find("eligpercent")?.value ?? null,
    eligQuantity: find("eligquant")?.value ?? null,
    notes: find("reason")?.reason?.coding?.[0]?.display ?? null,
    itemStatus: find("status")?.reason?.coding?.[0]?.code ?? null,
  };
}

export function parseQueryNotes(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((event) => {
      const parts = event.split("~");
      const date = parts[1]?.trim() ?? "";
      const text = parts[3]?.trim() ?? event;
      return date ? `${date}: ${text}` : text;
    });
}

export function isClaimResponseQueried(
  response: ClaimResponse | undefined,
): boolean {
  if (!response) return false;

  const statusEntry = response.adjudication?.find(
    (a) => a.category?.coding?.[0]?.code === "status",
  );
  const adjCode = statusEntry?.reason?.coding?.[0]?.code?.toLowerCase();
  if (adjCode === "queried") return true;

  return (
    response.item?.some((item) => {
      const parsed = parseItemAdjudication(item);
      return parsed.itemStatus?.toLowerCase() === "queried";
    }) ?? false
  );
}

export function getItemResponseAdjudication(
  response: ClaimResponse | undefined,
  itemSequence: number,
): ParsedItemAdjudication | null {
  const respItem = response?.item?.find(
    (item) => item.itemSequence === itemSequence,
  );
  if (!respItem) return null;
  return parseItemAdjudication(respItem);
}

export function isItemQueried(
  adjudication: ParsedItemAdjudication | null,
): boolean {
  return adjudication?.itemStatus?.toLowerCase() === "queried";
}

export function formatItemQueryReasons(
  adjudication: ParsedItemAdjudication | null,
): string[] {
  if (!adjudication?.notes) return [];
  const notes = parseQueryNotes(adjudication.notes);
  if (notes.length > 0) return notes;
  const trimmed = adjudication.notes.trim();
  return trimmed ? [trimmed] : [];
}

export function itemStatusBadgeClass(itemStatus: string | null): string {
  const code = itemStatus?.toLowerCase();
  if (code === "approved")
    return "bg-green-100 text-green-700 border border-green-200";
  if (code === "queried")
    return "bg-amber-100 text-amber-700 border border-amber-200";
  if (code === "rejected")
    return "bg-red-100 text-red-700 border border-red-200";
  return "bg-gray-100 text-gray-600 border border-gray-200";
}
