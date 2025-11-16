import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PodcastPlayerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  podcast: {
    title: string;
    description?: string;
    script?: string;
    audio_url?: string;
    video_url?: string;
  } | null;
}

export const PodcastPlayer = ({ open, onOpenChange, podcast }: PodcastPlayerProps) => {
  if (!podcast) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] bg-card border-border">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold mb-2">{podcast.title}</DialogTitle>
              {podcast.description && (
                <p className="text-sm text-muted-foreground">{podcast.description}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {podcast.video_url ? (
              <div className="bg-secondary/50 p-6 rounded-lg border border-border">
                <h3 className="font-semibold mb-4 text-foreground">Video Player</h3>
                <video 
                  controls 
                  className="w-full rounded-lg"
                  src={podcast.video_url}
                >
                  Your browser does not support the video element.
                </video>
              </div>
            ) : podcast.audio_url ? (
              <div className="bg-secondary/50 p-6 rounded-lg border border-border">
                <h3 className="font-semibold mb-4 text-foreground">Audio Player</h3>
                <audio 
                  controls 
                  className="w-full"
                  src={podcast.audio_url}
                >
                  Your browser does not support the audio element.
                </audio>
              </div>
            ) : null}
            
            <div className="bg-secondary/50 p-6 rounded-lg border border-border">
              <h3 className="font-semibold mb-4 text-foreground">Podcast Script</h3>
              <div className="prose prose-invert max-w-none">
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {podcast.script || "No script available"}
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};