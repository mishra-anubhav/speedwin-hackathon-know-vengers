import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GeneratePodcastDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const GeneratePodcastDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: GeneratePodcastDialogProps) => {
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState("5-minute");
  const [style, setStyle] = useState("conversational");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast({
        title: "Topic required",
        description: "Please enter a topic for your podcast",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("generate-podcast", {
        body: { topic, duration, style },
      });

      if (error) throw error;

      const { error: insertError } = await supabase.from("podcasts").insert({
        user_id: userData.user.id,
        title: data.title,
        description: data.description,
        topic,
        duration,
        script: data.script,
        status: "completed",
      });

      if (insertError) throw insertError;

      toast({
        title: "Podcast generated!",
        description: "Your podcast has been created successfully",
      });

      setTopic("");
      setDuration("5-minute");
      setStyle("conversational");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error generating podcast:", error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate podcast",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Generate New Podcast</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="topic">Podcast Topic</Label>
            <Input
              id="topic"
              placeholder="e.g., The Future of AI, Space Exploration..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3-minute">3 minutes</SelectItem>
                <SelectItem value="5-minute">5 minutes</SelectItem>
                <SelectItem value="10-minute">10 minutes</SelectItem>
                <SelectItem value="15-minute">15 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="style">Style</Label>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conversational">Conversational</SelectItem>
                <SelectItem value="educational">Educational</SelectItem>
                <SelectItem value="storytelling">Storytelling</SelectItem>
                <SelectItem value="interview">Interview Style</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full bg-primary hover:bg-primary/90 text-white"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Podcast"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};