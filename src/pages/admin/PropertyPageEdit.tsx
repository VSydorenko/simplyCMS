import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { RichTextEditor } from "@/components/admin/RichTextEditor";

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9а-яіїєґ\s-]/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export default function PropertyPageEdit() {
  const { pageId } = useParams();
  const [searchParams] = useSearchParams();
  const optionIdFromQuery = searchParams.get("optionId");
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const isNew = pageId === "new";

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    image_url: "",
    meta_title: "",
    meta_description: "",
    option_id: optionIdFromQuery || "",
  });

  // Fetch existing page
  const { data: page, isLoading: pageLoading } = useQuery({
    queryKey: ["property-page", pageId],
    queryFn: async () => {
      if (isNew) return null;
      const { data, error } = await supabase
        .from("property_pages")
        .select("*")
        .eq("id", pageId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !isNew && !!pageId,
  });

  // Fetch option info for new pages
  const { data: option } = useQuery({
    queryKey: ["property-option", formData.option_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_options")
        .select("*, section_properties(id, name, code, sections(id, name))")
        .eq("id", formData.option_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!formData.option_id,
  });

  // Set form data when page loads
  useEffect(() => {
    if (page) {
      setFormData({
        name: page.name || "",
        slug: page.slug || "",
        description: page.description || "",
        image_url: page.image_url || "",
        meta_title: page.meta_title || "",
        meta_description: page.meta_description || "",
        option_id: page.option_id || "",
      });
    }
  }, [page]);

  // Auto-fill name and slug from option for new pages
  useEffect(() => {
    if (isNew && option && !formData.name) {
      setFormData(prev => ({
        ...prev,
        name: option.name,
        slug: option.slug,
      }));
    }
  }, [isNew, option, formData.name]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (isNew) {
        const { data: newPage, error } = await supabase
          .from("property_pages")
          .insert([{
            name: data.name,
            slug: data.slug || generateSlug(data.name),
            description: data.description || null,
            image_url: data.image_url || null,
            meta_title: data.meta_title || null,
            meta_description: data.meta_description || null,
            option_id: data.option_id,
          }])
          .select()
          .single();
        if (error) throw error;
        return newPage;
      } else {
        const { error } = await supabase
          .from("property_pages")
          .update({
            name: data.name,
            slug: data.slug,
            description: data.description || null,
            image_url: data.image_url || null,
            meta_title: data.meta_title || null,
            meta_description: data.meta_description || null,
          })
          .eq("id", pageId!);
        if (error) throw error;
        return { id: pageId };
      }
    },
    onSuccess: (newPage) => {
      queryClient.invalidateQueries({ queryKey: ["property-page"] });
      queryClient.invalidateQueries({ queryKey: ["property-pages-by-options"] });
      toast({ title: isNew ? "Сторінку створено" : "Сторінку збережено" });
      
      if (isNew && newPage?.id) {
        navigate(`/admin/property-pages/${newPage.id}`, { replace: true });
      }
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Помилка", description: error.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNameChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      name: value,
      slug: isNew ? generateSlug(value) : prev.slug,
    }));
  };

  // Navigate back to options page
  const goBack = () => {
    const propertyId = option?.section_properties?.id || page?.property_id;
    if (propertyId) {
      navigate(`/admin/properties/${propertyId}/options`);
    } else {
      navigate(-1);
    }
  };

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const propertyInfo = option?.section_properties as any;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={goBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {isNew ? "Нова сторінка опції" : "Редагування сторінки"}
          </h1>
          {option && (
            <p className="text-muted-foreground">
              {option.name} • {propertyInfo?.name} • {propertyInfo?.sections?.name}
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Основна інформація</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Назва сторінки</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Samsung"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL)</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => handleChange("slug", e.target.value)}
                  placeholder="samsung"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Зображення</Label>
              <ImageUpload
                images={formData.image_url ? [formData.image_url] : []}
                onImagesChange={(urls) => handleChange("image_url", urls[0] || "")}
                maxImages={1}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Опис</Label>
              <RichTextEditor
                content={formData.description}
                onChange={(value) => handleChange("description", value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SEO</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="meta_title">Meta Title</Label>
              <Input
                id="meta_title"
                value={formData.meta_title}
                onChange={(e) => handleChange("meta_title", e.target.value)}
                placeholder="Назва для пошукових систем"
              />
              <p className="text-xs text-muted-foreground">
                {formData.meta_title.length}/60 символів
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meta_description">Meta Description</Label>
              <Textarea
                id="meta_description"
                value={formData.meta_description}
                onChange={(e) => handleChange("meta_description", e.target.value)}
                placeholder="Опис для пошукових систем"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {formData.meta_description.length}/160 символів
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={goBack}>
            Скасувати
          </Button>
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            <Save className="h-4 w-4 mr-2" />
            Зберегти
          </Button>
        </div>
      </form>
    </div>
  );
}
