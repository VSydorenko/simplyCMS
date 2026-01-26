import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  Plus, 
  Pencil, 
  Trash2, 
  FileText,
  GripVertical 
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type SectionProperty = Tables<"section_properties">;

interface PropertyOption {
  id: string;
  property_id: string;
  name: string;
  slug: string;
  sort_order: number;
  created_at: string;
}

const propertyTypes = [
  { value: "text", label: "Текст" },
  { value: "number", label: "Число" },
  { value: "select", label: "Вибір (один)" },
  { value: "multiselect", label: "Вибір (декілька)" },
  { value: "range", label: "Діапазон" },
  { value: "color", label: "Колір" },
  { value: "boolean", label: "Так/Ні" },
];

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9а-яіїєґ\s-]/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export default function PropertyEdit() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    property_type: "text" as string,
    is_required: false,
    is_filterable: false,
    has_page: false,
    sort_order: 0,
  });

  // Option dialog state
  const [isOptionDialogOpen, setIsOptionDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<PropertyOption | null>(null);
  const [optionName, setOptionName] = useState("");
  const [optionSlug, setOptionSlug] = useState("");
  const [optionSortOrder, setOptionSortOrder] = useState(0);

  // Fetch property
  const { data: property, isLoading: propertyLoading } = useQuery({
    queryKey: ["property", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("section_properties")
        .select("*")
        .eq("id", propertyId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!propertyId,
  });

  // Fetch options
  const { data: options, isLoading: optionsLoading } = useQuery({
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

  // Set form data when property loads
  useEffect(() => {
    if (property) {
      setFormData({
        name: property.name || "",
        code: property.code || "",
        property_type: property.property_type || "text",
        is_required: property.is_required ?? false,
        is_filterable: property.is_filterable ?? false,
        has_page: property.has_page ?? false,
        sort_order: property.sort_order || 0,
      });
    }
  }, [property]);

  // Property mutations
  const updatePropertyMutation = useMutation({
    mutationFn: async (data: Partial<SectionProperty>) => {
      const { error } = await supabase
        .from("section_properties")
        .update(data)
        .eq("id", propertyId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property", propertyId] });
      queryClient.invalidateQueries({ queryKey: ["all-properties"] });
      toast({ title: "Властивість збережено" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Помилка", description: error.message });
    },
  });

  // Option mutations
  const createOptionMutation = useMutation({
    mutationFn: async (data: { name: string; slug: string; sort_order: number }) => {
      const { error } = await supabase
        .from("property_options")
        .insert([{ ...data, property_id: propertyId }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property-options", propertyId] });
      closeOptionDialog();
      toast({ title: "Опцію створено" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Помилка", description: error.message });
    },
  });

  const updateOptionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PropertyOption> }) => {
      const { error } = await supabase
        .from("property_options")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property-options", propertyId] });
      closeOptionDialog();
      toast({ title: "Опцію оновлено" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Помилка", description: error.message });
    },
  });

  const deleteOptionMutation = useMutation({
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
    updatePropertyMutation.mutate({
      ...formData,
      property_type: formData.property_type as SectionProperty["property_type"],
    });
  };

  const handleChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Option dialog handlers
  const openCreateOption = () => {
    setEditingOption(null);
    setOptionName("");
    setOptionSlug("");
    setOptionSortOrder(options?.length || 0);
    setIsOptionDialogOpen(true);
  };

  const openEditOption = (option: PropertyOption) => {
    setEditingOption(option);
    setOptionName(option.name);
    setOptionSlug(option.slug);
    setOptionSortOrder(option.sort_order);
    setIsOptionDialogOpen(true);
  };

  const closeOptionDialog = () => {
    setIsOptionDialogOpen(false);
    setEditingOption(null);
    setOptionName("");
    setOptionSlug("");
    setOptionSortOrder(0);
  };

  const handleOptionNameChange = (value: string) => {
    setOptionName(value);
    if (!editingOption) {
      setOptionSlug(generateSlug(value));
    }
  };

  const handleOptionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: optionName,
      slug: optionSlug || generateSlug(optionName),
      sort_order: optionSortOrder,
    };

    if (editingOption) {
      updateOptionMutation.mutate({ id: editingOption.id, data });
    } else {
      createOptionMutation.mutate(data);
    }
  };

  const showOptions = formData.property_type === "select" || formData.property_type === "multiselect";

  if (propertyLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/properties")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{property?.name || "Властивість"}</h1>
          <p className="text-muted-foreground">Редагування властивості</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Основна інформація</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Назва</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Код</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => handleChange("code", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Тип властивості</Label>
                <Select 
                  value={formData.property_type} 
                  onValueChange={(v) => handleChange("property_type", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {propertyTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sort_order">Порядок сортування</Label>
                <Input
                  id="sort_order"
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => handleChange("sort_order", parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-6 pt-2">
              <div className="flex items-center gap-2">
                <Switch
                  id="is_required"
                  checked={formData.is_required}
                  onCheckedChange={(v) => handleChange("is_required", v)}
                />
                <Label htmlFor="is_required">Обов'язкова</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="is_filterable"
                  checked={formData.is_filterable}
                  onCheckedChange={(v) => handleChange("is_filterable", v)}
                />
                <Label htmlFor="is_filterable">Показувати у фільтрах</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="has_page"
                  checked={formData.has_page}
                  onCheckedChange={(v) => handleChange("has_page", v)}
                />
                <Label htmlFor="has_page">Створювати сторінки для значень</Label>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={updatePropertyMutation.isPending}>
                {updatePropertyMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                <Save className="h-4 w-4 mr-2" />
                Зберегти
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {showOptions && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Опції властивості</CardTitle>
            <Button onClick={openCreateOption} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Додати опцію
            </Button>
          </CardHeader>
          <CardContent>
            {optionsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
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
                          <Button variant="ghost" size="icon" onClick={() => openEditOption(option)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm("Видалити цю опцію?")) {
                                deleteOptionMutation.mutate(option.id);
                              }
                            }}
                            disabled={deleteOptionMutation.isPending}
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
            )}
          </CardContent>
        </Card>
      )}

      {/* Option Dialog */}
      <Dialog open={isOptionDialogOpen} onOpenChange={setIsOptionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingOption ? "Редагувати опцію" : "Нова опція"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleOptionSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="optionName">Назва</Label>
              <Input
                id="optionName"
                value={optionName}
                onChange={(e) => handleOptionNameChange(e.target.value)}
                placeholder="Samsung"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="optionSlug">Slug (URL)</Label>
              <Input
                id="optionSlug"
                value={optionSlug}
                onChange={(e) => setOptionSlug(e.target.value)}
                placeholder="samsung"
              />
              <p className="text-xs text-muted-foreground">
                Залиште порожнім для автоматичної генерації
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="optionSortOrder">Порядок сортування</Label>
              <Input
                id="optionSortOrder"
                type="number"
                value={optionSortOrder}
                onChange={(e) => setOptionSortOrder(parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={closeOptionDialog}>
                Скасувати
              </Button>
              <Button 
                type="submit" 
                disabled={createOptionMutation.isPending || updateOptionMutation.isPending}
              >
                {(createOptionMutation.isPending || updateOptionMutation.isPending) && (
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
