import { useState, useMemo, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductGallery } from "@/components/catalog/ProductGallery";
import { ModificationSelector, type ModificationStockInfo } from "@/components/catalog/ModificationSelector";
import { ProductCharacteristics } from "@/components/catalog/ProductCharacteristics";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  ChevronRight,
  ShoppingCart,
  Heart,
  Share2,
} from "lucide-react";
import { StockDisplay } from "@/components/catalog/StockDisplay";
import { PluginSlot } from "@/components/plugins/PluginSlot";

export default function ProductDetail() {
  const { sectionSlug, productSlug } = useParams<{
    sectionSlug: string;
    productSlug: string;
  }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { addItem } = useCart();
  const { toast } = useToast();

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
            option_id,
            property_options:option_id(id, slug),
            section_properties:property_id(id, name, slug, property_type, has_page)
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

  // Fetch modification property values for all modifications
  const modificationIds = useMemo(() => {
    if (!product?.product_modifications) return [];
    return product.product_modifications.map((m: any) => m.id);
  }, [product]);

  const { data: modificationPropertyValues } = useQuery({
    queryKey: ["modification-property-values", modificationIds],
    queryFn: async () => {
      if (modificationIds.length === 0) return {};
      
      const { data, error } = await supabase
        .from("modification_property_values")
        .select(`
          modification_id,
          property_id,
          value,
          numeric_value,
          option_id,
          property_options:option_id(id, slug),
          section_properties:property_id(id, name, slug, property_type, has_page)
        `)
        .in("modification_id", modificationIds);
      
      if (error) throw error;
      
      // Group by modification_id
      const grouped: Record<string, any[]> = {};
      data?.forEach(v => {
        if (!grouped[v.modification_id]) {
          grouped[v.modification_id] = [];
        }
        grouped[v.modification_id].push({
          property_id: v.property_id,
          value: v.value,
          numeric_value: v.numeric_value,
          option_id: v.option_id,
          option: v.property_options,
          property: v.section_properties,
        });
      });
      
      return grouped;
    },
    enabled: modificationIds.length > 0,
  });

  // Fetch stock info for all modifications
  const { data: modificationsStockData } = useQuery({
    queryKey: ["modifications-stock", modificationIds],
    queryFn: async () => {
      if (modificationIds.length === 0) return {};
      
      const stockMap: Record<string, ModificationStockInfo> = {};
      
      // Fetch stock data for all modifications in parallel
      await Promise.all(
        modificationIds.map(async (modId: string) => {
          const { data, error } = await supabase.rpc("get_stock_info", {
            p_product_id: null,
            p_modification_id: modId,
          });
          
          if (!error && data?.[0]) {
            const row = data[0];
            stockMap[modId] = {
              totalQuantity: row.total_quantity ?? 0,
              isAvailable: row.is_available ?? false,
            };
          } else {
            stockMap[modId] = { totalQuantity: 0, isAvailable: false };
          }
        })
      );
      
      return stockMap;
    },
    enabled: modificationIds.length > 0,
    staleTime: 30000,
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

  // Check if product has modifications
  const hasModifications = (product as any)?.has_modifications ?? true;

  // Selected modification - sync with URL (only for products with modifications)
  const [selectedModId, setSelectedModId] = useState<string>("");
  const modSlugFromUrl = searchParams.get("mod");

  useEffect(() => {
    if (hasModifications && modifications.length > 0) {
      // Try to find modification by slug from URL
      if (modSlugFromUrl) {
        const modFromUrl = modifications.find((m) => m.slug === modSlugFromUrl);
        if (modFromUrl) {
          setSelectedModId(modFromUrl.id);
          return;
        }
      }
      // Fall back to default modification
      if (!selectedModId) {
        const defaultMod =
          modifications.find((m) => m.is_default) || modifications[0];
        setSelectedModId(defaultMod.id);
        // Update URL with default modification slug
        if (defaultMod.slug) {
          setSearchParams({ mod: defaultMod.slug }, { replace: true });
        }
      }
    }
  }, [modifications, modSlugFromUrl, selectedModId, setSearchParams, hasModifications]);

  const selectedMod = modifications.find((m) => m.id === selectedModId);

  // Handle modification selection with URL update
  const handleModificationSelect = useCallback((modId: string) => {
    const mod = modifications.find((m) => m.id === modId);
    if (mod) {
      setSelectedModId(modId);
      setSearchParams({ mod: mod.slug }, { replace: true });
    }
  }, [modifications, setSearchParams]);

  // Combine product and modification images
  const allImages = useMemo(() => {
    const productImages = Array.isArray(product?.images)
      ? (product.images as string[])
      : [];
    
    if (hasModifications && selectedMod) {
      const modImages = Array.isArray(selectedMod.images)
        ? (selectedMod.images as string[])
        : [];
      // Prefer modification images, fall back to product images
      return modImages.length > 0 ? modImages : productImages;
    }
    
    return productImages;
  }, [product?.images, selectedMod, hasModifications]);

  // Property values with property info - combine product and selected modification properties
  const propertyValues = useMemo(() => {
    // Product-level properties
    const productProps = (product?.product_property_values || []).map((pv: any) => ({
      property_id: pv.property_id,
      value: pv.value,
      numeric_value: pv.numeric_value,
      option_id: pv.option_id,
      option: pv.property_options,
      property: pv.section_properties,
    }));
    
    // Modification-level properties for selected modification
    const modProps = selectedModId && modificationPropertyValues?.[selectedModId] 
      ? modificationPropertyValues[selectedModId] 
      : [];
    
    // Combine: modification properties override product properties with same property_id
    const propMap = new Map<string, any>();
    productProps.forEach((pv: any) => propMap.set(pv.property_id, pv));
    modProps.forEach((pv: any) => propMap.set(pv.property_id, pv));
    
    return Array.from(propMap.values());
  }, [product, selectedModId, modificationPropertyValues]);

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
  
  // Get price, stock, and SKU based on product type
  let stockStatus: string | null;
  let price: number | undefined;
  let oldPrice: number | null | undefined;
  let sku: string | null | undefined;

  if (hasModifications) {
    stockStatus = selectedMod?.stock_status ?? "in_stock";
    price = selectedMod?.price;
    oldPrice = selectedMod?.old_price;
    sku = selectedMod?.sku;
  } else {
    stockStatus = (product as any).stock_status ?? "in_stock";
    price = (product as any).price ?? undefined;
    oldPrice = (product as any).old_price;
    sku = (product as any).sku;
  }
  
  const isInStock = stockStatus === "in_stock" || stockStatus === "on_order";

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
          {/* Plugin slot: before product info */}
          <PluginSlot name="product.detail.before" context={{ product, selectedMod }} />

          {/* Title and badges */}
          <div>
            <div className="flex items-start gap-3 mb-2">
              {discountPercent && (
                <Badge variant="destructive">-{discountPercent}%</Badge>
              )}
              {stockStatus === "on_order" && (
                <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/20">
                  Під замовлення
                </Badge>
              )}
              {!isInStock && (
                <Badge variant="secondary">Немає в наявності</Badge>
              )}
              {/* Plugin slot: product badges */}
              <PluginSlot 
                name="product.card.badges" 
                context={{ product, selectedMod }} 
                wrapper={(children) => <>{children}</>}
              />
            </div>
            <h1 className="text-3xl font-bold">{product.name}</h1>
            {sku && (
              <p className="text-sm text-muted-foreground mt-1">
                Артикул: {sku}
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
          <StockDisplay
            productId={hasModifications ? null : product.id}
            modificationId={hasModifications ? selectedModId : null}
          />

          <Separator />

          {/* Short description */}
          {product.short_description && (
            <p className="text-muted-foreground">{product.short_description}</p>
          )}

          {/* Modification selector - only for products with modifications */}
          {hasModifications && modifications.length > 0 && (
            <ModificationSelector
              modifications={modifications}
              selectedId={selectedModId}
              onSelect={handleModificationSelect}
              formatPrice={formatPrice}
              stockByModification={modificationsStockData}
            />
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              className="flex-1 min-w-[200px]"
              disabled={!isInStock || price === undefined}
              onClick={() => {
                if (price === undefined) return;
                
                addItem({
                  productId: product.id,
                  modificationId: hasModifications ? selectedModId : null,
                  name: product.name,
                  modificationName: hasModifications ? selectedMod?.name : undefined,
                  price: price,
                  image: allImages[0],
                  sku: sku || undefined,
                });
                
                toast({
                  title: "Додано в кошик",
                  description: `${product.name}${hasModifications && selectedMod ? ` (${selectedMod.name})` : ""}`,
                });
              }}
            >
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

      {/* Plugin slot: after product content */}
      <PluginSlot name="product.detail.after" context={{ product, selectedMod, propertyValues }} />
    </div>
  );
}
