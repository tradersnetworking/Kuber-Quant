import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";
import { useWithdrawalBlock } from "@/hooks/use-withdrawal-block";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function WithdrawalBlockedAlert({ open, onOpenChange }: Props) {
  const { message } = useWithdrawalBlock();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent className="bg-background border-border dark:border-white/10 max-w-md w-[calc(100vw-2rem)] overflow-x-hidden">
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-base sm:text-lg break-words">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          Withdrawals unavailable
        </AlertDialogTitle>
        <AlertDialogDescription className="text-sm leading-relaxed text-wrap-safe">
            {message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction className="bg-amber-500 text-black hover:bg-amber-400">
            OK
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
