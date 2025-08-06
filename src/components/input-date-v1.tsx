"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@littlewheel/lib/utils";
import { Button } from "@littlewheel/components/ui/button";
import { Calendar } from "@littlewheel/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@littlewheel/components/ui/popover";
import { Label } from "@littlewheel/components/ui/label";
import { inputActive } from "./input-v1";

// Optional local InputInfo replacement
const InputInfo = ({
  info,
  error,
  warn,
}: {
  info?: string;
  error?: boolean;
  warn?: boolean;
}) =>
  info ? (
    <p
      className={cn(
        "mt-1 text-sm",
        error
          ? "text-destructive"
          : warn
          ? "text-warn"
          : "text-muted-foreground"
      )}
    >
      {info}
    </p>
  ) : null;

export interface InputDatev1Props {
  rootClassName?: string;
  requiredStar?: boolean;
  requiredErrorMessage?: string;
  label: string;
  labelClassName?: string;
  className?: string;
  placeholder?: React.ReactNode;
  name?: string;
  defaultValue?: Date;
  required?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disablePastDates?: boolean;
  minDate?: Date;
  error?: boolean;
  warn?: boolean;
  info?: string;
}

const InputDatev2 = React.forwardRef<HTMLButtonElement, InputDatev1Props>(
  (props, ref) => {
    const {
      requiredStar,
      rootClassName,
      labelClassName,
      error,
      warn,
      info,
      className,
      onChange,
      defaultValue,
      disablePastDates = false,
      minDate,
      label = "Pick a date",
      placeholder = "press enter to pick a date",
      // ...rest
    } = props;

    const [date, setDate] = React.useState<Date>();
    const [btnFocused, setBtnFocused] = React.useState(false);
    const [datePickerOpen, setDatePickerOpen] = React.useState(false);
    const id = React.useId();
    const btnRef = React.useRef<HTMLButtonElement>(null);

    React.useEffect(() => {
      if (defaultValue) setDate(defaultValue);
    }, [defaultValue]);

    const getDisabledDates = React.useCallback(() => {
      return (dateToCheck: Date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkDate = new Date(dateToCheck);
        checkDate.setHours(0, 0, 0, 0);

        if (disablePastDates && checkDate < today) return true;

        if (minDate) {
          const minDateCopy = new Date(minDate);
          minDateCopy.setHours(0, 0, 0, 0);
          if (checkDate < minDateCopy) return true;
        }

        return false;
      };
    }, [disablePastDates, minDate]);

    const createSyntheticEvent = (selectedDate: Date | undefined) =>
      ({
        target: {
          name: props.name || "",
          value: selectedDate ? selectedDate.toISOString() : "",
        },
      } as React.ChangeEvent<HTMLInputElement>);

    return (
      <Popover
        modal={false}
        onOpenChange={setDatePickerOpen}
        open={datePickerOpen}
      >
        <div className={cn(rootClassName)}>
          <div className="relative">
            {/* Hidden input for form compatibility */}
            <input
              onFocus={() => setBtnFocused(true)}
              onBlur={() => setBtnFocused(false)}
              type="text"
              id={id}
              className="sr-only bottom-0 left-0"
              tabIndex={-1}
              aria-hidden="true"
              name={props.name}
              value={defaultValue?.toISOString() || date?.toISOString() || ""}
              onChange={() => {}}
              required={props.required}
              placeholder={
                typeof placeholder === "string" ? placeholder : undefined
              }
              title={label}
            />

            <PopoverTrigger asChild>
              <Button
                id={id}
                type="button"
                ref={ref ?? btnRef}
                variant="outline"
                onFocus={() => setBtnFocused(true)}
                onBlur={() => setBtnFocused(false)}
                className={cn(
                  "peer px-3 hover:bg-background w-full justify-start text-left font-normal rounded-xl h-12 sm:h-12",
                  !date && "text-muted-foreground",
                  (error || warn) && "ring-2 border-2",
                  error &&
                    "[--ring:var(--destructive)] ring-destructive border-destructive",
                  warn && "[--ring:var(--warn)] ring-warn border-warn",
                  className
                )}
              >
                {date ? format(date, "PPP") : null}
                <div
                  className={cn(
                    "text-muted-foreground",
                    (datePickerOpen || btnFocused) && !date
                      ? "opacity-100"
                      : "hidden"
                  )}
                >
                  {placeholder}
                </div>
                <CalendarIcon className="ml-auto h-4 w-4" />
              </Button>
            </PopoverTrigger>

            <Label
              htmlFor={id}
              className={cn(
                "absolute left-0 top-1/2 -translate-y-1/2 px-3 h-max transition-all ease-out duration-200 pointer-events-none",
                (date || datePickerOpen || btnFocused) && inputActive,
                error && "!text-destructive",
                warn && "!text-warn",
                labelClassName
              )}
            >
              {label}
              {requiredStar && props.required && " *"}
            </Label>
          </div>

          <InputInfo info={info} error={error} warn={warn} />
        </div>

        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(selectedDate) => {
              setDate(selectedDate);
              setDatePickerOpen(false);
              if (onChange) onChange(createSyntheticEvent(selectedDate));
            }}
            disabled={getDisabledDates()}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    );
  }
);

InputDatev2.displayName = "InputDatev2";

export default InputDatev2;
