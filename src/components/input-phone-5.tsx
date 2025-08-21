/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import * as React from "react";
import { InputInfoProps } from "@littlewheel/components/ui/input";
import PhoneInput, { Country, Value } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectValue,
} from "@littlewheel/components/ui/select";
import { getCountryCallingCode } from "react-phone-number-input";
import { FlagIcon, FlagIconCode } from "react-flag-kit";
import { Trigger } from "@radix-ui/react-select";
import { cn } from "@littlewheel/lib/utils";
import InputV1 from "./input-v1";

export interface InputPhone5Props
  extends Omit<React.ComponentPropsWithoutRef<"input">, "onChange" | "value">,
    InputInfoProps {
  label: string | React.ReactNode;
  labelClassName?: string;
  requiredStar?: boolean;
  rootClassName?: string;
  value?: Value | undefined;
  onChange?: (val: Value | undefined) => void;
  defaultValue?: string;
}

const InputPhone5 = React.forwardRef<HTMLInputElement, InputPhone5Props>(
  (
    {
      defaultValue,
      className,
      rootClassName,
      onChange,
      label,
      labelClassName,
      requiredStar,
      warn,
      error,
      info,
      ...props
    },
    ref
  ) => {
    const [value, setValue] = React.useState<string>("");
    const id = React.useId();

    React.useEffect(() => {
      setValue(defaultValue ?? "");
    }, [defaultValue]);

    return (
      <div>
        <PhoneInput
          className={cn("flex-1", rootClassName)}
          defaultCountry={"NG"}
          international={false}
          withCountryCallingCode
          limitMaxLength={true}
          inputComponent={InputV1}
          numberInputProps={{ className: " rounded-l-none focus:z-10" }}
          placeholder="eg. 07092345678"
          countrySelectComponent={CountrySelect}
          label={label ?? "Enter phone number"}
          {...props}
          // ref={ref} // Uncomment this if InputV1 supports forwarding the ref
          value={props.value ?? value}
          onChange={(val) => {
            onChange?.(val);
            setValue(val ?? "");
          }}
        />
      </div>
    );
  }
);

InputPhone5.displayName = "InputPhone5";
export default InputPhone5;

type CountrySelectProps = {
  value: Country;
  onChange: (val: string) => void;
  options: { value: string; label: string; divider: boolean }[];
};

const CountrySelect = ({ value, onChange, options }: CountrySelectProps) => {
  return (
    <Select value={value} onValueChange={onChange}>
      <Trigger
        className={cn(
          "relative mr-0.5 focus:z-10 stroke-ring flex h-12 sm:h-12 w-[90px] items-center justify-between rounded-l-lg border border-r-0 border-input bg-background px-4 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
        )}
      >
        <SelectValue placeholder={<span>🏁 Intl</span>}>
          <div className="flex items-center gap-1">
            <FlagIcon
              className="rounded-full overflow-hidden w-4 h-4 shrink-0"
              code={value as FlagIconCode}
              size={16}
            />
            {value ? `+${getCountryCallingCode(value)}` : null}
          </div>
        </SelectValue>
      </Trigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Countries</SelectLabel>
          {options.map(({ value, label }) => (
            <SelectItem className="flex items-center" key={value} value={value}>
              <div className="flex items-center gap-1">
                {value ? (
                  <FlagIcon
                    className="rounded-full overflow-hidden w-5 h-5 shrink-0 mr-2"
                    code={value as FlagIconCode}
                    size={20}
                  />
                ) : (
                  <span className="mr-2">🏁</span>
                )}
                {label}
                {value ? ` +${getCountryCallingCode(value as Country)}` : null}
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};
