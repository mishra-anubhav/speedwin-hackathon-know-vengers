/**
 * Generates a static video by combining an image (thumbnail) with audio
 * @param imageUrl - URL of the thumbnail image
 * @param audioBlob - Audio blob to combine with the image
 * @param duration - Duration in seconds (optional, will auto-detect from audio)
 * @returns Promise<Blob> - Video blob in MP4 format
 */
export async function generateStaticVideo(
  imageUrl: string,
  audioBlob: Blob,
  duration?: number
): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    try {
      // Create audio element to get duration
      const audio = new Audio();
      const audioUrl = URL.createObjectURL(audioBlob);
      audio.src = audioUrl;

      await new Promise((res) => {
        audio.addEventListener('loadedmetadata', res);
      });

      const videoDuration = duration || audio.duration;

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Load and draw image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = imageUrl;
      });

      // Draw image to fill canvas (cover mode)
      const scale = Math.max(
        canvas.width / img.width,
        canvas.height / img.height
      );
      const x = (canvas.width - img.width * scale) / 2;
      const y = (canvas.height - img.height * scale) / 2;
      
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

      // Capture canvas stream
      const canvasStream = canvas.captureStream(30); // 30 FPS

      // Create audio stream
      const audioContext = new AudioContext();
      const audioSource = audioContext.createMediaElementSource(audio);
      const audioDestination = audioContext.createMediaStreamDestination();
      audioSource.connect(audioDestination);
      audioSource.connect(audioContext.destination);

      // Combine streams
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...audioDestination.stream.getAudioTracks(),
      ]);

      // Record the combined stream
      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm;codecs=vp9,opus',
      });

      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const videoBlob = new Blob(chunks, { type: 'video/webm' });
        URL.revokeObjectURL(audioUrl);
        audioContext.close();
        resolve(videoBlob);
      };

      mediaRecorder.onerror = (event) => {
        reject(new Error('MediaRecorder error: ' + event));
      };

      // Start recording
      mediaRecorder.start();
      audio.play();

      // Stop recording when audio ends
      audio.onended = () => {
        mediaRecorder.stop();
      };

      // Fallback timeout
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, (videoDuration + 1) * 1000);

    } catch (error) {
      reject(error);
    }
  });
}
