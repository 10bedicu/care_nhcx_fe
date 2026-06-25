import { ReactNode, useState } from "react";

import Autocomplete from "@/components/ui/autocomplete";
import { Button } from "@/components/ui/button";
import {
  STRUCTURED_RESOURCE_TYPES,
  getStructuredResourceTypeDef,
  StructuredResourceTypeDef,
} from "./structured-resources";
import { UseFormReturn } from "react-hook-form";
import { cn } from "@/lib/utils";
import { createClaimFormSchema } from "./schema";
import { useGlobalStore } from "@/hooks/use-global-store";
import { z } from "zod";

const USER_EDIT = { shouldDirty: true, shouldValidate: true } as const;

type ClaimForm = UseFormReturn<z.infer<typeof createClaimFormSchema>>;

export type SupportingInfoValueMode = "text" | "attachment" | "record";

type SupportingInfoEntry = z.infer<
  typeof createClaimFormSchema
>["supporting_info"][number];

export function deriveSupportingInfoMode(
  info: SupportingInfoEntry | undefined,
): SupportingInfoValueMode {
  if (info?.value_resource) return "record";
  if (info?.value_attachment || info?.value_file) return "attachment";
  return "text";
}

const MODE_LABELS: Record<SupportingInfoValueMode, string> = {
  text: "Text",
  attachment: "Attachment",
  record: "Record",
};

function clearAllValues(form: ClaimForm, mainInfoIndex: number) {
  form.setValue(
    `supporting_info.${mainInfoIndex}.value_string`,
    undefined,
    USER_EDIT,
  );
  form.setValue(
    `supporting_info.${mainInfoIndex}.value_attachment`,
    undefined,
    USER_EDIT,
  );
  form.setValue(
    `supporting_info.${mainInfoIndex}.value_file`,
    undefined,
    USER_EDIT,
  );
  form.setValue(
    `supporting_info.${mainInfoIndex}.value_resource`,
    undefined,
    USER_EDIT,
  );
}

function ResourceInstanceSelect({
  typeDef,
  patientId,
  encounterId,
  value,
  onChange,
}: {
  typeDef: StructuredResourceTypeDef;
  patientId: string;
  encounterId?: string;
  value?: string;
  onChange: (resourceId: string) => void;
}) {
  const { options, isLoading } = typeDef.useOptions(patientId, encounterId);
  return (
    <Autocomplete
      options={options}
      value={value}
      onChange={onChange}
      isLoading={isLoading}
      placeholder={`Select ${typeDef.label.toLowerCase()}…`}
      noOptionsMessage={`No ${typeDef.label.toLowerCase()} found`}
    />
  );
}

function StructuredResourcePicker({
  form,
  mainInfoIndex,
}: {
  form: ClaimForm;
  mainInfoIndex: number;
}) {
  const { getStore } = useGlobalStore();
  const patientId = getStore<string>("patientId") ?? "";
  const encounterId = getStore<string>("encounterId") ?? undefined;

  const valueResource = form.watch(
    `supporting_info.${mainInfoIndex}.value_resource`,
  );
  const [selectedType, setSelectedType] = useState<string | undefined>(
    valueResource?.resource_type,
  );
  const selectedDef = getStructuredResourceTypeDef(selectedType);

  const handleSelectInstance = (resourceId: string) => {
    if (!selectedType) return;
    clearAllValues(form, mainInfoIndex);
    form.setValue(
      `supporting_info.${mainInfoIndex}.value_resource`,
      { resource_type: selectedType, resource_id: resourceId },
      USER_EDIT,
    );
  };

  return (
    <div className="space-y-2">
      <Autocomplete
        options={STRUCTURED_RESOURCE_TYPES.map((def) => ({
          label: def.label,
          value: def.type,
        }))}
        value={selectedType}
        onChange={(type) => {
          setSelectedType(type);
          form.setValue(
            `supporting_info.${mainInfoIndex}.value_resource`,
            undefined,
            USER_EDIT,
          );
        }}
        placeholder="Select record type…"
      />
      {selectedDef && (
        <ResourceInstanceSelect
          key={selectedDef.type}
          typeDef={selectedDef}
          patientId={patientId}
          encounterId={encounterId}
          value={valueResource?.resource_id}
          onChange={handleSelectInstance}
        />
      )}
    </div>
  );
}

/**
 * Mode toggle + value inputs for a single supporting-info entry. The text and
 * attachment inputs are supplied by the caller (they differ between the
 * plan-level and item-level cards); the structured-resource picker is shared.
 */
export function SupportingInfoValueControls({
  form,
  mainInfoIndex,
  renderText,
  renderAttachment,
}: {
  form: ClaimForm;
  mainInfoIndex: number;
  renderText: () => ReactNode;
  renderAttachment: () => ReactNode;
}) {
  const info = form.watch(`supporting_info.${mainInfoIndex}`);
  const [mode, setMode] = useState<SupportingInfoValueMode>(() =>
    deriveSupportingInfoMode(info),
  );

  const switchMode = (next: SupportingInfoValueMode) => {
    if (next === mode) return;
    clearAllValues(form, mainInfoIndex);
    setMode(next);
  };

  return (
    <div className="space-y-2">
      <div className="inline-flex rounded-md border p-0.5 gap-0.5">
        {(Object.keys(MODE_LABELS) as SupportingInfoValueMode[]).map((value) => (
          <Button
            key={value}
            type="button"
            variant={mode === value ? "default" : "ghost"}
            size="sm"
            className={cn("h-7 px-3 text-xs")}
            onClick={() => switchMode(value)}
          >
            {MODE_LABELS[value]}
          </Button>
        ))}
      </div>

      {mode === "text" && renderText()}
      {mode === "attachment" && renderAttachment()}
      {mode === "record" && (
        <StructuredResourcePicker form={form} mainInfoIndex={mainInfoIndex} />
      )}
    </div>
  );
}
