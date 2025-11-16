export async function generateStaticVideo(
  thumbnailUrl: string,
  audioUrl: string,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  // Load the thumbnail image
  const img = new Image();
  img.crossOrigin = "anonymous";
  
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = thumbnailUrl;
  });

  // Load the audio
  const audioContext = new AudioContext();
  const audioResponse = await fetch(audioUrl);
  const audioBuffer = await audioResponse.arrayBuffer();
  const decodedAudio = await audioContext.decodeAudioData(audioBuffer);
  const duration = decodedAudio.duration;

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
  
  // Add audio track
  const audioElement = new Audio(audioUrl);
  audioElement.crossOrigin = "anonymous";
  const audioStream = (audioElement as any).captureStream();
  stream.addTrack(audioStream.getAudioTracks()[0]);

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
      const progress = Math.min((elapsed / duration) * 100, 99);
      onProgress?.(progress);
      
      if (elapsed >= duration) {
        clearInterval(progressInterval);
      }
    }, 100);

    // Stop recording after audio duration
    setTimeout(() => {
      clearInterval(progressInterval);
      mediaRecorder.stop();
      audioElement.pause();
      stream.getTracks().forEach(track => track.stop());
      onProgress?.(100);
    }, duration * 1000 + 500); // Add 500ms buffer
  });
}
