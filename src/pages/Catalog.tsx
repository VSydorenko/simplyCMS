import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, FolderOpen } from "lucide-react";

export default function Catalog() {
  const { data: sections, isLoading } = useQuery({
    queryKey: ["public-sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sections")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Каталог</h1>
          <p className="text-muted-foreground">Оберіть категорію товарів</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {sections?.map((section) => (
            <Link key={section.id} to={`/catalog/${section.slug}`}>
              <Card className="group h-full overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className="aspect-[4/3] overflow-hidden bg-muted">
                  {section.image_url ? (
                    <img
                      src={section.image_url}
                      alt={section.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FolderOpen className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                    {section.name}
                  </h3>
                  {section.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {section.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {sections?.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Категорій поки немає</p>
          </div>
        )}
      </div>
    </div>
  );
}
