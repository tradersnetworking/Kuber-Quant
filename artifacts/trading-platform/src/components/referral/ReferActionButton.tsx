import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { REFER_BUTTON_CLASS } from "@/lib/refer-button-styles";
import { cn } from "@/lib/utils";

type Props = {
  compact?: boolean;
  className?: string;
  href?: string;
  onClick?: () => void;
};

export function ReferActionButton({ compact, className, href = "/referral", onClick }: Props) {
  const { t } = useTranslation();

  const btn = (
    <Button
      type="button"
      variant="outline"
      size={compact ? "sm" : "default"}
      className={cn(
        compact ? "h-8 sm:h-9 px-2.5 text-xs sm:text-sm shrink-0" : "",
        REFER_BUTTON_CLASS,
        className,
      )}
      onClick={onClick}
    >
      <Users className={cn(compact ? "h-3.5 w-3.5 mr-1.5" : "h-4 w-4 mr-2")} />
      {t("dashboard.refer")}
    </Button>
  );

  if (onClick) return btn;
  return (
    <Button asChild variant="outline" size={compact ? "sm" : "default"} className={cn(compact ? "h-8 sm:h-9 px-2.5 text-xs sm:text-sm shrink-0" : "", REFER_BUTTON_CLASS, className)}>
      <Link href={href}>
        <Users className={cn(compact ? "h-3.5 w-3.5 mr-1.5" : "h-4 w-4 mr-2")} />
        {t("dashboard.refer")}
      </Link>
    </Button>
  );
}
