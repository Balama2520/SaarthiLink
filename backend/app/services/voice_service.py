import logging
import speech_recognition as sr
from io import BytesIO

logger = logging.getLogger(__name__)


class VoiceService:
    def __init__(self):
        self.recognizer = sr.Recognizer()

    async def transcribe_audio(self, audio_content: bytes) -> str:
        try:
            from pydub import AudioSegment

            # Convert raw audio (e.g., from frontend mediaRecorder) to WAV
            audio = AudioSegment.from_file(BytesIO(audio_content))
            wav_io = BytesIO()
            audio.export(wav_io, format="wav")
            wav_io.seek(0)

            with sr.AudioFile(wav_io) as source:
                audio_data = self.recognizer.record(source)
                try:
                    # Attempt local pocket sphinx if installed, else fallback to google (requires internet)
                    # For v2.0 "Best-in-class", Whisper is preferred, but SpeechRecognition provides a good wrapper.
                    text = self.recognizer.recognize_google(audio_data)
                    return text
                except sr.UnknownValueError:
                    return "⚠️ Could not understand audio"
                except sr.RequestError as e:
                    return f"⚠️ Speech service error: {e}"
        except Exception as e:
            logger.error(f"Transcription error: {e}")
            return f"⚠️ Voice processing fault: {str(e)}"


voice_service = VoiceService()
