import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Image } from "lucide-react";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    short_description?: string | null;
    images?: string[];
    section?: { slug: string } | null;
    modifications?: Array<{
      price: number;
      old_price?: number | null;
      is_in_stock: boolean;
    }>;
  };
}

export function ProductCard({ product }: ProductCardProps) {
  const firstImage = product.images?.[0];
  const defaultMod = product.modifications?.[0];
  const price = defaultMod?.price;
  const oldPrice = defaultMod?.old_price;
  const isInStock = defaultMod?.is_in_stock ?? true;
  const sectionSlug = product.section?.slug || "";

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat("uk-UA", {
      style: "currency",
      currency: "UAH",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Link to={`/catalog/${sectionSlug}/${product.slug}`}>
      <Card className="group h-full overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
        <div className="aspect-square overflow-hidden bg-muted relative">
          {firstImage ? (
            <img
              src={firstImage}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/placeholder.svg";
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Image className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
          {!isInStock && (
            <Badge variant="secondary" className="absolute top-2 right-2">
              Немає в наявності
            </Badge>
          )}
          {oldPrice && price && oldPrice > price && (
            <Badge variant="destructive" className="absolute top-2 left-2">
              -{Math.round(((oldPrice - price) / oldPrice) * 100)}%
            </Badge>
          )}
        </div>
        <CardContent className="p-4">
          <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors mb-2">
            {product.name}
          </h3>
          {product.short_description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
              {product.short_description}
            </p>
          )}
          <div className="flex items-baseline gap-2">
            {price !== undefined && (
              <span className="text-lg font-bold text-primary">
                {formatPrice(price)}
              </span>
            )}
            {oldPrice && price && oldPrice > price && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(oldPrice)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
