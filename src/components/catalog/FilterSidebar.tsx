import { useState } from "react";
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
  options?: string[] | null;
  is_filterable: boolean;
}

interface FilterSidebarProps {
  properties: Property[];
  filters: Record<string, any>;
  onFilterChange: (filters: Record<string, any>) => void;
  priceRange?: { min: number; max: number };
}

export function FilterSidebar({
  properties,
  filters,
  onFilterChange,
  priceRange,
}: FilterSidebarProps) {
  const [localPriceRange, setLocalPriceRange] = useState<[number, number]>([
    priceRange?.min || 0,
    priceRange?.max || 100000,
  ]);

  const filterableProperties = properties.filter((p) => p.is_filterable);

  const handleCheckboxChange = (propertyCode: string, value: string, checked: boolean) => {
    const current = filters[propertyCode] || [];
    const updated = checked
      ? [...current, value]
      : current.filter((v: string) => v !== value);
    
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
        {filterableProperties.map((property) => (
          <AccordionItem key={property.id} value={property.id}>
            <AccordionTrigger className="text-sm font-medium">
              {property.name}
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pt-2">
                {property.property_type === "select" ||
                property.property_type === "multiselect" ? (
                  // Options-based filter
                  (property.options || []).map((option) => (
                    <div key={option} className="flex items-center gap-2">
                      <Checkbox
                        id={`${property.code}-${option}`}
                        checked={(filters[property.code] || []).includes(option)}
                        onCheckedChange={(checked) =>
                          handleCheckboxChange(property.code, option, !!checked)
                        }
                      />
                      <Label
                        htmlFor={`${property.code}-${option}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {option}
                      </Label>
                    </div>
                  ))
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
                  (property.options || []).map((option) => (
                    <div key={option} className="flex items-center gap-2">
                      <Checkbox
                        id={`${property.code}-${option}`}
                        checked={(filters[property.code] || []).includes(option)}
                        onCheckedChange={(checked) =>
                          handleCheckboxChange(property.code, option, !!checked)
                        }
                      />
                      <div
                        className="w-4 h-4 rounded-full border"
                        style={{ backgroundColor: option }}
                      />
                      <Label
                        htmlFor={`${property.code}-${option}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {option}
                      </Label>
                    </div>
                  ))
                ) : null}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
