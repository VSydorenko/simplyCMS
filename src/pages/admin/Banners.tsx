import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, GripVertical, Image, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  button_text: string | null;
  sort_order: number;
  is_active: boolean;
}

export default function Banners() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingBanner, setEditingBanner] = useState<Partial<Banner> | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: banners, isLoading } = useQuery({
    queryKey: ["admin-banners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as Banner[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (banner: Partial<Banner>) => {
      if (banner.id) {
        const { error } = await supabase
          .from("banners")
          .update({
            title: banner.title,
            subtitle: banner.subtitle,
            image_url: banner.image_url,
            link_url: banner.link_url,
            button_text: banner.button_text,
            is_active: banner.is_active,
            sort_order: banner.sort_order,
          })
          .eq("id", banner.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("banners").insert({
          title: banner.title!,
          image_url: banner.image_url!,
          subtitle: banner.subtitle,
          link_url: banner.link_url,
          button_text: banner.button_text,
          sort_order: banner.sort_order || 0,
          is_active: banner.is_active ?? true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
      toast({ title: "Банер збережено" });
      setDialogOpen(false);
      setEditingBanner(null);
    },
    onError: () => {
      toast({ variant: "destructive", title: "Помилка збереження" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("banners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
      toast({ title: "Банер видалено" });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("banners").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-banners"] });
    },
  });

  const openNew = () => {
    setEditingBanner({ title: "", image_url: "", sort_order: (banners?.length || 0) + 1 });
    setDialogOpen(true);
  };

  const openEdit = (b: Banner) => {
    setEditingBanner({ ...b });
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Банери</h1>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" /> Додати банер
        </Button>
      </div>

      {!banners?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Image className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Банерів поки немає</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {banners.map((b) => (
            <Card key={b.id} className="overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                <GripVertical className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="h-16 w-28 rounded bg-muted overflow-hidden shrink-0">
                  <img src={b.image_url} alt={b.title} className="h-full w-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{b.title}</p>
                  {b.subtitle && <p className="text-xs text-muted-foreground truncate">{b.subtitle}</p>}
                </div>
                <Switch
                  checked={b.is_active}
                  onCheckedChange={(checked) => toggleActive.mutate({ id: b.id, is_active: checked })}
                />
                <Button variant="ghost" size="sm" onClick={() => openEdit(b)}>
                  Редагувати
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => deleteMutation.mutate(b.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBanner?.id ? "Редагувати банер" : "Новий банер"}</DialogTitle>
          </DialogHeader>
          {editingBanner && (
            <div className="space-y-4">
              <div>
                <Label>Заголовок *</Label>
                <Input
                  value={editingBanner.title || ""}
                  onChange={(e) => setEditingBanner({ ...editingBanner, title: e.target.value })}
                />
              </div>
              <div>
                <Label>Підзаголовок</Label>
                <Input
                  value={editingBanner.subtitle || ""}
                  onChange={(e) => setEditingBanner({ ...editingBanner, subtitle: e.target.value })}
                />
              </div>
              <div>
                <Label>URL зображення *</Label>
                <Input
                  value={editingBanner.image_url || ""}
                  onChange={(e) => setEditingBanner({ ...editingBanner, image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label>Посилання (URL)</Label>
                <Input
                  value={editingBanner.link_url || ""}
                  onChange={(e) => setEditingBanner({ ...editingBanner, link_url: e.target.value })}
                />
              </div>
              <div>
                <Label>Текст кнопки</Label>
                <Input
                  value={editingBanner.button_text || ""}
                  onChange={(e) => setEditingBanner({ ...editingBanner, button_text: e.target.value })}
                />
              </div>
              <div>
                <Label>Порядок сортування</Label>
                <Input
                  type="number"
                  value={editingBanner.sort_order || 0}
                  onChange={(e) => setEditingBanner({ ...editingBanner, sort_order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <Button
                className="w-full"
                onClick={() => saveMutation.mutate(editingBanner)}
                disabled={!editingBanner.title || !editingBanner.image_url || saveMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" /> Зберегти
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
