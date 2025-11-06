import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";
import { Sparkles } from "lucide-react";

interface JournalistBylineProps {
  journalistId: string;
  nickname: string;
  surname: string;
  headshot: string;
  size?: "sm" | "md";
  className?: string;
  asLink?: boolean;
}

export function JournalistByline({
  journalistId,
  nickname,
  surname,
  headshot,
  size = "sm",
  className = "",
  asLink = true,
}: JournalistBylineProps) {
  const avatarSize = size === "sm" ? "w-8 h-8" : "w-10 h-10";
  const textSize = size === "sm" ? "text-sm" : "text-base";

  const content = (
    <div
      className={`flex items-center gap-2 ${asLink ? 'hover-elevate active-elevate-2 cursor-pointer' : ''} rounded-md p-1 -m-1 transition-all ${className}`}
      data-testid={`link-journalist-${journalistId}`}
    >
      <Avatar className={`${avatarSize} rounded-lg after:content-none`} data-testid={`img-journalist-avatar-${journalistId}`}>
        <AvatarImage src={headshot} alt={`${nickname} ${surname}`} className="object-cover object-top" />
        <AvatarFallback className="text-xs rounded-lg">{nickname[0]}</AvatarFallback>
      </Avatar>
      <span className={`font-medium text-foreground ${textSize} flex items-center gap-1`} data-testid={`text-journalist-name-${journalistId}`}>
        {nickname} {surname}
        <Sparkles className="w-3 h-3 text-muted-foreground/60" />
      </span>
    </div>
  );

  if (asLink) {
    return <Link href={`/journalist/${journalistId}`}>{content}</Link>;
  }

  return content;
}
