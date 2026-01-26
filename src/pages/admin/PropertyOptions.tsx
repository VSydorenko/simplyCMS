import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2, ArrowLeft, FileText, GripVertical } from "lucide-react";

interface PropertyOption {
  id: string;
  property_id: string;
  name: string;
  slug: string;
  sort_order: number;
  created_at: string;
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9а-яіїєґ\s-]/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export default function PropertyOptions() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<PropertyOption | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [sortOrder, setSortOrder] = useState(0);

  // Fetch property info
  const { data: property } = useQuery({
    queryKey: ["section-property", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("section_properties")
        .select("*, sections(id, name)")
        .eq("id", propertyId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!propertyId,
  });

  // Fetch options
  const { data: options, isLoading } = useQuery({
    queryKey: ["property-options", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_options")
        .select("*")
        .eq("property_id", propertyId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as PropertyOption[];
    },
    enabled: !!propertyId,
  });

  // Check which options have pages
  const { data: optionPages } = useQuery({
    queryKey: ["property-pages-by-options", propertyId],
    queryFn: async () => {
      if (!options?.length) return {};
      const optionIds = options.map(o => o.id);
      const { data, error } = await supabase
        .from("property_pages")
        .select("id, option_id")
        .in("option_id", optionIds);
      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach(p => {
        if (p.option_id) map[p.option_id] = p.id;
      });
      return map;
    },
    enabled: !!options?.length,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; slug: string; sort_order: number }) => {
      const { error } = await supabase
        .from("property_options")
        .insert([{ ...data, property_id: propertyId }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property-options", propertyId] });
      closeDialog();
      toast({ title: "Опцію створено" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Помилка", description: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PropertyOption> }) => {
      const { error } = await supabase
        .from("property_options")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property-options", propertyId] });
      closeDialog();
      toast({ title: "Опцію оновлено" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Помилка", description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("property_options")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property-options", propertyId] });
      toast({ title: "Опцію видалено" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Помилка", description: error.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name,
      slug: slug || generateSlug(name),
      sort_order: sortOrder,
    };

    if (editingOption) {
      updateMutation.mutate({ id: editingOption.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openCreate = () => {
    setEditingOption(null);
    setName("");
    setSlug("");
    setSortOrder(options?.length || 0);
    setIsDialogOpen(true);
  };

  const openEdit = (option: PropertyOption) => {
    setEditingOption(option);
    setName(option.name);
    setSlug(option.slug);
    setSortOrder(option.sort_order);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingOption(null);
    setName("");
    setSlug("");
    setSortOrder(0);
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!editingOption) {
      setSlug(generateSlug(value));
    }
  };

  const sectionId = (property?.sections as any)?.id;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(sectionId ? `/admin/sections/${sectionId}/properties` : "/admin/sections")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Опції властивості</h1>
          <p className="text-muted-foreground">
            {property?.name} • {(property?.sections as any)?.name}
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Додати опцію
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Список опцій</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Назва</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Сторінка</TableHead>
                <TableHead className="text-right">Дії</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {options?.map((option) => (
                <TableRow key={option.id}>
                  <TableCell>
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                  <TableCell className="font-medium">{option.name}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-sm">
                    {option.slug}
                  </TableCell>
                  <TableCell>
                    {optionPages?.[option.id] ? (
                      <Link to={`/admin/property-pages/${optionPages[option.id]}`}>
                        <Button variant="ghost" size="sm" className="h-8 gap-1">
                          <FileText className="h-3 w-3" />
                          Редагувати
                        </Button>
                      </Link>
                    ) : (
                      <Link to={`/admin/property-pages/new?optionId=${option.id}`}>
                        <Button variant="outline" size="sm" className="h-8 gap-1">
                          <Plus className="h-3 w-3" />
                          Створити
                        </Button>
                      </Link>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(option)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(option.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {options?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Опцій ще немає. Додайте першу опцію.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingOption ? "Редагувати опцію" : "Нова опція"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Назва</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Samsung"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug (URL)</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="samsung"
              />
              <p className="text-xs text-muted-foreground">
                Залиште порожнім для автоматичної генерації
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sort_order">Порядок сортування</Label>
              <Input
                id="sort_order"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Скасувати
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingOption ? "Зберегти" : "Створити"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
