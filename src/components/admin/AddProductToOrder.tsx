import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Search, Loader2 } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number | null;
  sku: string | null;
  has_modifications: boolean | null;
  images: unknown;
}

interface Modification {
  id: string;
  name: string;
  price: number;
  sku: string | null;
  product_id: string;
}

interface AddProductToOrderProps {
  onAddProduct: (product: {
    name: string;
    price: number;
    quantity: number;
    product_id: string | null;
    modification_id: string | null;
  }) => void;
  isAdding?: boolean;
}

export function AddProductToOrder({ onAddProduct, isAdding }: AddProductToOrderProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Search products
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["admin-search-products", search],
    queryFn: async () => {
      if (search.length < 2) return [];
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, sku, has_modifications, images")
        .or(`name.ilike.%${search}%,sku.ilike.%${search}%`)
        .limit(20);
      if (error) throw error;
      return data as Product[];
    },
    enabled: search.length >= 2,
  });

  // Fetch modifications for selected product
  const { data: modifications, isLoading: modificationsLoading } = useQuery({
    queryKey: ["admin-product-modifications", selectedProduct?.id],
    queryFn: async () => {
      if (!selectedProduct?.id) return [];
      const { data, error } = await supabase
        .from("product_modifications")
        .select("id, name, price, sku, product_id")
        .eq("product_id", selectedProduct.id)
        .order("sort_order");
      if (error) throw error;
      return data as Modification[];
    },
    enabled: !!selectedProduct?.id && !!selectedProduct?.has_modifications,
  });

  const handleSelectProduct = (product: Product) => {
    if (product.has_modifications) {
      setSelectedProduct(product);
    } else {
      // Add product directly if no modifications
      onAddProduct({
        name: product.name,
        price: product.price || 0,
        quantity: 1,
        product_id: product.id,
        modification_id: null,
      });
      handleClose();
    }
  };

  const handleSelectModification = (modification: Modification) => {
    onAddProduct({
      name: `${selectedProduct?.name} - ${modification.name}`,
      price: modification.price,
      quantity: 1,
      product_id: selectedProduct?.id || null,
      modification_id: modification.id,
    });
    handleClose();
  };

  const handleClose = () => {
    setOpen(false);
    setSearch("");
    setSelectedProduct(null);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
      else setOpen(true);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={isAdding}>
          {isAdding ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Додати товар
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {selectedProduct ? `Оберіть модифікацію: ${selectedProduct.name}` : "Додати товар до замовлення"}
          </DialogTitle>
        </DialogHeader>

        {!selectedProduct ? (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Пошук за назвою або артикулом..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>

            <ScrollArea className="h-[300px]">
              {productsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : search.length < 2 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Введіть мінімум 2 символи для пошуку
                </p>
              ) : products?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Товари не знайдено
                </p>
              ) : (
                <div className="space-y-1">
                  {products?.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => handleSelectProduct(product)}
                      className="w-full text-left p-3 rounded-md hover:bg-accent transition-colors"
                    >
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-muted-foreground flex gap-4">
                        {product.sku && <span>Арт: {product.sku}</span>}
                        {product.price !== null && (
                          <span>{product.price.toLocaleString()} ₴</span>
                        )}
                        {product.has_modifications && (
                          <span className="text-primary">Є модифікації</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        ) : (
          <div className="space-y-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedProduct(null)}
            >
              ← Назад до пошуку
            </Button>

            <ScrollArea className="h-[300px]">
              {modificationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : modifications?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Модифікації не знайдено
                </p>
              ) : (
                <div className="space-y-1">
                  {modifications?.map((mod) => (
                    <button
                      key={mod.id}
                      onClick={() => handleSelectModification(mod)}
                      className="w-full text-left p-3 rounded-md hover:bg-accent transition-colors"
                    >
                      <div className="font-medium">{mod.name}</div>
                      <div className="text-sm text-muted-foreground flex gap-4">
                        {mod.sku && <span>Арт: {mod.sku}</span>}
                        <span>{mod.price.toLocaleString()} ₴</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
