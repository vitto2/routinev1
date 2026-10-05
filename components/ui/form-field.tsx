import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export interface ControlProps {
  id: string;
  "aria-invalid": boolean | undefined;
  "aria-describedby": string | undefined;
  "aria-required": boolean | undefined;
}

/**
 * Rótulo visível + dica + erro ligados ao controle por aria-describedby.
 * O controle recebe os atributos de acessibilidade via render prop.
 */
export function Field({
  id,
  label,
  required = false,
  optionalHint = false,
  hint,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  optionalHint?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: (props: ControlProps) => React.ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
        {required ? (
          <span aria-hidden className="text-destructive">
            *
          </span>
        ) : null}
        {optionalHint ? (
          <span className="font-normal text-muted-foreground">(opcional)</span>
        ) : null}
      </Label>
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": [errorId, hintId].filter(Boolean).join(" ") || undefined,
        "aria-required": required || undefined,
      })}
      {hint && !error ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="animate-rise flex items-start gap-1.5 text-sm font-medium text-destructive"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
