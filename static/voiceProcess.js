class VoiceAssistant {
    constructor() {
        this.recognition = null;
        this.synthesizer = null;
        this.elevenlabsApiKey = 'sk_63465a0ad17e92ed8190b4e5026370c773538d47c1950469';
        this.voiceId = 'ByWUwXA3MMLREYmxtB32'; // Get from Elevenlabs
    }

    initializeVoiceRecognition() {
        // Check browser compatibility
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';

            this.recognition.onresult = async (event) => {
                const transcript = event.results[0][0].transcript;
                console.log('Voice input:', transcript);

                // Send to chat interface
                await this.processVoiceInput(transcript);
            };

            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
            };
        } else {
            console.warn('Web Speech API is not supported in this browser');
        }
    }

    startListening() {
        if (this.recognition) {
            this.recognition.start();
        }
    }

    async processVoiceInput(transcript) {
        try {
            // Send transcript to backend for processing
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: transcript })
            });

            const data = await response.json();
            this.generateEinsteinVoice(data.response);
        } catch (error) {
            console.error('Voice processing error:', error);
        }
    }

    async generateEinsteinVoice(text) {
        try {
            const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + this.voiceId, {
                method: 'POST',
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': this.elevenlabsApiKey
                },
                body: JSON.stringify({
                    text: text,
                    model_id: 'eleven_monolingual_v1',
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.5
                    }
                })
            });

            if (!response.ok) {
                throw new Error('ElevenLabs API request failed');
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);

            // Play audio and trigger lip sync
            this.playAudioWithLipSync(audioUrl);
        } catch (error) {
            console.error('Voice generation error:', error);
        }
    }

    playAudioWithLipSync(audioUrl) {
        const audio = new Audio(audioUrl);

        // Simple lip sync visualization
        const lipSyncContainer = document.getElementById('lip-sync-container');

        audio.onplay = () => {
            lipSyncContainer.classList.add('speaking');
        };

        audio.onended = () => {
            lipSyncContainer.classList.remove('speaking');
        };

        audio.play();
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    const voiceAssistant = new VoiceAssistant();
    voiceAssistant.initializeVoiceRecognition();

    // Attach event to voice button
    document.getElementById('voice-send').addEventListener('click', () => {
        voiceAssistant.startListening();
    });
});