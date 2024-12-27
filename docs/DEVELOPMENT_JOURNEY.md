// Implemented robust audio recording with proper cleanup
const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);

    // Proper event handling
    mediaRecorder.ondataavailable = (e) => {
      audioChunks.current.push(e.data);
    };

    // Cleanup function
    return () => {
      stream.getTracks().forEach(track => track.stop());
      mediaRecorder.stop();
    };
  } catch (error) {
    handleRecordingError(error);
  }
};