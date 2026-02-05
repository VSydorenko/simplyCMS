import { useEffect } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const categorySchema = z.object({
  name: z.string().min(1, "Назва обов'язкова"),
  code: z
    .string()
    .min(1, "Код обов'язковий")
    .regex(/^[a-z0-9_]+$/, "Тільки латинські літери, цифри та _"),
  description: z.string().optional(),
  price_multiplier: z.coerce.number().min(0.01, "Мінімум 0.01").max(10, "Максимум 10"),
  is_default: z.boolean(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

export default function UserCategoryEdit() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();
  const isNew = location.pathname.endsWith("/new") || !categoryId;

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      price_multiplier: 1,
      is_default: false,
    },
  });

  // Fetch category
  const { data: category, isLoading } = useQuery({
    queryKey: ["user-category", categoryId],
    queryFn: async () => {
      if (isNew || !categoryId) return null;
      const { data, error } = await supabase
        .from("user_categories")
        .select("*")
        .eq("id", categoryId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !isNew && !!categoryId,
  });

  // Fill form when category loads
  useEffect(() => {
    if (category) {
      form.reset({
        name: category.name,
        code: category.code,
        description: category.description || "",
        price_multiplier: category.price_multiplier,
        is_default: category.is_default,
      });
    }
  }, [category, form]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      // If setting as default, unset others first
      if (data.is_default) {
        await supabase
          .from("user_categories")
          .update({ is_default: false })
          .neq("id", categoryId || "");
      }

      if (isNew) {
        const { error } = await supabase.from("user_categories").insert({
          name: data.name,
          code: data.code,
          description: data.description || null,
          price_multiplier: data.price_multiplier,
          is_default: data.is_default,
        });
        if (error) throw error;
      } else {
        if (!categoryId) throw new Error("Category ID is required for update");
        const { error } = await supabase
          .from("user_categories")
          .update(data)
          .eq("id", categoryId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-categories"] });
      toast({ title: isNew ? "Категорію створено" : "Зміни збережено" });
      navigate("/admin/user-categories");
    },
    onError: (error: Error) => {
      toast({
        title: "Помилка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!categoryId) throw new Error("Category ID is required for delete");
      const { error } = await supabase
        .from("user_categories")
        .delete()
        .eq("id", categoryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-categories"] });
      toast({ title: "Категорію видалено" });
      navigate("/admin/user-categories");
    },
    onError: (error: Error) => {
      toast({
        title: "Помилка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!isNew && isLoading) {
    return <div className="p-8 text-center">Завантаження...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin/user-categories">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">
            {isNew ? "Нова категорія" : "Редагування категорії"}
          </h1>
        </div>
        {!isNew && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Видалити категорію?</AlertDialogTitle>
                <AlertDialogDescription>
                  Ця дія незворотна. Користувачі цієї категорії втратять її
                  прив'язку.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Скасувати</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  className="bg-destructive text-destructive-foreground"
                >
                  Видалити
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Інформація про категорію</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))}
              className="space-y-6"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Назва</FormLabel>
                    <FormControl>
                      <Input placeholder="Роздрібний клієнт" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Код</FormLabel>
                    <FormControl>
                      <Input placeholder="retail" {...field} />
                    </FormControl>
                    <FormDescription>
                      Унікальний код для ідентифікації (латиниця, цифри, _)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Опис</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Опис категорії..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price_multiplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Множник ціни</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="10"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      1.00 = звичайна ціна, 0.90 = знижка 10%, 1.10 = надбавка 10%
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_default"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">За замовчуванням</FormLabel>
                      <FormDescription>
                        Нові користувачі автоматично отримують цю категорію
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4">
                <Button variant="outline" asChild>
                  <Link to="/admin/user-categories">Скасувати</Link>
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isNew ? "Створити" : "Зберегти"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
