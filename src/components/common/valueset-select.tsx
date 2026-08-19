import Autocomplete from "../ui/autocomplete";
import { Coding } from "@/types/base";
import { apis } from "@/apis";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

type ValuesetSelectProps = {
  system: string;
  value: Coding | undefined;
  onSelect: (code: Coding) => void;
  count?: number;
  disabled?: boolean;
};

export default function ValuesetSelect({
  system,
  value,
  onSelect,
  count = 10,
  disabled,
}: ValuesetSelectProps) {
  const [search, setSearch] = useState("");

  const { data: valueset, isFetching } = useQuery({
    queryKey: ["valueset", system, "expand", count, search],
    queryFn: () => apis.valueset.expand(system, { count, search }),
  });

  const options =
    [
      value,
      ...(valueset?.results.filter((code) => {
        return value?.code !== code.code;
      }) ?? []),
    ]
      .filter(Boolean)
      .map((code) => ({
        label: code!.display || code!.code,
        value: code!.code,
      })) ?? [];

  return (
    <Autocomplete
      options={options}
      value={value?.code}
      onChange={(value) => {
        const code = valueset?.results.find((code) => code.code === value);
        if (code) {
          onSelect(code);
        }
      }}
      onSearch={setSearch}
      disabled={disabled}
      isLoading={isFetching}
    />
  );
}
