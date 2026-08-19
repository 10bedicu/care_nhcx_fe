import * as React from "react";

import { CheckIcon, ChevronsUpDownIcon, Loader2Icon } from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import useBreakpoints from "@/hooks/use-breakpoints";

interface AutoCompleteOption {
  label: string;
  display?: React.ReactNode;
  value: string;
  disabled?: boolean;
  disabledReason?: React.ReactNode;
}

interface AutocompleteProps {
  options: AutoCompleteOption[];
  value?: string;
  onChange: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  noOptionsMessage?: string;
  disabled?: boolean;
  isLoading?: boolean;
  align?: "start" | "center" | "end";
  popoverClassName?: string;
  /**
   * Optional container to portal the popover into. Pass the surrounding
   * dialog/sheet element when rendering inside a modal so the popover is not
   * blocked by the modal's focus trap / pointer-events guard.
   */
  container?: HTMLElement | null;
  "data-cy"?: string;
}

export default function Autocomplete({
  options,
  value,
  onChange,
  onSearch,
  placeholder = "Select...",
  noOptionsMessage = "No options found",
  disabled,
  isLoading = false,
  align = "center",
  popoverClassName,
  container,
  "data-cy": dataCy,
}: AutocompleteProps) {
  const [open, setOpen] = React.useState(false);

  const isMobile = useBreakpoints({ default: true, sm: false });

  const commandContent = (
    <>
      <CommandInput
        placeholder="Search option..."
        disabled={disabled}
        onValueChange={onSearch}
        className="outline-hidden border-none ring-0 shadow-none"
      />
      <CommandList>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2Icon className="h-4 w-4 animate-spin" />
            Searching…
          </div>
        ) : null}
        <CommandEmpty>
          {isLoading ? "Searching…" : noOptionsMessage}
        </CommandEmpty>
        <CommandGroup>
          <TooltipProvider delayDuration={150}>
            {options.map((option) => {
              const item = (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  keywords={[option.label]}
                  aria-disabled={option.disabled}
                  className={cn(
                    option.disabled && "cursor-not-allowed opacity-50",
                  )}
                  onSelect={() => {
                    if (option.disabled) {
                      return;
                    }
                    onChange(option.value === value ? "" : option.value);
                    setOpen(false);
                  }}
                >
                  <CheckIcon
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {option.display ?? option.label}
                </CommandItem>
              );

              if (option.disabled && option.disabledReason) {
                return (
                  <Tooltip key={option.value}>
                    <TooltipTrigger asChild>{item}</TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs">
                      {option.disabledReason}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return item;
            })}
          </TooltipProvider>
        </CommandGroup>
      </CommandList>
    </>
  );

  if (isMobile) {
    return (
      <>
        <Button
          title={
            value
              ? options.find((option) => option.value === value)?.label
              : undefined
          }
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
          data-cy={dataCy}
          type="button"
          onClick={() => setOpen(true)}
        >
          <span
            className={cn(
              "max-sm:max-w-48 truncate",
              !value && "text-gray-500"
            )}
          >
            {value
              ? options.find((option) => option.value === value)?.label
              : placeholder}
          </span>
          {isLoading ? (
            <Loader2Icon className="ml-2 size-4 shrink-0 animate-spin opacity-70" />
          ) : (
            <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
          )}
        </Button>
        <CommandDialog open={open} onOpenChange={setOpen}>
          {commandContent}
        </CommandDialog>
      </>
    );
  }

  const selectedOption = options.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild className={popoverClassName}>
        <Button
          title={selectedOption?.label}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
          data-cy={dataCy}
          onClick={() => setOpen(!open)}
        >
          <span className={cn("truncate", !selectedOption && "text-gray-500")}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {isLoading ? (
            <Loader2Icon className="ml-2 size-4 shrink-0 animate-spin opacity-70" />
          ) : (
            <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 pointer-events-auto w-[var(--radix-popover-trigger-width)]"
        align={align}
        container={container}
      >
        <Command>{commandContent}</Command>
      </PopoverContent>
    </Popover>
  );
}
