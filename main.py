from flask import Flask, render_template, request, jsonify, send_file
import os
import requests
import json
import ollama
import tempfile
import whisper
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Initialize the Whisper model (small model works well for most cases)
whisper_model = whisper.load_model("base")

class EinsteinCharacter:
    def __init__(self):
        # Elevenlabs configuration
        self.elevenlabs_api_key = os.getenv('ELEVENLABS_API_KEY')
        self.voice_id = os.getenv('EINSTEIN_VOICE_ID')

        # System prompt for Einstein-like responses
        self.system_prompt = """
        You are Albert Einstein, speaking with scientific wisdom and philosophical depth. 
        Respond in a manner that reflects your historical persona:
        - Use intellectual language
        - Provide scientific insights
        - Incorporate occasional humor and philosophical reflection
        - Speak as if you're from the early 20th century
        - don't use any stage directions or narrative actions in your speech
        - limit your responses to 5-7 sentences max
        """

    def generate_response(self, user_message):
        try:
            # Use Ollama for response generation
            response = ollama.chat(
                model='llama3.1:8b',
                messages=[
                    {'role': 'system', 'content': self.system_prompt},
                    {'role': 'user', 'content': user_message}
                ]
            )
            return response['message']['content']
        except Exception as e:
            return f"Intellectual circuits are experiencing some turbulence: {str(e)}"


einstein = EinsteinCharacter()


@app.route('/')
def index():
    return render_template('client.html')


@app.route('/chat', methods=['POST'])
def chat():
    user_message = request.json.get('message', '')

    # Generate text response
    response_text = einstein.generate_response(user_message)

    return jsonify({
        'response': response_text
    })


@app.route('/text-to-speech', methods=['POST'])
def text_to_speech():
    text = request.json.get('text', '')
    if not text:
        return jsonify({'error': 'No text provided'}), 400

    try:
        # Check if ElevenLabs API key is available
        if einstein.elevenlabs_api_key and einstein.voice_id:
            # Use ElevenLabs for TTS
            url = f'https://api.elevenlabs.io/v1/text-to-speech/{einstein.voice_id}'

            headers = {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': einstein.elevenlabs_api_key
            }

            payload = {
                'text': text,
                'model_id': 'eleven_monolingual_v1',
                'voice_settings': {
                    'stability': 0.5,
                    'similarity_boost': 0.75
                }
            }

            response = requests.post(url, json=payload, headers=headers)
            response.raise_for_status()

            # Ensure directory exists
            os.makedirs('static', exist_ok=True)

            # Save the audio file
            audio_path = 'static/einstein_response.mp3'
            with open(audio_path, 'wb') as f:
                f.write(response.content)

            return jsonify({'audio_path': '/' + audio_path})

        else:
            # Fallback to browser-based TTS
            return jsonify({
                'audio_path': None,
                'error': 'ElevenLabs API key not configured',
                'use_browser_tts': True
            })

    except Exception as e:
        print(f"TTS Error: {str(e)}")
        return jsonify({
            'error': str(e),
            'audio_path': None
        }), 500


@app.route('/upload-audio', methods=['POST'])
def upload_audio():
    """
    Process audio recordings using Whisper for voice recognition
    and generate a response from Einstein
    """
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400

    try:
        # Get the audio file from the request
        audio_file = request.files['audio']

        # Create a temporary file to save and process the audio
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_audio:
            audio_file.save(temp_audio.name)
            temp_audio_path = temp_audio.name

        # Use Whisper to transcribe the audio
        result = whisper_model.transcribe(temp_audio_path)
        transcribed_text = result["text"].strip()

        # Delete the temporary file
        os.unlink(temp_audio_path)

        # If transcription is empty, return an error
        if not transcribed_text:
            return jsonify({
                'error': 'Could not transcribe audio',
                'user_message': '',
                'einstein_response': ''
            }), 400

        # Generate Einstein's response to the transcribed text
        einstein_response = einstein.generate_response(transcribed_text)

        # Convert Einstein's response to speech
        audio_path = None
        if einstein.elevenlabs_api_key and einstein.voice_id:
            # Use ElevenLabs for TTS
            url = f'https://api.elevenlabs.io/v1/text-to-speech/{einstein.voice_id}'

            headers = {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': einstein.elevenlabs_api_key
            }

            payload = {
                'text': einstein_response,
                'model_id': 'eleven_monolingual_v1',
                'voice_settings': {
                    'stability': 0.5,
                    'similarity_boost': 0.75
                }
            }

            response = requests.post(url, json=payload, headers=headers)
            response.raise_for_status()

            # Ensure directory exists
            os.makedirs('static', exist_ok=True)

            # Save the audio file
            audio_path = 'static/voice_response.mp3'
            with open(audio_path, 'wb') as f:
                f.write(response.content)

            audio_path = '/' + audio_path

        return jsonify({
            'user_message': transcribed_text,
            'einstein_response': einstein_response,
            'voice_path': audio_path
        })

    except Exception as e:
        print(f"Voice recognition error: {str(e)}")
        return jsonify({
            'error': str(e),
            'user_message': '',
            'einstein_response': ''
        }), 500


if __name__ == '__main__':
    app.run(debug=True)