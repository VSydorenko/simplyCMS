import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { Tables } from "@/integrations/supabase/types";

type SectionProperty = Tables<"section_properties">;
type PropertyValue = Tables<"product_property_values">;

interface Props {
  productId: string;
  sectionId: string | null;
}

export function ProductPropertyValues({ productId, sectionId }: Props) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, { value: string | null; numeric_value: number | null }>>({});

  const { data: properties, isLoading: loadingProperties } = useQuery({
    queryKey: ["section-properties", sectionId],
    queryFn: async () => {
      if (!sectionId) return [];
      const { data, error } = await supabase
        .from("section_properties")
        .select("*")
        .eq("section_id", sectionId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!sectionId,
  });

  const { data: existingValues, isLoading: loadingValues } = useQuery({
    queryKey: ["product-property-values", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_property_values")
        .select("*")
        .eq("product_id", productId);
      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });

  useEffect(() => {
    if (existingValues) {
      const valuesMap: Record<string, { value: string | null; numeric_value: number | null }> = {};
      existingValues.forEach((v) => {
        valuesMap[v.property_id] = { value: v.value, numeric_value: v.numeric_value };
      });
      setValues(valuesMap);
    }
  }, [existingValues]);

  const saveMutation = useMutation({
    mutationFn: async ({ propertyId, value, numericValue }: { propertyId: string; value: string | null; numericValue: number | null }) => {
      const existingValue = existingValues?.find(v => v.property_id === propertyId);
      
      if (existingValue) {
        const { error } = await supabase
          .from("product_property_values")
          .update({ value, numeric_value: numericValue })
          .eq("id", existingValue.id);
        if (error) throw error;
      } else if (value || numericValue !== null) {
        const { error } = await supabase
          .from("product_property_values")
          .insert([{ product_id: productId, property_id: propertyId, value, numeric_value: numericValue }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-property-values", productId] });
    },
  });

  const handleChange = (propertyId: string, value: string | null, numericValue: number | null = null) => {
    setValues(prev => ({
      ...prev,
      [propertyId]: { value, numeric_value: numericValue }
    }));
    saveMutation.mutate({ propertyId, value, numericValue });
  };

  const handleMultiselectChange = (propertyId: string, option: string, checked: boolean) => {
    const current = values[propertyId]?.value || "";
    const currentOptions = current ? current.split(",").map(s => s.trim()) : [];
    
    let newOptions: string[];
    if (checked) {
      newOptions = [...currentOptions, option];
    } else {
      newOptions = currentOptions.filter(o => o !== option);
    }
    
    const newValue = newOptions.join(", ");
    handleChange(propertyId, newValue || null);
  };

  if (!sectionId) {
    return (
      <div className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg">
        Оберіть розділ, щоб налаштувати властивості товару
      </div>
    );
  }

  if (loadingProperties || loadingValues) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!properties || properties.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg">
        Для цього розділу ще не налаштовані властивості
      </div>
    );
  }

  const renderPropertyInput = (property: SectionProperty) => {
    const currentValue = values[property.id];
    const options = property.options as string[] | null;

    switch (property.property_type) {
      case "text":
        return (
          <Input
            value={currentValue?.value || ""}
            onChange={(e) => handleChange(property.id, e.target.value || null)}
            placeholder={`Введіть ${property.name.toLowerCase()}`}
          />
        );

      case "number":
      case "range":
        return (
          <Input
            type="number"
            value={currentValue?.numeric_value ?? ""}
            onChange={(e) => {
              const num = e.target.value ? parseFloat(e.target.value) : null;
              handleChange(property.id, num?.toString() || null, num);
            }}
            placeholder="0"
          />
        );

      case "select":
        return (
          <Select
            value={currentValue?.value || ""}
            onValueChange={(val) => handleChange(property.id, val || null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Оберіть значення" />
            </SelectTrigger>
            <SelectContent>
              {options?.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "multiselect":
        const selectedOptions = currentValue?.value?.split(",").map(s => s.trim()) || [];
        return (
          <div className="space-y-2">
            {options?.map((opt) => (
              <div key={opt} className="flex items-center gap-2">
                <Checkbox
                  id={`${property.id}-${opt}`}
                  checked={selectedOptions.includes(opt)}
                  onCheckedChange={(checked) => handleMultiselectChange(property.id, opt, !!checked)}
                />
                <Label htmlFor={`${property.id}-${opt}`} className="font-normal">
                  {opt}
                </Label>
              </div>
            ))}
          </div>
        );

      case "boolean":
        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={currentValue?.value === "true"}
              onCheckedChange={(checked) => handleChange(property.id, checked ? "true" : "false")}
            />
            <span className="text-sm text-muted-foreground">
              {currentValue?.value === "true" ? "Так" : "Ні"}
            </span>
          </div>
        );

      case "color":
        return (
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={currentValue?.value || "#000000"}
              onChange={(e) => handleChange(property.id, e.target.value)}
              className="h-10 w-20 rounded border cursor-pointer"
            />
            <Input
              value={currentValue?.value || ""}
              onChange={(e) => handleChange(property.id, e.target.value || null)}
              placeholder="#000000"
              className="w-32"
            />
          </div>
        );

      default:
        return (
          <Input
            value={currentValue?.value || ""}
            onChange={(e) => handleChange(property.id, e.target.value || null)}
          />
        );
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Властивості товару</h3>
      <div className="grid gap-4">
        {properties.map((property) => (
          <div key={property.id} className="space-y-2">
            <Label>
              {property.name}
              {property.is_required && <span className="text-destructive ml-1">*</span>}
            </Label>
            {renderPropertyInput(property)}
          </div>
        ))}
      </div>
    </div>
  );
}
