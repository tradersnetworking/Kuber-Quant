import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 min-w-0 max-w-full rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 whitespace-normal sm:whitespace-nowrap text-center leading-snug" +
" hover-elevate active-elevate-2",
  {
    variants: {
      variant: {
        default:
           "bg-primary text-primary-foreground border border-primary-border",
        cta:
          "bg-gradient-to-r from-amber-400 to-yellow-600 hover:from-amber-500 hover:to-yellow-700 text-amber-950 font-bold border border-amber-500/30 shadow-sm",
        success:
          "bg-green-600 hover:bg-green-700 text-white font-semibold border border-green-700/30",
        danger:
          "bg-red-600 hover:bg-red-700 text-white font-semibold border border-red-700/30",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm border-destructive-border",
        outline:
          // Shows the background color of whatever card / sidebar / accent background it is inside of.
          // Inherits the current text color. Uses shadow-xs. No shadow on active. No hover state.
          " border text-foreground [border-color:var(--button-outline)] shadow-xs active:shadow-none ",
        secondary:
          "border bg-secondary text-secondary-foreground border border-secondary-border ",
        ghost: "border border-transparent text-foreground hover:bg-muted/80 dark:hover:bg-white/5",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-10 sm:min-h-9 px-4 py-2",
        sm: "min-h-9 sm:min-h-8 rounded-md px-3 text-xs",
        lg: "min-h-11 sm:min-h-10 rounded-md px-8",
        icon: "h-10 w-10 sm:h-9 sm:w-9",
        /** Long label + icon on mobile (deposit submit, pay, upload). */
        wrap: "min-h-10 h-auto px-4 py-2 whitespace-normal leading-tight text-center max-sm:text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
