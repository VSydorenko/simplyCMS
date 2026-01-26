import { useState, useMemo, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductGallery } from "@/components/catalog/ProductGallery";
import { ModificationSelector } from "@/components/catalog/ModificationSelector";
import { ProductCharacteristics } from "@/components/catalog/ProductCharacteristics";
import {
  Loader2,
  ChevronRight,
  ShoppingCart,
  Heart,
  Share2,
  Check,
  X,
} from "lucide-react";

export default function ProductDetail() {
  const { sectionSlug, productSlug } = useParams<{
    sectionSlug: string;
    productSlug: string;
  }>();
  const navigate = useNavigate();

  // Fetch product with all related data
  const { data: product, isLoading } = useQuery({
    queryKey: ["public-product", productSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          `
          *,
          sections(id, slug, name),
          product_modifications(*),
          product_property_values(
            property_id,
            value,
            numeric_value,
            section_properties(id, name, code, property_type)
          )
        `
        )
        .eq("slug", productSlug)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Get sorted modifications
  const modifications = useMemo(() => {
    if (!product?.product_modifications) return [];
    return [...product.product_modifications].sort((a, b) => {
      if (a.is_default && !b.is_default) return -1;
      if (!a.is_default && b.is_default) return 1;
      return a.sort_order - b.sort_order;
    });
  }, [product]);

  // Selected modification
  const [selectedModId, setSelectedModId] = useState<string>("");

  useEffect(() => {
    if (modifications.length > 0 && !selectedModId) {
      const defaultMod =
        modifications.find((m) => m.is_default) || modifications[0];
      setSelectedModId(defaultMod.id);
    }
  }, [modifications, selectedModId]);

  const selectedMod = modifications.find((m) => m.id === selectedModId);

  // Combine product and modification images
  const allImages = useMemo(() => {
    const productImages = Array.isArray(product?.images)
      ? (product.images as string[])
      : [];
    const modImages =
      selectedMod && Array.isArray(selectedMod.images)
        ? (selectedMod.images as string[])
        : [];
    // Prefer modification images, fall back to product images
    return modImages.length > 0 ? modImages : productImages;
  }, [product?.images, selectedMod]);

  // Property values with property info
  const propertyValues = useMemo(() => {
    if (!product?.product_property_values) return [];
    return product.product_property_values.map((pv: any) => ({
      property_id: pv.property_id,
      value: pv.value,
      numeric_value: pv.numeric_value,
      property: pv.section_properties,
    }));
  }, [product]);

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat("uk-UA", {
      style: "currency",
      currency: "UAH",
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Товар не знайдено</h1>
        <Button onClick={() => navigate(-1)}>Повернутись назад</Button>
      </div>
    );
  }

  const section = product.sections;
  const isInStock = selectedMod?.is_in_stock ?? true;
  const price = selectedMod?.price;
  const oldPrice = selectedMod?.old_price;
  const discountPercent =
    oldPrice && price && oldPrice > price
      ? Math.round(((oldPrice - price) / oldPrice) * 100)
      : null;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6 flex-wrap">
        <Link to="/" className="hover:text-foreground transition-colors">
          Головна
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link to="/catalog" className="hover:text-foreground transition-colors">
          Каталог
        </Link>
        {section && (
          <>
            <ChevronRight className="h-4 w-4" />
            <Link
              to={`/catalog/${section.slug}`}
              className="hover:text-foreground transition-colors"
            >
              {section.name}
            </Link>
          </>
        )}
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Gallery */}
        <div>
          <ProductGallery images={allImages} productName={product.name} />
        </div>

        {/* Product info */}
        <div className="space-y-6">
          {/* Title and badges */}
          <div>
            <div className="flex items-start gap-3 mb-2">
              {discountPercent && (
                <Badge variant="destructive">-{discountPercent}%</Badge>
              )}
              {!isInStock && (
                <Badge variant="secondary">Немає в наявності</Badge>
              )}
            </div>
            <h1 className="text-3xl font-bold">{product.name}</h1>
            {selectedMod?.sku && (
              <p className="text-sm text-muted-foreground mt-1">
                Артикул: {selectedMod.sku}
              </p>
            )}
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            {price !== undefined && (
              <span className="text-4xl font-bold text-primary">
                {formatPrice(price)}
              </span>
            )}
            {oldPrice && price && oldPrice > price && (
              <span className="text-xl text-muted-foreground line-through">
                {formatPrice(oldPrice)}
              </span>
            )}
          </div>

          {/* Stock status */}
          <div className="flex items-center gap-2">
            {isInStock ? (
              <>
                <Check className="h-5 w-5 text-green-500" />
                <span className="text-green-600 font-medium">В наявності</span>
              </>
            ) : (
              <>
                <X className="h-5 w-5 text-destructive" />
                <span className="text-destructive font-medium">
                  Немає в наявності
                </span>
              </>
            )}
          </div>

          <Separator />

          {/* Short description */}
          {product.short_description && (
            <p className="text-muted-foreground">{product.short_description}</p>
          )}

          {/* Modification selector */}
          <ModificationSelector
            modifications={modifications}
            selectedId={selectedModId}
            onSelect={setSelectedModId}
            formatPrice={formatPrice}
          />

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button size="lg" className="flex-1 min-w-[200px]" disabled={!isInStock}>
              <ShoppingCart className="h-5 w-5 mr-2" />
              Додати в кошик
            </Button>
            <Button size="lg" variant="outline">
              <Heart className="h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline">
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs section */}
      <div className="mt-12">
        <Tabs defaultValue="description">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
            <TabsTrigger
              value="description"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
            >
              Опис
            </TabsTrigger>
            <TabsTrigger
              value="characteristics"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
            >
              Характеристики
            </TabsTrigger>
          </TabsList>
          <TabsContent value="description" className="mt-6">
            {product.description ? (
              <div
                className="prose prose-sm max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            ) : (
              <p className="text-muted-foreground">Опис товару відсутній</p>
            )}
          </TabsContent>
          <TabsContent value="characteristics" className="mt-6">
            <ProductCharacteristics propertyValues={propertyValues} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
