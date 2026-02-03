import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StockStatusSelect } from "./StockStatusSelect";
import { StockByPointManager } from "./StockByPointManager";
import type { StockStatus } from "@/hooks/useStock";

interface SimpleProductFieldsProps {
  productId: string;
  price: number | null;
  oldPrice: number | null;
  sku: string;
  stockStatus: StockStatus;
  onPriceChange: (value: number | null) => void;
  onOldPriceChange: (value: number | null) => void;
  onSkuChange: (value: string) => void;
  onStockStatusChange: (value: StockStatus) => void;
}

export function SimpleProductFields({
  productId,
  price,
  oldPrice,
  sku,
  stockStatus,
  onPriceChange,
  onOldPriceChange,
  onSkuChange,
  onStockStatusChange,
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
          <StockStatusSelect
            value={stockStatus}
            onChange={onStockStatusChange}
          />
        </div>

        <StockByPointManager productId={productId} showCard={false} />
      </CardContent>
    </Card>
  );
}
