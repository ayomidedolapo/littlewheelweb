"use client";

import { cn } from "@littlewheel/lib/utils";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type GoBackProps = {
  link?: string;
  className?: string;
  onClick?: () => void;
  label?: string;
  showIcon?: boolean;
};

const GoBack = ({
  className,
  link,
  onClick,
  label = "Go back",
  showIcon,
}: GoBackProps) => {
  const router = useRouter();

  const content = (
    <>
      {showIcon && <ChevronLeft color="#121528" />}
      {label}
    </>
  );

  if (link) {
    return (
      <Link
        href={link}
        className={cn(
          "flex gap-2 items-center font-semibold text-[#121528] w-max",
          className
        )}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      onClick={() => {
        if (onClick) {
          onClick();
        } else {
          router.back();
        }
      }}
      className={cn(
        "flex gap-2 items-center font-semibold text-[#121528] cursor-pointer w-max",
        className
      )}
    >
      {content}
    </button>
  );
};

export default GoBack;
