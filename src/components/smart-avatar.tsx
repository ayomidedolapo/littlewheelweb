import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@littlewheel/components/ui/avatar";
import { getFallbackBgClassFromKey } from "@littlewheel/lib/getFallbackBgClassFromKey";
import { extractFirstLetters } from "@littlewheel/lib/text";
import { cn } from "@littlewheel/lib/utils";

interface HasName {
  firstName?: string;
  lastName?: string;
}

interface SmartAvatarProps<T extends HasName> {
  data: T | undefined;
  src?: string;
  alt?: string;
  className?: string;
  getKey: (data: T) => string | undefined;
  getName?: (data: T) => string;
  getInitialsName?: (data: T) => string;
  showName?: boolean;
  nameClassName?: string;
  fallbackTextClassName?: string;
  avatarSizeClassName?: string;
  upContent?: string | React.ReactNode;
  upContentClassName?: string;
  downContent?: string | React.ReactNode;
  downContentClassName?: string;
}

export function SmartAvatar<T extends HasName>({
  data,
  src,
  alt = "avatar",
  className,
  getKey,
  getName = (d) => `${d.firstName ?? ""} ${d.lastName ?? ""}`,
  getInitialsName = (d) => `${d.firstName ?? ""} ${d.lastName ?? ""}`,
  showName = false,
  nameClassName,
  fallbackTextClassName,
  avatarSizeClassName,
  upContent,
  upContentClassName,
  downContent,
  downContentClassName,
}: SmartAvatarProps<T>) {
  const key = data ? getKey(data) : undefined;
  const displayName = data ? getName(data) : "";
  const initials = data ? extractFirstLetters(getInitialsName(data), 2) : "";
  const fallbackBgClass = getFallbackBgClassFromKey(key);

  const avatarElement = (
    <Avatar className={cn("shrink-0", avatarSizeClassName)}>
      <AvatarImage src={src} alt={alt} />
      <AvatarFallback
        className={cn(
          "text-white font-semibold",
          fallbackBgClass,
          fallbackTextClassName
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );

  if (!showName && !upContent && !downContent) return avatarElement;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {avatarElement}
      <div className="flex flex-col">
        {upContent && (
          <div className={cn("text-xs", upContentClassName)}>{upContent}</div>
        )}
        {showName && (
          <span
            className={cn("text-sm font-medium text-foreground", nameClassName)}
          >
            {displayName}
          </span>
        )}
        {downContent && (
          <div className={cn("text-xs", downContentClassName)}>
            {downContent}
          </div>
        )}
      </div>
    </div>
  );
}
