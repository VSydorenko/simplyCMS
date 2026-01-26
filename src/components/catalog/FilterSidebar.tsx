import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { X } from "lucide-react";

interface Property {
  id: string;
  name: string;
  code: string;
  property_type: string;
  is_filterable: boolean;
}

interface PropertyOption {
  id: string;
  property_id: string;
  name: string;
  slug: string;
  sort_order: number;
}

interface FilterSidebarProps {
  sectionId?: string;
  filters: Record<string, any>;
  onFilterChange: (filters: Record<string, any>) => void;
  priceRange?: { min: number; max: number };
}

export function FilterSidebar({
  sectionId,
  filters,
  onFilterChange,
  priceRange,
}: FilterSidebarProps) {
  const [localPriceRange, setLocalPriceRange] = useState<[number, number]>([
    priceRange?.min || 0,
    priceRange?.max || 100000,
  ]);

  // Update local price range when priceRange prop changes
  useEffect(() => {
    if (priceRange) {
      setLocalPriceRange([priceRange.min, priceRange.max]);
    }
  }, [priceRange]);

  // Fetch properties assigned to this section via section_property_assignments
  const { data: properties } = useQuery({
    queryKey: ["section-filter-properties", sectionId],
    queryFn: async () => {
      if (!sectionId) return [];
      const { data, error } = await supabase
        .from("section_property_assignments")
        .select(`
          property:property_id (
            id,
            name,
            code,
            property_type,
            is_filterable
          )
        `)
        .eq("section_id", sectionId);
      if (error) throw error;
      // Extract and filter properties
      return data
        .map(a => a.property as Property | null)
        .filter((p): p is Property => Boolean(p && p.is_filterable));
    },
    enabled: !!sectionId,
  });

  const filterableProperties = properties || [];
  
  // Get property IDs for select/multiselect properties
  const selectPropertyIds = filterableProperties
    .filter(p => p.property_type === "select" || p.property_type === "multiselect")
    .map(p => p.id);

  // Fetch property options from property_options table
  const { data: propertyOptions } = useQuery({
    queryKey: ["filter-property-options", selectPropertyIds],
    queryFn: async () => {
      if (selectPropertyIds.length === 0) return {};
      
      const { data, error } = await supabase
        .from("property_options")
        .select("*")
        .in("property_id", selectPropertyIds)
        .order("sort_order", { ascending: true });
      
      if (error) throw error;
      
      // Group by property_id
      const grouped: Record<string, PropertyOption[]> = {};
      data?.forEach(opt => {
        if (!grouped[opt.property_id]) {
          grouped[opt.property_id] = [];
        }
        grouped[opt.property_id].push(opt);
      });
      
      return grouped;
    },
    enabled: selectPropertyIds.length > 0,
  });

  const handleCheckboxChange = (propertyCode: string, optionId: string, checked: boolean) => {
    const current = filters[propertyCode] || [];
    const updated = checked
      ? [...current, optionId]
      : current.filter((v: string) => v !== optionId);
    
    onFilterChange({
      ...filters,
      [propertyCode]: updated.length > 0 ? updated : undefined,
    });
  };

  const handlePriceChange = (values: number[]) => {
    setLocalPriceRange([values[0], values[1]]);
  };

  const handlePriceCommit = () => {
    onFilterChange({
      ...filters,
      priceMin: localPriceRange[0],
      priceMax: localPriceRange[1],
    });
  };

  const handleClearFilters = () => {
    setLocalPriceRange([priceRange?.min || 0, priceRange?.max || 100000]);
    onFilterChange({});
  };

  const hasActiveFilters = Object.keys(filters).some(
    (key) => filters[key] !== undefined && 
    (Array.isArray(filters[key]) ? filters[key].length > 0 : true)
  );

  // Get options for a property
  const getOptionsForProperty = (property: Property): PropertyOption[] => {
    return propertyOptions?.[property.id] || [];
  };

  if (!sectionId) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Фільтри</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            <X className="h-4 w-4 mr-1" />
            Скинути
          </Button>
        )}
      </div>

      <Accordion type="multiple" defaultValue={["price", ...filterableProperties.map(p => p.id)]} className="w-full">
        {/* Price filter */}
        {priceRange && (
          <AccordionItem value="price">
            <AccordionTrigger className="text-sm font-medium">
              Ціна
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2">
                <Slider
                  min={priceRange.min}
                  max={priceRange.max}
                  step={100}
                  value={localPriceRange}
                  onValueChange={handlePriceChange}
                  onValueCommit={handlePriceCommit}
                  className="w-full"
                />
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={localPriceRange[0]}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setLocalPriceRange([val, localPriceRange[1]]);
                    }}
                    onBlur={handlePriceCommit}
                    className="h-8 text-sm"
                  />
                  <span className="text-muted-foreground">—</span>
                  <Input
                    type="number"
                    value={localPriceRange[1]}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || priceRange.max;
                      setLocalPriceRange([localPriceRange[0], val]);
                    }}
                    onBlur={handlePriceCommit}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Property filters */}
        {filterableProperties.map((property) => {
          const options = getOptionsForProperty(property);
          
          return (
            <AccordionItem key={property.id} value={property.id}>
              <AccordionTrigger className="text-sm font-medium">
                {property.name}
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 pt-2">
                  {property.property_type === "select" ||
                  property.property_type === "multiselect" ? (
                    options.length > 0 ? (
                      options.map((option) => (
                        <div key={option.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`${property.code}-${option.id}`}
                            checked={(filters[property.code] || []).includes(option.id)}
                            onCheckedChange={(checked) =>
                              handleCheckboxChange(property.code, option.id, !!checked)
                            }
                          />
                          <Label
                            htmlFor={`${property.code}-${option.id}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {option.name}
                          </Label>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Немає опцій</p>
                    )
                  ) : property.property_type === "boolean" ? (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`${property.code}-true`}
                        checked={filters[property.code] === true}
                        onCheckedChange={(checked) =>
                          onFilterChange({
                            ...filters,
                            [property.code]: checked ? true : undefined,
                          })
                        }
                      />
                      <Label
                        htmlFor={`${property.code}-true`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        Так
                      </Label>
                    </div>
                  ) : property.property_type === "color" ? (
                    options.map((option) => (
                      <div key={option.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`${property.code}-${option.id}`}
                          checked={(filters[property.code] || []).includes(option.id)}
                          onCheckedChange={(checked) =>
                            handleCheckboxChange(property.code, option.id, !!checked)
                          }
                        />
                        <div
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: option.name }}
                        />
                        <Label
                          htmlFor={`${property.code}-${option.id}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {option.name}
                        </Label>
                      </div>
                    ))
                  ) : null}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
