# Einstein Virtual Assistant - Installation Guide

This guide will help you set up your Einstein Virtual Assistant with voice recognition capabilities.

## Prerequisites

- Python 3.8 or later
- FFmpeg installed on your system
- Ollama (for AI responses)
- ElevenLabs API key (optional, for high-quality voice synthesis)

## Installation Steps

1. **Install FFmpeg**
   
   FFmpeg is required for audio processing. Install it based on your operating system:
   
   - **Windows**: Download from [FFmpeg website](https://ffmpeg.org/download.html) and add to PATH
   - **macOS**: `brew install ffmpeg`
   - **Ubuntu/Debian**: `sudo apt install ffmpeg`

2. **Create a Python virtual environment**
   
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install the requirements**
   
   ```bash
   pip install -r requirements.txt
   ```

4. **Setup environment variables**
   
   Create a `.env` file in the project root with the following variables:
   
   ```
   ELEVENLABS_API_KEY=your_elevenlabs_api_key
   EINSTEIN_VOICE_ID=your_elevenlabs_voice_id
   ```
   
   Note: The ElevenLabs API key is optional. If not provided, the app will fall back to browser-based text-to-speech.

5. **Set up Ollama**
   
   Install Ollama from [ollama.ai](https://ollama.ai/) and pull the necessary model:
   
   ```bash
   ollama pull llama3.1:8b
   ```

6. **Set up project structure**
   
   Ensure you have the following files in your project directory:
   
   ```
   /your_project_folder
   ├── app.py (Backend Flask application)
   ├── static/
   │   ├── styles.css
   │   ├── interactions.js
   │   └── Albert_Einstein.jpg (Einstein image)
   ├── templates/
   │   └── client.html
   ├── .env
   └── requirements.txt
   ```

7. **Run the application**
   
   ```bash
   python app.py
   ```

8. **Access the application**
   
   Open your browser and navigate to: http://localhost:5000

## Troubleshooting

- **Whisper Installation Issues**: If you encounter issues installing Whisper, try installing PyTorch separately following instructions at [pytorch.org](https://pytorch.org/get-started/locally/).
  
- **FFmpeg Not Found**: If you get an error about FFmpeg not being found, make sure it's properly installed and available in your system PATH.

- **Microphone Access**: If you're having trouble with microphone access, ensure your browser has permission to use the microphone and that your microphone is properly connected.

## Additional Notes

- The voice recognition feature uses OpenAI's Whisper model for transcription, which runs locally on your machine.
- For the best experience, use a clear microphone in a quiet environment.
- The default recording time is 7 seconds, which can be adjusted in the JavaScript code.
