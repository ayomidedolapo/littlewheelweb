"use client";

import React, { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { buttonVariants } from "@littlewheel/components/ui/button";
import { cn } from "@littlewheel/lib/utils";
import { Input } from "./ui/input";

type Props = {
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClickSearch?: (value: string) => void;
  placeholder?: string;
  className?: string;
  searchClassName?: string;
};

const InputSearch = ({
  value,
  placeholder = "Search...",
  onChange,
  defaultValue,
  className,
  onClickSearch,
  searchClassName,
}: Props) => {
  const [search, setSearch] = useState<string>();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    if (onChange) onChange(e); // ✅ ESLint-safe
  };

  useEffect(() => {
    setSearch(defaultValue);
  }, [defaultValue]);

  return (
    <div
      className={cn("h-max relative max-w-[300px] min-w-[250px]", className)}
    >
      <Input
        placeholder={placeholder}
        className={cn(
          "px-4 pr-[calc(2rem)] w-full rounded-full h-11 sm:h-12",
          searchClassName
        )}
        type="text"
        value={value ?? search}
        onChange={handleChange}
      />

      {search ? (
        <button
          className="cursor-pointer absolute inset-y-0 right-12"
          onClick={() =>
            handleChange({
              target: { value: "" },
            } as React.ChangeEvent<HTMLInputElement>)
          }
          aria-label="Clear search"
          title="Clear search"
        >
          <X size={16} />
        </button>
      ) : null}

      <div
        onClick={() => onClickSearch?.(search ?? "")}
        className={cn(
          buttonVariants({ size: "icon" }), // ✅ Valid `size`
          "text-muted-foreground h-10 w-10 my-auto rounded-full absolute right-1 inset-y-0 px-3"
        )}
      >
        <Search className="text-white" size={16} />
      </div>
    </div>
  );
};

export default InputSearch;
