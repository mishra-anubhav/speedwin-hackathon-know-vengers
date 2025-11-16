import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Volume2, Image, Trash2 } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import type { Database } from "@/integrations/supabase/types";

type Podcast = Database["public"]["Tables"]["podcasts"]["Row"];

interface PodcastCarouselProps {
  podcasts: Podcast[];
  onPlay: (podcast: Podcast) => void;
  onDelete: (id: string) => void;
  onGenerateAudio: (podcast: Podcast) => void;
  onGenerateThumbnail: (podcast: Podcast) => void;
}

export const PodcastCarousel = ({
  podcasts,
  onPlay,
  onDelete,
  onGenerateAudio,
  onGenerateThumbnail,
}: PodcastCarouselProps) => {
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);

  return (
    <Carousel
      opts={{
        align: "start",
        loop: true,
      }}
      plugins={[
        Autoplay({
          delay: 4000,
          stopOnInteraction: true,
        }),
      ]}
      className="w-full"
    >
      <CarouselContent className="-ml-4">
        {podcasts.map((podcast) => (
          <CarouselItem
            key={podcast.id}
            className="pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4"
          >
            <Card
              className="group relative overflow-hidden bg-gradient-card border-border transition-all duration-300 hover:scale-105 hover:shadow-glow cursor-pointer animate-fade-in"
              onMouseEnter={() => setHoveredId(podcast.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onPlay(podcast)}
            >
              {/* Thumbnail Section */}
              <div className="aspect-video relative overflow-hidden bg-muted">
                {podcast.thumbnail_url ? (
                  <img
                    src={podcast.thumbnail_url}
                    alt={podcast.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                    <Play className="w-16 h-16 text-primary/40 animate-pulse" />
                  </div>
                )}

                {/* Hover Overlay */}
                {hoveredId === podcast.id && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-3 transition-all animate-fade-in">
                    <Button
                      size="icon"
                      className="bg-primary hover:bg-primary/90 text-white rounded-full w-14 h-14 hover-scale shadow-glow"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlay(podcast);
                      }}
                    >
                      <Play className="w-6 h-6" />
                    </Button>
                    {!podcast.audio_url && (
                      <Button
                        size="icon"
                        className="bg-accent hover:bg-accent/90 text-white rounded-full w-10 h-10 hover-scale"
                        onClick={(e) => {
                          e.stopPropagation();
                          onGenerateAudio(podcast);
                        }}
                        title="Generate Audio"
                      >
                        <Volume2 className="w-5 h-5" />
                      </Button>
                    )}
                    {!podcast.thumbnail_url && (
                      <Button
                        size="icon"
                        className="bg-secondary hover:bg-secondary/90 text-white rounded-full w-10 h-10 hover-scale"
                        onClick={(e) => {
                          e.stopPropagation();
                          onGenerateThumbnail(podcast);
                        }}
                        title="Generate Thumbnail"
                      >
                        <Image className="w-5 h-5" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="destructive"
                      className="rounded-full w-10 h-10 hover-scale"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(podcast.id);
                      }}
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                )}

                {/* Status Badge */}
                {podcast.audio_url && (
                  <div className="absolute top-2 right-2 bg-primary/90 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                    Ready
                  </div>
                )}
              </div>

              {/* Content Section */}
              <div className="p-4 bg-card">
                <h3 className="font-semibold text-foreground line-clamp-1 mb-1 group-hover:text-primary transition-colors">
                  {podcast.title}
                </h3>
                {podcast.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {podcast.description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{podcast.duration}</span>
                  <span className="text-xs text-primary font-medium">{podcast.topic}</span>
                </div>
              </div>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
      
      {/* Navigation Buttons */}
      <div className="flex justify-center gap-2 mt-6">
        <CarouselPrevious className="static translate-y-0 hover:bg-primary hover:text-white" />
        <CarouselNext className="static translate-y-0 hover:bg-primary hover:text-white" />
      </div>
    </Carousel>
  );
};
