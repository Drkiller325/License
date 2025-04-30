document.addEventListener('DOMContentLoaded', () => {
    const messageInput = document.getElementById('user-message');
    const textSendBtn = document.getElementById('text-send');
    const voiceSendBtn = document.getElementById('voice-send');
    const chatMessages = document.getElementById('chat-messages');
    const lipSyncContainer = document.getElementById('lip-sync-container');

    let isPlayingAudio = false;
    let animationFrameId = null;
    let isRecording = false;
    let mediaRecorder = null;

    // Create audio waveform bars
    const numBars = 20;
    for (let i = 0; i < numBars; i++) {
        const bar = document.createElement('div');
        bar.classList.add('waveform-bar');
        lipSyncContainer.appendChild(bar);
    }

    const waveformBars = document.querySelectorAll('.waveform-bar');

    async function sendTextMessage() {
        const userMessage = messageInput.value.trim();
        if (!userMessage) return;

        // Display user message
        appendMessage('user', userMessage);
        messageInput.value = '';

        try {
            // Show loading indicator
            const loadingEl = document.createElement('div');
            loadingEl.classList.add('message', 'einstein', 'loading');
            loadingEl.textContent = 'Thinking...';
            chatMessages.appendChild(loadingEl);
            chatMessages.scrollTop = chatMessages.scrollHeight;

            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: userMessage })
            });

            const data = await response.json();

            // Remove loading indicator
            chatMessages.removeChild(loadingEl);

            // Display Einstein's response
            appendMessage('einstein', data.response);

            // Convert response to speech
            await textToSpeech(data.response);
        } catch (error) {
            console.error('Error:', error);
            appendMessage('system', 'Sorry, there was an error processing your request.');
        }
    }

    async function textToSpeech(text) {
        try {
            // Start animation before audio loads
            startWaveformAnimation();

            const response = await fetch('/text-to-speech', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text })
            });

            const data = await response.json();

            if (!data.audio_path) {
                throw new Error('No audio path returned');
            }

            // Play the audio
            const audio = new Audio(data.audio_path);

            // Add event listeners
            audio.addEventListener('play', () => {
                isPlayingAudio = true;
                // Animation already started before this point
            });

            audio.addEventListener('ended', () => {
                isPlayingAudio = false;
                stopWaveformAnimation();
            });

            audio.addEventListener('error', (e) => {
                console.error('Audio playback error:', e);
                isPlayingAudio = false;
                stopWaveformAnimation();
            });

            await audio.play();

        } catch (error) {
            console.error('Speech synthesis error:', error);
            stopWaveformAnimation();
        }
    }

    // Start waveform animation
    function startWaveformAnimation() {
        isPlayingAudio = true;
        animateWaveform();
    }

    // Stop waveform animation
    function stopWaveformAnimation() {
        isPlayingAudio = false;
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }

        // Reset all bars to minimal height
        waveformBars.forEach(bar => {
            bar.style.height = '5px';
        });
    }

    // Animate the waveform
    function animateWaveform() {
        if (!isPlayingAudio) return;

        waveformBars.forEach(bar => {
            // Random height between 5px and 40px
            const height = Math.floor(Math.random() * 35) + 5;
            bar.style.height = `${height}px`;
        });

        // Loop the animation while speaking
        animationFrameId = requestAnimationFrame(() => {
            setTimeout(animateWaveform, 100); // Update every 100ms
        });
    }

    function appendMessage(sender, message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', sender);
        messageElement.textContent = message;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Voice recording visualization
    function startRecordingAnimation() {
        const recordingIndicator = document.createElement('div');
        recordingIndicator.id = 'recording-indicator';
        recordingIndicator.textContent = '🔴 Recording...';
        recordingIndicator.style.position = 'fixed';
        recordingIndicator.style.top = '20px';
        recordingIndicator.style.right = '20px';
        recordingIndicator.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
        recordingIndicator.style.color = 'red';
        recordingIndicator.style.padding = '10px';
        recordingIndicator.style.borderRadius = '5px';
        recordingIndicator.style.fontWeight = 'bold';
        recordingIndicator.style.zIndex = '1000';

        document.body.appendChild(recordingIndicator);
    }

    function stopRecordingAnimation() {
        const recordingIndicator = document.getElementById('recording-indicator');
        if (recordingIndicator) {
            document.body.removeChild(recordingIndicator);
        }
    }

    // Add voice recognition implementation
    async function startVoiceRecognition() {
        if (isRecording) {
            stopVoiceRecognition();
            return;
        }

        try {
            const voiceBtn = document.getElementById('voice-send');
            voiceBtn.disabled = true;
            voiceBtn.textContent = '🎤 Listening...';
            startRecordingAnimation();

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioChunks = [];

            mediaRecorder = new MediaRecorder(stream);
            isRecording = true;

            mediaRecorder.addEventListener('dataavailable', (event) => {
                audioChunks.push(event.data);
            });

            mediaRecorder.addEventListener('stop', async () => {
                isRecording = false;
                stopRecordingAnimation();
                voiceBtn.disabled = false;
                voiceBtn.textContent = '🎤 Voice';

                // Show loading indicator
                const loadingEl = document.createElement('div');
                loadingEl.classList.add('message', 'system', 'loading');
                loadingEl.textContent = 'Transcribing audio';
                chatMessages.appendChild(loadingEl);
                chatMessages.scrollTop = chatMessages.scrollHeight;

                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                const formData = new FormData();
                formData.append('audio', audioBlob, 'recording.wav');

                try {
                    const response = await fetch('/upload-audio', {
                        method: 'POST',
                        body: formData
                    });

                    // Remove loading indicator
                    chatMessages.removeChild(loadingEl);

                    const data = await response.json();

                    if (data.user_message) {
                        // Display transcribed user message
                        appendMessage('user', data.user_message);

                        // Show Einstein's thinking indicator
                        const einsteinThinkingEl = document.createElement('div');
                        einsteinThinkingEl.classList.add('message', 'einstein', 'loading');
                        einsteinThinkingEl.textContent = 'Thinking';
                        chatMessages.appendChild(einsteinThinkingEl);
                        chatMessages.scrollTop = chatMessages.scrollHeight;

                        // Short delay to show thinking indicator
                        await new Promise(resolve => setTimeout(resolve, 500));

                        // Remove thinking indicator
                        chatMessages.removeChild(einsteinThinkingEl);

                        // Display Einstein's response
                        appendMessage('einstein', data.einstein_response);

                        // Play Einstein's audio response if available
                        if (data.voice_path) {
                            startWaveformAnimation();
                            const audio = new Audio(data.voice_path);

                            audio.addEventListener('ended', () => {
                                stopWaveformAnimation();
                            });

                            audio.addEventListener('error', (e) => {
                                console.error('Audio playback error:', e);
                                stopWaveformAnimation();
                            });

                            await audio.play();
                        }
                    } else {
                        appendMessage('system', 'Sorry, I couldn\'t understand what you said.');
                    }
                } catch (error) {
                    console.error('Error processing voice:', error);
                    appendMessage('system', 'Sorry, there was an error processing your voice input.');

                    // Remove loading indicator if still present
                    if (document.contains(loadingEl)) {
                        chatMessages.removeChild(loadingEl);
                    }
                }

                // Stop the microphone stream
                stream.getTracks().forEach(track => track.stop());
            });

            // Start recording
            mediaRecorder.start();

            // Automatically stop recording after 7 seconds
            setTimeout(() => {
                if (mediaRecorder && mediaRecorder.state !== 'inactive' && isRecording) {
                    mediaRecorder.stop();
                }
            }, 7000);

        } catch (error) {
            console.error('Voice recognition error:', error);
            appendMessage('system', 'Sorry, I couldn\'t access your microphone.');
            stopRecordingAnimation();

            document.getElementById('voice-send').disabled = false;
            document.getElementById('voice-send').textContent = '🎤 Voice';
        }
    }

    function stopVoiceRecognition() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive' && isRecording) {
            mediaRecorder.stop();
            isRecording = false;
            stopRecordingAnimation();
        }
    }

    // Event listeners
    textSendBtn.addEventListener('click', sendTextMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendTextMessage();
    });

    voiceSendBtn.addEventListener('click', startVoiceRecognition);
});