import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function BannerSlider() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { data: banners } = useQuery({
    queryKey: ["beauty-banners"],
    queryFn: async () => {
      const { data } = await supabase
        .from("banners")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      return data || [];
    },
  });

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();

    // Auto-scroll
    const interval = setInterval(() => {
      if (emblaApi.canScrollNext()) emblaApi.scrollNext();
      else emblaApi.scrollTo(0);
    }, 5000);

    return () => {
      clearInterval(interval);
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  if (!banners?.length) return null;

  return (
    <div className="relative group">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {banners.map((banner) => (
            <div key={banner.id} className="flex-[0_0_100%] min-w-0 relative">
              {banner.link_url ? (
                <Link to={banner.link_url}>
                  <BannerContent banner={banner} />
                </Link>
              ) : (
                <BannerContent banner={banner} />
              )}
            </div>
          ))}
        </div>
      </div>

      {banners.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/60 hover:bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
            onClick={() => emblaApi?.scrollPrev()}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/60 hover:bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
            onClick={() => emblaApi?.scrollNext()}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {banners.map((_, i) => (
              <button
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i === selectedIndex ? "w-6 bg-primary" : "w-2 bg-foreground/30"
                }`}
                onClick={() => emblaApi?.scrollTo(i)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function BannerContent({ banner }: { banner: { image_url: string; title: string; subtitle?: string | null; button_text?: string | null } }) {
  return (
    <div className="relative aspect-[21/9] md:aspect-[3/1] bg-muted overflow-hidden">
      <img
        src={banner.image_url}
        alt={banner.title}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent flex items-center">
        <div className="container mx-auto px-4">
          <div className="max-w-lg text-white">
            <h2 className="text-2xl md:text-4xl font-serif font-bold mb-2">{banner.title}</h2>
            {banner.subtitle && (
              <p className="text-sm md:text-base opacity-90 mb-4">{banner.subtitle}</p>
            )}
            {banner.button_text && (
              <span className="inline-block bg-primary text-primary-foreground px-6 py-2 rounded text-sm font-medium">
                {banner.button_text}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
