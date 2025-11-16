import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Auth } from "@/components/Auth";
import { Button } from "@/components/ui/button";
import { Plus, LogOut, Sparkles } from "lucide-react";
import { PodcastCard } from "@/components/PodcastCard";
import { GeneratePodcastDialog } from "@/components/GeneratePodcastDialog";
import { PodcastPlayer } from "@/components/PodcastPlayer";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";
import heroBg from "@/assets/hero-bg.jpg";

type Podcast = Database["public"]["Tables"]["podcasts"]["Row"];

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [selectedPodcast, setSelectedPodcast] = useState<Podcast | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      loadPodcasts();
    }
  }, [user]);

  const loadPodcasts = async () => {
    const { data, error } = await supabase
      .from("podcasts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading podcasts:", error);
      toast({
        title: "Error loading podcasts",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setPodcasts(data || []);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleDeletePodcast = async (id: string) => {
    const { error } = await supabase.from("podcasts").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error deleting podcast",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Podcast deleted" });
      loadPodcasts();
    }
  };

  const handleGenerateThumbnail = async (podcast: Podcast) => {
    toast({
      title: "Generating thumbnail...",
      description: "Creating visual for your podcast",
    });

    try {
      const { data, error } = await supabase.functions.invoke("generate-thumbnail", {
        body: { topic: podcast.topic, title: podcast.title },
      });

      if (error) throw error;

      // Update podcast with thumbnail URL
      const { error: updateError } = await supabase
        .from("podcasts")
        .update({ thumbnail_url: data.thumbnail_url })
        .eq("id", podcast.id);

      if (updateError) throw updateError;

      toast({
        title: "Thumbnail generated!",
        description: "Your podcast thumbnail is ready",
      });

      loadPodcasts();
    } catch (error) {
      console.error("Error generating thumbnail:", error);
      toast({
        title: "Thumbnail generation failed",
        description: error instanceof Error ? error.message : "Failed to generate thumbnail",
        variant: "destructive",
      });
    }
  };

  const handlePlayPodcast = (podcast: Podcast) => {
    setSelectedPodcast(podcast);
    setPlayerOpen(true);
  };

  const handleGenerateAudio = async (podcast: Podcast) => {
    if (!podcast.script) {
      toast({
        title: "No script available",
        description: "Cannot generate audio without a script",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Generating audio...",
      description: "Converting script to speech",
    });

    try {
      const { data, error } = await supabase.functions.invoke("text-to-speech", {
        body: {
          text: podcast.script,
          voice: "alloy",
        },
      });

      if (error) throw error;

      // Extract base64 from multiple possible response shapes
      let base64Audio: string | undefined = undefined;
      try {
        if (typeof data === 'string') base64Audio = data;
        else if (data?.audio) base64Audio = data.audio;
        else if (data?.audioContent) base64Audio = data.audioContent;
        else if (data instanceof ArrayBuffer) {
          const bytes = new Uint8Array(data);
          let binary = '';
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
          base64Audio = btoa(binary);
        }
      } catch (e) {
        console.warn('Failed to parse audio payload shape:', e);
      }

      console.log('Audio generation response:', {
        typeofData: typeof data,
        hasAudio: !!base64Audio,
        length: base64Audio?.length,
        keys: data && typeof data === 'object' ? Object.keys(data) : null,
      });

      if (!base64Audio) {
        throw new Error('No audio data received from server');
      }

      // Store as data URL (base64) for persistence
      const audioDataUrl = `data:audio/mpeg;base64,${base64Audio}`;
      
      console.log('Created audio data URL, prefix:', audioDataUrl.substring(0, 40));

      // Update podcast with audio URL
      const { error: updateError } = await supabase
        .from("podcasts")
        .update({ audio_url: audioDataUrl })
        .eq("id", podcast.id);

      if (updateError) throw updateError;

      toast({
        title: "Audio generated!",
        description: "Your podcast audio is ready",
      });

      loadPodcasts();
    } catch (error) {
      console.error("Error generating audio:", error);
      toast({
        title: "Audio generation failed",
        description: error instanceof Error ? error.message : "Failed to generate audio",
        variant: "destructive",
      });
    }
  };

  const handleGenerateVideo = async (podcast: Podcast) => {
    if (!podcast.thumbnail_url || !podcast.audio_url) {
      toast({
        title: "Missing required content",
        description: "Both thumbnail and audio are needed to generate video",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Generating video...",
      description: "Creating static video from thumbnail and audio",
    });

    try {
      const { generateStaticVideo } = await import("@/utils/videoGenerator");
      
      const videoBlob = await generateStaticVideo(
        podcast.thumbnail_url,
        podcast.audio_url,
        (progress) => {
          console.log(`Video generation progress: ${progress.toFixed(0)}%`);
        }
      );

      // Create video URL as data URL for persistence
      const videoDataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(videoBlob);
      });

      // Update podcast with video URL
      const { error: updateError } = await supabase
        .from("podcasts")
        .update({ video_url: videoDataUrl })
        .eq("id", podcast.id);

      if (updateError) throw updateError;

      toast({
        title: "Video generated!",
        description: "Your podcast video is ready",
      });

      loadPodcasts();
    } catch (error) {
      console.error("Error generating video:", error);
      toast({
        title: "Video generation failed",
        description: error instanceof Error ? error.message : "Failed to generate video",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-primary text-2xl font-bold">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              KT
            </h1>
            <Button
              variant="ghost"
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/50">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-background/80" />
        
        <div className="relative container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">AI-Powered Podcast Generation</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
              Create Training, onboarding, session
              <br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                for your company
              </span>
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Transform your ideas into engaging podcast scripts with the power of AI.
              Generate, customize, and share professional podcasts effortlessly.
            </p>
            <Button
              size="lg"
              onClick={() => setGenerateDialogOpen(true)}
              className="bg-primary hover:bg-primary/90 text-white shadow-glow h-14 px-8 text-lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Generate New Podcast
            </Button>
          </div>
        </div>
      </section>

      {/* Podcasts Grid */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-bold text-foreground">Your Podcasts</h3>
          <Button
            onClick={() => setGenerateDialogOpen(true)}
            variant="outline"
            className="border-primary text-primary hover:bg-primary hover:text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Podcast
          </Button>
        </div>

        {podcasts.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No podcasts yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first AI-generated podcast to get started
            </p>
            <Button
              onClick={() => setGenerateDialogOpen(true)}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Generate Your First Podcast
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {podcasts.map((podcast) => (
                <PodcastCard
                  key={podcast.id}
                  id={podcast.id}
                  title={podcast.title}
                  description={podcast.description || undefined}
                  thumbnail_url={podcast.thumbnail_url || undefined}
                  duration={podcast.duration}
                  audio_url={podcast.audio_url || undefined}
                  video_url={podcast.video_url || undefined}
                  topic={podcast.topic}
                  onPlay={() => handlePlayPodcast(podcast)}
                  onDelete={() => handleDeletePodcast(podcast.id)}
                  onGenerateAudio={() => handleGenerateAudio(podcast)}
                  onGenerateThumbnail={() => handleGenerateThumbnail(podcast)}
                  onGenerateVideo={() => handleGenerateVideo(podcast)}
                />
            ))}
          </div>
        )}
      </section>

      {/* Dialogs */}
      <GeneratePodcastDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        onSuccess={loadPodcasts}
      />

      <PodcastPlayer
        open={playerOpen}
        onOpenChange={setPlayerOpen}
        podcast={selectedPodcast}
        onRegenerateAudio={() => selectedPodcast && handleGenerateAudio(selectedPodcast)}
      />
    </div>
  );
};

export default Index;