import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PropertyValue {
  property_id: string;
  value: string | null;
  numeric_value: number | null;
  property?: {
    id: string;
    name: string;
    code: string;
    property_type: string;
  };
}

interface ProductCharacteristicsProps {
  propertyValues: PropertyValue[];
}

export function ProductCharacteristics({ propertyValues }: ProductCharacteristicsProps) {
  const displayableValues = propertyValues.filter(
    (pv) => pv.property && (pv.value || pv.numeric_value !== null)
  );

  if (displayableValues.length === 0) {
    return null;
  }

  const formatValue = (pv: PropertyValue): string => {
    if (pv.property?.property_type === "boolean") {
      return pv.value === "true" ? "Так" : "Ні";
    }
    if (pv.numeric_value !== null) {
      return String(pv.numeric_value);
    }
    return pv.value || "—";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Характеристики</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="divide-y">
          {displayableValues.map((pv) => (
            <div
              key={pv.property_id}
              className="flex justify-between py-3 first:pt-0 last:pb-0"
            >
              <dt className="text-muted-foreground">{pv.property?.name}</dt>
              <dd className="font-medium text-right">{formatValue(pv)}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
