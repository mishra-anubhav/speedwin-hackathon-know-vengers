-- Add video_url column to podcasts table
ALTER TABLE public.podcasts 
ADD COLUMN video_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.podcasts.video_url IS 'URL of the generated video combining thumbnail and audio';