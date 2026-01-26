import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SimpleProductFieldsProps {
  price: number | null;
  oldPrice: number | null;
  sku: string;
  stockQuantity: number;
  isInStock: boolean;
  onPriceChange: (value: number | null) => void;
  onOldPriceChange: (value: number | null) => void;
  onSkuChange: (value: string) => void;
  onStockQuantityChange: (value: number) => void;
  onIsInStockChange: (value: boolean) => void;
}

export function SimpleProductFields({
  price,
  oldPrice,
  sku,
  stockQuantity,
  isInStock,
  onPriceChange,
  onOldPriceChange,
  onSkuChange,
  onStockQuantityChange,
  onIsInStockChange,
}: SimpleProductFieldsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ціна та наявність</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="price">Ціна *</Label>
            <Input
              id="price"
              type="number"
              min={0}
              step="0.01"
              value={price ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                onPriceChange(val ? parseFloat(val) : null);
              }}
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="old_price">Стара ціна</Label>
            <Input
              id="old_price"
              type="number"
              min={0}
              step="0.01"
              value={oldPrice ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                onOldPriceChange(val ? parseFloat(val) : null);
              }}
              placeholder="0"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sku">Артикул (SKU)</Label>
            <Input
              id="sku"
              value={sku}
              onChange={(e) => onSkuChange(e.target.value)}
              placeholder="INV-001"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stock_quantity">Кількість на складі</Label>
            <Input
              id="stock_quantity"
              type="number"
              min={0}
              value={stockQuantity}
              onChange={(e) => onStockQuantityChange(parseInt(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="is_in_stock">В наявності</Label>
          <Switch
            id="is_in_stock"
            checked={isInStock}
            onCheckedChange={onIsInStockChange}
          />
        </div>
      </CardContent>
    </Card>
  );
}
