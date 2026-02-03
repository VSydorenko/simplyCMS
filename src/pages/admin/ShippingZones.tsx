import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Plus, MoreHorizontal, Pencil, Trash2, Globe } from "lucide-react";
import { ShippingZone } from "@/lib/shipping/types";

export default function ShippingZones() {
  const queryClient = useQueryClient();

  const { data: zones, isLoading } = useQuery({
    queryKey: ["shipping-zones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipping_zones")
        .select(`
          *,
          shipping_zone_locations (count),
          shipping_rates (count)
        `)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("shipping_zones")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipping-zones"] });
      toast.success("Статус оновлено");
    },
    onError: () => {
      toast.error("Помилка оновлення статусу");
    },
  });

  const deleteZone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("shipping_zones")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipping-zones"] });
      toast.success("Зону видалено");
    },
    onError: () => {
      toast.error("Помилка видалення зони");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Зони доставки</h1>
          <p className="text-muted-foreground mt-1">
            Географічні зони з різними тарифами доставки
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/shipping/zones/new">
            <Plus className="h-4 w-4 mr-2" />
            Додати зону
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Всі зони доставки</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Завантаження...
            </div>
          ) : !zones?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              Зони доставки не знайдено
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Назва</TableHead>
                  <TableHead className="text-center">Локації</TableHead>
                  <TableHead className="text-center">Тарифи</TableHead>
                  <TableHead className="text-center">Активна</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones.map((zone: any) => (
                  <TableRow key={zone.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            {zone.name}
                            {zone.is_default && (
                              <Badge variant="secondary" className="ml-2">
                                За замовчуванням
                              </Badge>
                            )}
                          </div>
                          {zone.description && (
                            <div className="text-sm text-muted-foreground">
                              {zone.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">
                        {zone.shipping_zone_locations?.[0]?.count || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">
                        {zone.shipping_rates?.[0]?.count || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={zone.is_active}
                        onCheckedChange={(checked) =>
                          toggleActive.mutate({ id: zone.id, is_active: checked })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/admin/shipping/zones/${zone.id}`}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Редагувати
                            </Link>
                          </DropdownMenuItem>
                          {!zone.is_default && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                if (confirm("Видалити цю зону доставки?")) {
                                  deleteZone.mutate(zone.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Видалити
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
