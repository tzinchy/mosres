import { Settings2 } from "lucide-react";
import type { VisibilityState } from "@tanstack/react-table";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { APART_COL_LABELS } from "@/hooks/useApartCols";
import { cn } from "@/lib/utils";

export function ColumnsMenu({
  value,
  onChange,
  className,
  align = "start",
}: {
  value: VisibilityState;
  onChange: (v: VisibilityState) => void;
  className?: string;
  align?: "start" | "end";
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={buttonVariants({
          variant: "outline",
          size: "sm",
          className: cn("h-9 text-muted-foreground", className),
        })}
      >
        <Settings2 size={14} className="mr-1.5" />
        Колонки
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        <DropdownMenuGroup>
          <DropdownMenuLabel>Показывать колонки</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {Object.entries(APART_COL_LABELS).map(([id, label]) => (
            <DropdownMenuCheckboxItem
              key={id}
              checked={value[id] !== false}
              onCheckedChange={(v) => onChange({ ...value, [id]: !!v })}
            >
              {label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
