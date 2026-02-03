import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, Trash2, MapPin, Globe, Building2, Map } from "lucide-react";
import { Location, LocationType } from "@/lib/shipping/types";

const locationTypeLabels: Record<LocationType, string> = {
  country: "Країна",
  region: "Область/регіон",
  city: "Місто",
  district: "Район",
  street: "Вулиця",
};

const locationTypeIcons: Record<LocationType, React.ComponentType<{ className?: string }>> = {
  country: Globe,
  region: Map,
  city: Building2,
  district: MapPin,
  street: MapPin,
};

export default function Locations() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newLocation, setNewLocation] = useState({
    name: "",
    type: "city" as LocationType,
    code: "",
    parent_id: "",
  });

  const { data: locations, isLoading } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as unknown as Location[];
    },
  });

  // Build hierarchy
  const buildTree = (items: Location[], parentId: string | null = null, level = 0): Location[] => {
    const result: Location[] = [];
    for (const item of items.filter((i) => i.parent_id === parentId)) {
      result.push({ ...item, level });
      result.push(...buildTree(items, item.id, level + 1));
    }
    return result;
  };

  const flatLocations = locations ? buildTree(locations) : [];

  const addLocation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("locations").insert([{
        name: newLocation.name,
        type: newLocation.type,
        code: newLocation.code || null,
        parent_id: newLocation.parent_id || null,
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      setDialogOpen(false);
      setNewLocation({ name: "", type: "city", code: "", parent_id: "" });
      toast.success("Локацію додано");
    },
    onError: () => {
      toast.error("Помилка додавання локації");
    },
  });

  const deleteLocation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("locations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      toast.success("Локацію видалено");
    },
    onError: () => {
      toast.error("Помилка видалення локації");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Локації</h1>
          <p className="text-muted-foreground mt-1">
            Ієрархічний довідник країн, областей та міст
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Додати локацію
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Нова локація</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Назва</label>
                <Input
                  value={newLocation.name}
                  onChange={(e) =>
                    setNewLocation({ ...newLocation, name: e.target.value })
                  }
                  placeholder="Київ"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Тип</label>
                <Select
                  value={newLocation.type}
                  onValueChange={(v) =>
                    setNewLocation({ ...newLocation, type: v as LocationType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(locationTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Код (опціонально)</label>
                <Input
                  value={newLocation.code}
                  onChange={(e) =>
                    setNewLocation({ ...newLocation, code: e.target.value })
                  }
                  placeholder="UA-32"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Батьківська локація</label>
                <Select
                  value={newLocation.parent_id}
                  onValueChange={(v) =>
                    setNewLocation({ ...newLocation, parent_id: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Без батька (коренева)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Без батька (коренева)</SelectItem>
                    {locations?.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name} ({locationTypeLabels[loc.type]})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                onClick={() => addLocation.mutate()}
                disabled={!newLocation.name || addLocation.isPending}
              >
                Додати
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Всі локації</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Завантаження...
            </div>
          ) : !flatLocations.length ? (
            <div className="text-center py-8 text-muted-foreground">
              Локації не знайдено. Додайте першу локацію.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Назва</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Код</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flatLocations.map((location) => {
                  const IconComponent = locationTypeIcons[location.type];
                  return (
                    <TableRow key={location.id}>
                      <TableCell>
                        <div
                          className="flex items-center gap-2"
                          style={{ paddingLeft: `${(location.level || 0) * 24}px` }}
                        >
                          <IconComponent className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{location.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {locationTypeLabels[location.type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {location.code ? (
                          <code className="text-sm bg-muted px-2 py-1 rounded">
                            {location.code}
                          </code>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Видалити цю локацію та всі дочірні?")) {
                              deleteLocation.mutate(location.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
