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
  DialogTrigger,
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2, ArrowLeft, GripVertical, Settings } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type SectionProperty = Tables<"section_properties">;

const propertyTypes = [
  { value: "text", label: "Текст" },
  { value: "number", label: "Число" },
  { value: "select", label: "Вибір (один)" },
  { value: "multiselect", label: "Вибір (декілька)" },
  { value: "range", label: "Діапазон" },
  { value: "color", label: "Колір" },
  { value: "boolean", label: "Так/Ні" },
];

export default function SectionProperties() {
  const { sectionId } = useParams();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<SectionProperty | null>(null);
  const [propertyType, setPropertyType] = useState<string>("text");
  const [optionsText, setOptionsText] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: section } = useQuery({
    queryKey: ["section", sectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sections")
        .select("*")
        .eq("id", sectionId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!sectionId,
  });

  const { data: properties, isLoading } = useQuery({
    queryKey: ["section-properties", sectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("section_properties")
        .select("*")
        .eq("section_id", sectionId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!sectionId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<SectionProperty>) => {
      const { error } = await supabase.from("section_properties").insert([data as any]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["section-properties", sectionId] });
      closeDialog();
      toast({ title: "Властивість створено" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Помилка", description: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SectionProperty> }) => {
      const { error } = await supabase.from("section_properties").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["section-properties", sectionId] });
      closeDialog();
      toast({ title: "Властивість оновлено" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Помилка", description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("section_properties").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["section-properties", sectionId] });
      toast({ title: "Властивість видалено" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Помилка", description: error.message });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Parse options for select/multiselect types
    let options = null;
    if (propertyType === "select" || propertyType === "multiselect") {
      const optionsList = optionsText.split("\n").filter(Boolean).map(opt => opt.trim());
      options = optionsList.length > 0 ? optionsList : null;
    }

    const data = {
      section_id: sectionId,
      name: formData.get("name") as string,
      code: formData.get("code") as string,
      property_type: propertyType as any,
      is_required: formData.get("is_required") === "on",
      is_filterable: formData.get("is_filterable") === "on",
      has_page: formData.get("has_page") === "on",
      sort_order: parseInt(formData.get("sort_order") as string) || 0,
      options: options,
    };

    if (editingProperty) {
      updateMutation.mutate({ id: editingProperty.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEdit = (property: SectionProperty) => {
    setEditingProperty(property);
    setPropertyType(property.property_type);
    const opts = property.options as string[] | null;
    setOptionsText(opts?.join("\n") || "");
    setIsOpen(true);
  };

  const closeDialog = () => {
    setIsOpen(false);
    setEditingProperty(null);
    setPropertyType("text");
    setOptionsText("");
  };

  const openCreate = () => {
    setEditingProperty(null);
    setPropertyType("text");
    setOptionsText("");
    setIsOpen(true);
  };

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
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/sections")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Властивості розділу</h1>
          <p className="text-muted-foreground">{section?.name}</p>
        </div>
      </div>

      <div className="flex justify-end">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Додати властивість
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProperty ? "Редагувати властивість" : "Нова властивість"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Назва</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editingProperty?.name || ""}
                    placeholder="Виробник"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Код</Label>
                  <Input
                    id="code"
                    name="code"
                    defaultValue={editingProperty?.code || ""}
                    placeholder="manufacturer"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Тип властивості</Label>
                <Select value={propertyType} onValueChange={setPropertyType}>
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

              {(propertyType === "select" || propertyType === "multiselect") && (
                <div className="space-y-2">
                  <Label htmlFor="options">Варіанти (кожен з нового рядка)</Label>
                  <Textarea
                    id="options"
                    value={optionsText}
                    onChange={(e) => setOptionsText(e.target.value)}
                    rows={4}
                    placeholder="Варіант 1&#10;Варіант 2&#10;Варіант 3"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="sort_order">Порядок сортування</Label>
                <Input
                  id="sort_order"
                  name="sort_order"
                  type="number"
                  defaultValue={editingProperty?.sort_order || 0}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Switch
                    id="is_required"
                    name="is_required"
                    defaultChecked={editingProperty?.is_required ?? false}
                  />
                  <Label htmlFor="is_required">Обов'язкова</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="is_filterable"
                    name="is_filterable"
                    defaultChecked={editingProperty?.is_filterable ?? false}
                  />
                  <Label htmlFor="is_filterable">Показувати у фільтрах</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="has_page"
                    name="has_page"
                    defaultChecked={editingProperty?.has_page ?? false}
                  />
                  <Label htmlFor="has_page">Створювати сторінки для значень</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Скасувати
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingProperty ? "Зберегти" : "Створити"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Властивості</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Назва</TableHead>
                <TableHead>Код</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Фільтр</TableHead>
                <TableHead>Опції</TableHead>
                <TableHead className="text-right">Дії</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {properties?.map((property) => (
                <TableRow key={property.id}>
                  <TableCell>
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                  <TableCell className="font-medium">
                    {property.name}
                    {property.is_required && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-sm">
                    {property.code}
                  </TableCell>
                  <TableCell>
                    {propertyTypes.find(t => t.value === property.property_type)?.label}
                  </TableCell>
                  <TableCell>
                    {property.is_filterable ? (
                      <span className="text-green-600">Так</span>
                    ) : (
                      <span className="text-muted-foreground">Ні</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {(property.property_type === "select" || property.property_type === "multiselect") && (
                      <Link to={`/admin/properties/${property.id}/options`}>
                        <Button variant="outline" size="sm" className="h-7 gap-1">
                          <Settings className="h-3 w-3" />
                          Опції
                        </Button>
                      </Link>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(property)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(property.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {properties?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Властивостей ще немає
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
