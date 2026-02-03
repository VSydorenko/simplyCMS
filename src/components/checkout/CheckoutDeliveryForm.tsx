import { useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Truck, Building, MapPin, icons } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ShippingMethod, ShippingRate, PickupPoint } from "@/lib/shipping/types";
import { formatShippingCost } from "@/lib/shipping";
import { PluginSlot } from "@/components/plugins/PluginSlot";

interface CheckoutDeliveryFormProps {
  form: UseFormReturn<any>;
  subtotal: number;
  onShippingCostChange: (cost: number) => void;
}

const getMethodIcon = (iconName: string | null): React.ComponentType<{ className?: string }> => {
  if (!iconName) return Truck;
  const Icon = icons[iconName as keyof typeof icons];
  return Icon || Truck;
};

export function CheckoutDeliveryForm({ form, subtotal, onShippingCostChange }: CheckoutDeliveryFormProps) {
  const selectedMethodId = form.watch("shippingMethodId");
  const selectedPickupPointId = form.watch("pickupPointId");

  // Fetch active shipping methods
  const { data: methods, isLoading: methodsLoading } = useQuery({
    queryKey: ["checkout-shipping-methods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipping_methods")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as unknown as ShippingMethod[];
    },
  });

  // Fetch rates for default zone (simplified - no zone detection for now)
  const { data: rates } = useQuery({
    queryKey: ["checkout-shipping-rates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipping_rates")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as unknown as ShippingRate[];
    },
  });

  // Fetch pickup points
  const { data: pickupPoints } = useQuery({
    queryKey: ["checkout-pickup-points"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pickup_points")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as unknown as PickupPoint[];
    },
  });

  const selectedMethod = methods?.find((m) => m.id === selectedMethodId);
  const isPickup = selectedMethod?.code === "pickup";
  const showAddressFields = selectedMethod && !isPickup;

  // Calculate shipping cost when method changes
  useEffect(() => {
    if (!selectedMethodId || !rates) {
      onShippingCostChange(0);
      return;
    }

    // Find rate for selected method (from default zone)
    const methodRates = rates.filter((r) => r.method_id === selectedMethodId);
    if (methodRates.length === 0) {
      onShippingCostChange(0);
      return;
    }

    // Use first applicable rate
    const rate = methodRates[0];
    let cost = rate.base_cost;

    // Apply calculation logic
    switch (rate.calculation_type) {
      case "flat":
        cost = rate.base_cost;
        break;
      case "free_from":
        if (rate.free_from_amount && subtotal >= rate.free_from_amount) {
          cost = 0;
        } else {
          cost = rate.base_cost;
        }
        break;
      // weight and order_total would need additional data
      default:
        cost = rate.base_cost;
    }

    onShippingCostChange(cost);
  }, [selectedMethodId, rates, subtotal, onShippingCostChange]);

  // Set default method when loaded
  useEffect(() => {
    if (methods && methods.length > 0 && !selectedMethodId) {
      form.setValue("shippingMethodId", methods[0].id);
    }
  }, [methods, selectedMethodId, form]);

  // Get rate info for display
  const getRateInfo = (methodId: string) => {
    if (!rates) return null;
    const methodRates = rates.filter((r) => r.method_id === methodId);
    if (methodRates.length === 0) return null;
    const rate = methodRates[0];
    
    let displayCost = rate.base_cost;
    if (rate.calculation_type === "free_from" && rate.free_from_amount && subtotal >= rate.free_from_amount) {
      displayCost = 0;
    }
    
    return {
      cost: displayCost,
      estimatedDays: rate.estimated_days,
    };
  };

  if (methodsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Спосіб доставки
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Спосіб доставки
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="shippingMethodId"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  value={field.value}
                  className="grid gap-3"
                >
                  {methods?.map((method) => {
                    const IconComponent = getMethodIcon(method.icon);
                    const rateInfo = getRateInfo(method.id);
                    
                    return (
                      <div key={method.id}>
                        <RadioGroupItem
                          value={method.id}
                          id={method.id}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={method.id}
                          className="flex items-center gap-4 rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-colors"
                        >
                          <IconComponent className="h-5 w-5 text-muted-foreground" />
                          <div className="flex-1">
                            <div className="font-medium">{method.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {method.description}
                            </div>
                            {rateInfo?.estimatedDays && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {rateInfo.estimatedDays}
                              </div>
                            )}
                          </div>
                          <div className="font-medium text-right">
                            {rateInfo ? formatShippingCost(rateInfo.cost) : "—"}
                          </div>
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Plugin slot for additional shipping options */}
        <PluginSlot 
          name="checkout.shipping.methods" 
          context={{ 
            cart: { subtotal },
            selectedMethodId,
          }} 
        />

        {/* Pickup points selector */}
        {isPickup && pickupPoints && pickupPoints.length > 0 && (
          <div className="pt-4 border-t">
            <FormField
              control={form.control}
              name="pickupPointId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Оберіть пункт самовивозу *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Оберіть пункт" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {pickupPoints.map((point) => (
                        <SelectItem key={point.id} value={point.id}>
                          <div>
                            <div className="font-medium">{point.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {point.city}, {point.address}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Address fields for delivery */}
        {showAddressFields && (
          <div className="space-y-4 pt-4 border-t">
            <FormField
              control={form.control}
              name="deliveryCity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Місто *</FormLabel>
                  <FormControl>
                    <Input placeholder="Введіть місто" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deliveryAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Адреса доставки *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="вул. Хрещатик, 1, кв. 10"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Plugin slot for additional form fields */}
        <PluginSlot 
          name="checkout.shipping.form" 
          context={{ 
            method: selectedMethod,
            form,
          }} 
        />
      </CardContent>
    </Card>
  );
}
