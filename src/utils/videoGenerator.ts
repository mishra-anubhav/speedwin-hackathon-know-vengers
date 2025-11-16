export async function generateStaticVideo(
  thumbnailUrl: string,
  audioUrl: string,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  // Load the thumbnail image
  const img = new Image();
  const isDataUrl = thumbnailUrl.startsWith('data:');
  if (!isDataUrl) {
    img.crossOrigin = "anonymous";
  }
  
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = thumbnailUrl;
  });

  // Prepare the audio element and wait for metadata
  const audioElement = new Audio();
  const isAudioDataUrl = audioUrl.startsWith('data:');
  
  // Don't set crossOrigin for data URLs
  if (!isAudioDataUrl) {
    audioElement.crossOrigin = "anonymous";
  }
  
  audioElement.src = audioUrl;
  
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Audio loading timed out'));
    }, 10000); // 10 second timeout
    
    audioElement.onloadedmetadata = () => {
      clearTimeout(timeout);
      resolve(null as unknown as void);
    };
    audioElement.onerror = (e) => {
      clearTimeout(timeout);
      console.error('Audio loading error:', e);
      reject(new Error('Unable to load audio'));
    };
  });
  
  const duration = isFinite(audioElement.duration) ? audioElement.duration : 0;
  
  if (duration === 0) {
    throw new Error('Audio duration is invalid or zero');
  }

  // Create canvas for video frames
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d')!;

  // Draw the thumbnail on canvas (fit to canvas)
  const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
  const x = (canvas.width / 2) - (img.width / 2) * scale;
  const y = (canvas.height / 2) - (img.height / 2) * scale;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

  // Create video stream from canvas
  const stream = canvas.captureStream(30); // 30 fps
  
  // Add audio track from the already prepared element
  const streamSource: any = (audioElement as any);
  const audioStream = streamSource.captureStream ? streamSource.captureStream() : (streamSource.mozCaptureStream ? streamSource.mozCaptureStream() : null);
  if (audioStream) {
    stream.addTrack(audioStream.getAudioTracks()[0]);
  }

  // Create MediaRecorder
  const chunks: Blob[] = [];
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9,opus',
    videoBitsPerSecond: 2500000,
  });

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  // Start recording
  return new Promise((resolve, reject) => {
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      resolve(blob);
    };

    mediaRecorder.onerror = (e) => {
      reject(new Error('MediaRecorder error'));
    };

    mediaRecorder.start();
    audioElement.play();

    // Track progress
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = duration > 0 ? Math.min((elapsed / duration) * 100, 99) : 0;
      onProgress?.(progress);
      
      if (duration > 0 && elapsed >= duration) {
        clearInterval(progressInterval);
      }
    }, 100);

    // Stop recording after audio duration (fallback to 60s if unknown)
    const stopAfterMs = (duration > 0 ? duration : 60) * 1000 + 500;
    setTimeout(() => {
      clearInterval(progressInterval);
      mediaRecorder.stop();
      audioElement.pause();
      stream.getTracks().forEach(track => track.stop());
      onProgress?.(100);
    }, stopAfterMs);
  });
}
