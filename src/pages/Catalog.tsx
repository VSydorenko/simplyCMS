import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ProductCard } from "@/components/catalog/ProductCard";
import { FilterSidebar } from "@/components/catalog/FilterSidebar";
import { Loader2, ChevronRight, Filter, LayoutGrid, List, FolderOpen } from "lucide-react";

type SortOption = "popular" | "price_asc" | "price_desc" | "newest";

export default function Catalog() {
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [sortBy, setSortBy] = useState<SortOption>("popular");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  // Fetch all sections
  const { data: sections } = useQuery({
    queryKey: ["public-sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sections")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch all products with modification property values
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["all-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          sections(id, slug, name),
          product_modifications(id, price, old_price, is_in_stock, is_default, sort_order),
          product_property_values(property_id, value, numeric_value, option_id)
        `)
        .eq("is_active", true);
      if (error) throw error;

      // Fetch modification property values
      const modificationIds = data.flatMap(p => 
        (p.product_modifications || []).map((m: any) => m.id)
      );
      
      let modPropertyValues: Record<string, any[]> = {};
      if (modificationIds.length > 0) {
        const { data: modPropValues } = await supabase
          .from("modification_property_values")
          .select("modification_id, property_id, value, numeric_value, option_id")
          .in("modification_id", modificationIds);
        
        if (modPropValues) {
          modPropValues.forEach(v => {
            if (!modPropertyValues[v.modification_id]) {
              modPropertyValues[v.modification_id] = [];
            }
            modPropertyValues[v.modification_id].push(v);
          });
        }
      }

      return data.map((product) => {
        const mods = product.product_modifications || [];
        const defaultMod =
          mods.find((m: any) => m.is_default) ||
          mods.sort((a: any, b: any) => a.sort_order - b.sort_order)[0];
        const images = product.images as string[] | null;
        
        // Collect all property values from product and all modifications
        const allPropertyValues = [
          ...(product.product_property_values || []),
          ...mods.flatMap((m: any) => modPropertyValues[m.id] || [])
        ];
        
        return {
          ...product,
          images: Array.isArray(images) ? images : [],
          section: product.sections,
          modifications: defaultMod ? [defaultMod] : [],
          propertyValues: allPropertyValues,
        };
      });
    },
  });

  // Calculate price range
  const priceRange = useMemo(() => {
    if (!products?.length) return undefined;
    const prices = products
      .flatMap((p) => p.modifications?.map((m: any) => m.price) || [])
      .filter((p): p is number => typeof p === "number");
    if (prices.length === 0) return undefined;
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }, [products]);

  // Fetch numeric properties for selected section
  const { data: numericProperties } = useQuery({
    queryKey: ["section-numeric-properties", selectedSectionId],
    queryFn: async () => {
      if (!selectedSectionId) return [];
      const { data, error } = await supabase
        .from("section_property_assignments")
        .select(`
          property:property_id (
            id,
            code,
            property_type,
            is_filterable
          )
        `)
        .eq("section_id", selectedSectionId);
      if (error) throw error;
      return data
        .map(a => a.property as { id: string; code: string; property_type: string; is_filterable: boolean } | null)
        .filter((p): p is { id: string; code: string; property_type: string; is_filterable: boolean } => 
          Boolean(p && p.is_filterable && (p.property_type === "number" || p.property_type === "range"))
        );
    },
    enabled: !!selectedSectionId,
  });

  // Calculate numeric property ranges from filtered products data
  const numericPropertyRanges = useMemo(() => {
    if (!products?.length || !numericProperties?.length) return {};
    
    // Only calculate ranges for products in the selected section
    const relevantProducts = selectedSectionId 
      ? products.filter(p => p.section?.id === selectedSectionId)
      : products;
    
    const ranges: Record<string, { min: number; max: number }> = {};
    
    numericProperties.forEach(prop => {
      const values: number[] = [];
      relevantProducts.forEach(product => {
        product.propertyValues.forEach((pv: any) => {
          if (pv.property_id === prop.id && pv.numeric_value !== null) {
            values.push(pv.numeric_value);
          }
        });
      });
      
      if (values.length > 0) {
        ranges[prop.code] = {
          min: Math.min(...values),
          max: Math.max(...values),
        };
      }
    });
    
    return ranges;
  }, [products, numericProperties, selectedSectionId]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    if (!products) return [];

    let result = [...products];

    // Filter by selected section
    if (selectedSectionId) {
      result = result.filter((p) => p.section?.id === selectedSectionId);
    }

    // Apply property filters (by option_id)
    Object.entries(filters).forEach(([key, value]) => {
      if (key === "priceMin" || key === "priceMax") return;
      // Skip numeric range filters (they end with Min or Max)
      if (key.endsWith("Min") || key.endsWith("Max")) return;
      if (!value || (Array.isArray(value) && value.length === 0)) return;

      result = result.filter((product) => {
        const propValue = product.propertyValues.find(
          (pv: any) => {
            // Find by option_id in the selected values
            if (pv.option_id && Array.isArray(value)) {
              // Handle comma-separated option_ids for multiselect
              const productOptionIds = pv.option_id.split(",").filter(Boolean);
              return productOptionIds.some((id: string) => value.includes(id));
            }
            return false;
          }
        );
        return !!propValue;
      });
    });

    // Apply numeric property filters
    numericProperties?.forEach(prop => {
      const minKey = `${prop.code}Min`;
      const maxKey = `${prop.code}Max`;
      const minVal = filters[minKey];
      const maxVal = filters[maxKey];
      
      if (minVal !== undefined || maxVal !== undefined) {
        result = result.filter((product) => {
          const propValue = product.propertyValues.find(
            (pv: any) => pv.property_id === prop.id && pv.numeric_value !== null
          );
          if (!propValue) return false; // Filter out products without this property value
          const val = propValue.numeric_value;
          if (minVal !== undefined && val < minVal) return false;
          if (maxVal !== undefined && val > maxVal) return false;
          return true;
        });
      }
    });

    // Apply price filter
    if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
      result = result.filter((product) => {
        const price = product.modifications?.[0]?.price;
        if (price === undefined) return true;
        if (filters.priceMin !== undefined && price < filters.priceMin)
          return false;
        if (filters.priceMax !== undefined && price > filters.priceMax)
          return false;
        return true;
      });
    }

    // Sort
    switch (sortBy) {
      case "price_asc":
        result.sort((a, b) => {
          const priceA = a.modifications?.[0]?.price || 0;
          const priceB = b.modifications?.[0]?.price || 0;
          return priceA - priceB;
        });
        break;
      case "price_desc":
        result.sort((a, b) => {
          const priceA = a.modifications?.[0]?.price || 0;
          const priceB = b.modifications?.[0]?.price || 0;
          return priceB - priceA;
        });
        break;
      case "newest":
        result.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
      default:
        break;
    }

    return result;
  }, [products, filters, sortBy, selectedSectionId, numericProperties]);

  const handleSectionClick = (sectionId: string | null) => {
    setSelectedSectionId(sectionId);
    setFilters({});
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link to="/" className="hover:text-foreground transition-colors">
          Головна
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">Каталог</span>
      </nav>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-4xl font-bold mb-2">Каталог</h1>
        <p className="text-muted-foreground">
          Оберіть категорію або скористайтесь фільтрами
        </p>
      </div>

      {/* Section chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Badge
          variant={selectedSectionId === null ? "default" : "outline"}
          className="cursor-pointer px-3 py-1.5 text-sm"
          onClick={() => handleSectionClick(null)}
        >
          Всі товари
        </Badge>
        {sections?.map((section) => (
          <Badge
            key={section.id}
            variant={selectedSectionId === section.id ? "default" : "outline"}
            className="cursor-pointer px-3 py-1.5 text-sm gap-2"
            onClick={() => handleSectionClick(section.id)}
          >
            {section.image_url ? (
              <img
                src={section.image_url}
                alt=""
                className="w-4 h-4 rounded object-cover"
              />
            ) : (
              <FolderOpen className="w-3 h-3" />
            )}
            {section.name}
          </Badge>
        ))}
      </div>

      <div className="flex gap-8">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <FilterSidebar
            sectionId={selectedSectionId || undefined}
            filters={filters}
            onFilterChange={setFilters}
            priceRange={priceRange}
            numericPropertyRanges={numericPropertyRanges}
          />
        </aside>

        {/* Main content */}
        <div className="flex-1">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b">
            <div className="flex items-center gap-4">
              {/* Mobile filter button */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="lg:hidden">
                    <Filter className="h-4 w-4 mr-2" />
                    Фільтри
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 overflow-y-auto">
                  <FilterSidebar
                    sectionId={selectedSectionId || undefined}
                    filters={filters}
                    onFilterChange={setFilters}
                    priceRange={priceRange}
                    numericPropertyRanges={numericPropertyRanges}
                  />
                </SheetContent>
              </Sheet>

              <span className="text-sm text-muted-foreground">
                {filteredProducts.length} товарів
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Select
                value={sortBy}
                onValueChange={(v) => setSortBy(v as SortOption)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">За популярністю</SelectItem>
                  <SelectItem value="newest">Новинки</SelectItem>
                  <SelectItem value="price_asc">Дешевші</SelectItem>
                  <SelectItem value="price_desc">Дорожчі</SelectItem>
                </SelectContent>
              </Select>

              <div className="hidden sm:flex border rounded-md">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="rounded-r-none"
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  className="rounded-l-none"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Products grid */}
          {productsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredProducts.length > 0 ? (
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4"
                  : "flex flex-col gap-4"
              }
            >
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                Товарів за вибраними фільтрами не знайдено
              </p>
              <Button variant="outline" onClick={() => setFilters({})}>
                Скинути фільтри
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
