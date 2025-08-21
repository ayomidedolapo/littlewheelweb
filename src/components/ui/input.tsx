import * as React from "react";

import { cn } from "@littlewheel/lib/utils";
import { CircleHelpIcon, Info, TriangleAlert } from "lucide-react";

// Removed InputProps interface as it was redundant

export interface InputInfoProps {
  error?: React.ReactNode;
  warn?: React.ReactNode;
  info?: React.ReactNode;
  className?: string;
}

export const inputErrorClassName = " text-destructive";
export const inputWarnClassName = " text-yellow-500";

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-12 sm:h-12 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };

export const InputInfo = ({ error, warn, info, className }: InputInfoProps) => {
  const containerClassName =
    " mt-2 flex gap-1 items-center text-sm font-medium";
  return (
    <>
      {error ? (
        <div
          className={cn(
            " p-3 px-5 rounded-lg bg-destructive/15",
            containerClassName,
            inputErrorClassName,
            className
          )}
        >
          <CircleHelpIcon className="shrink-0 text-destructive" />
          <span className="mb-[1px] text-muted-foreground ml-2">{error}</span>
        </div>
      ) : null}
      {warn ? (
        <div className={cn(containerClassName, inputWarnClassName, className)}>
          <TriangleAlert className="shrink-0" size={16} />
          <span className="mb-[1px] ">{warn}</span>
        </div>
      ) : null}
      {info ? (
        <div className={cn(containerClassName, className)}>
          <Info className="shrink-0" size={16} />
          <span className="mb-[1px]">{info}</span>
        </div>
      ) : null}
    </>
  );
};
