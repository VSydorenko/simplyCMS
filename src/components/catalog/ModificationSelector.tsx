import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Modification {
  id: string;
  name: string;
  slug: string;
  price: number;
  old_price?: number | null;
  is_in_stock: boolean;
  sku?: string | null;
}

interface ModificationSelectorProps {
  modifications: Modification[];
  selectedId: string;
  onSelect: (id: string) => void;
  formatPrice: (price: number) => string;
}

export function ModificationSelector({
  modifications,
  selectedId,
  onSelect,
  formatPrice,
}: ModificationSelectorProps) {
  if (modifications.length <= 1) {
    return null;
  }

  return (
    <div className="space-y-3">
      <Label className="text-base font-medium">Модифікація</Label>
      <RadioGroup
        value={selectedId}
        onValueChange={onSelect}
        className="grid gap-3"
      >
        {modifications.map((mod) => (
          <Label
            key={mod.id}
            htmlFor={mod.id}
            className={cn(
              "flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors",
              selectedId === mod.id
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground/50",
              !mod.is_in_stock && "opacity-60"
            )}
          >
            <div className="flex items-center gap-3">
              <RadioGroupItem value={mod.id} id={mod.id} />
              <div>
                <div className="font-medium">{mod.name}</div>
                {mod.sku && (
                  <div className="text-xs text-muted-foreground">
                    Артикул: {mod.sku}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!mod.is_in_stock && (
                <Badge variant="secondary">Немає в наявності</Badge>
              )}
              <div className="text-right">
                <div className="font-bold text-primary">
                  {formatPrice(mod.price)}
                </div>
                {mod.old_price && mod.old_price > mod.price && (
                  <div className="text-sm text-muted-foreground line-through">
                    {formatPrice(mod.old_price)}
                  </div>
                )}
              </div>
            </div>
          </Label>
        ))}
      </RadioGroup>
    </div>
  );
}
