import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Trash2, Volume2 } from "lucide-react";
import { useState } from "react";

interface PodcastCardProps {
  id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  duration: string;
  audio_url?: string;
  onPlay: () => void;
  onDelete: () => void;
  onGenerateAudio: () => void;
}

export const PodcastCard = ({
  title,
  description,
  thumbnail_url,
  duration,
  audio_url,
  onPlay,
  onDelete,
  onGenerateAudio,
}: PodcastCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Card
      className="group relative overflow-hidden bg-gradient-card border-border transition-all duration-300 hover:scale-105 hover:shadow-glow cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onPlay}
    >
      <div className="aspect-video relative overflow-hidden bg-muted">
        {thumbnail_url ? (
          <img
            src={thumbnail_url}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
            <Play className="w-16 h-16 text-primary/40" />
          </div>
        )}
        
        {isHovered && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-4 transition-all">
            <Button
              size="icon"
              className="bg-primary hover:bg-primary/90 text-white rounded-full w-14 h-14"
              onClick={(e) => {
                e.stopPropagation();
                onPlay();
              }}
            >
              <Play className="w-6 h-6" />
            </Button>
            {!audio_url && (
              <Button
                size="icon"
                className="bg-accent hover:bg-accent/90 text-white rounded-full w-10 h-10"
                onClick={(e) => {
                  e.stopPropagation();
                  onGenerateAudio();
                }}
              >
                <Volume2 className="w-5 h-5" />
              </Button>
            )}
            <Button
              size="icon"
              variant="destructive"
              className="rounded-full w-10 h-10"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-foreground line-clamp-1 mb-1">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {description}
          </p>
        )}
        <p className="text-xs text-muted-foreground">{duration}</p>
      </div>
    </Card>
  );
};