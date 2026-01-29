import { UseFormReturn } from "react-hook-form";
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
import { Truck, Building, MapPin } from "lucide-react";

interface CheckoutDeliveryFormProps {
  form: UseFormReturn<any>;
}

const deliveryMethods = [
  {
    id: "pickup",
    name: "Самовивіз",
    description: "Безкоштовно",
    icon: Building,
  },
  {
    id: "nova_poshta",
    name: "Нова Пошта",
    description: "За тарифами перевізника",
    icon: Truck,
  },
  {
    id: "courier",
    name: "Кур'єр",
    description: "Доставка по місту",
    icon: MapPin,
  },
];

export function CheckoutDeliveryForm({ form }: CheckoutDeliveryFormProps) {
  const selectedMethod = form.watch("deliveryMethod");
  const showAddressFields = selectedMethod === "nova_poshta" || selectedMethod === "courier";

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
          name="deliveryMethod"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="grid gap-3"
                >
                  {deliveryMethods.map((method) => (
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
                        <method.icon className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="font-medium">{method.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {method.description}
                          </div>
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                  <FormLabel>
                    {selectedMethod === "nova_poshta"
                      ? "Номер відділення *"
                      : "Адреса доставки *"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        selectedMethod === "nova_poshta"
                          ? "Відділення №1"
                          : "вул. Хрещатик, 1, кв. 10"
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
