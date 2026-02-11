"use client";

import { X } from "lucide-react";

interface ActiveFilter {
  key: string;
  label: string;
  value: string;
  type: "option" | "range" | "price";
  optionId?: string;
}

interface ActiveFiltersProps {
  filters: ActiveFilter[];
  onRemoveFilter: (filter: ActiveFilter) => void;
  onClearAll: () => void;
  /** Render a Badge component. Receives props: variant, className, children */
  renderBadge?: (props: { variant: string; className?: string; children: React.ReactNode }) => React.ReactNode;
  /** Render a Button component. Receives props: variant, size, onClick, className, children */
  renderButton?: (props: { variant: string; size: string; onClick: () => void; className?: string; children: React.ReactNode }) => React.ReactNode;
}

export type { ActiveFilter };

export function ActiveFilters({ filters, onRemoveFilter, onClearAll, renderBadge, renderButton }: ActiveFiltersProps) {
  if (filters.length === 0) return null;

  const Badge = renderBadge || (({ children, className }: any) => (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground ${className || ""}`}>
      {children}
    </span>
  ));

  const Button = renderButton || (({ children, onClick, className }: any) => (
    <button onClick={onClick} className={`text-sm hover:underline ${className || ""}`}>
      {children}
    </button>
  ));

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <span className="text-sm text-muted-foreground">Активнi фiльтри:</span>
      {filters.map((filter, index) => (
        <Badge
          key={`${filter.key}-${filter.optionId || index}`}
          variant="secondary"
          className="gap-1 pr-1"
        >
          <span className="text-xs text-muted-foreground">{filter.label}:</span>
          <span>{filter.value}</span>
          <button
            onClick={() => onRemoveFilter(filter)}
            className="ml-1 hover:bg-muted rounded-full p-0.5"
            aria-label={`Видалити фiльтр ${filter.label}: ${filter.value}`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Button variant="ghost" size="sm" onClick={onClearAll} className="h-6 text-xs">
        Скинути всi
      </Button>
    </div>
  );
}
