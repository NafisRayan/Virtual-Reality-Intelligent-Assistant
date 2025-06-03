# Voice Chat Setup Instructions

## Overview
The voice chat system has been integrated into your Three.js VR environment. It replaces the iframe-based chat with a 3D floating screen that supports voice input and AI responses.

## Setup Steps

### 1. Update API Key
In `templates/index.html`, find line 445 and replace the placeholder with your actual Hugging Face API key:

```javascript
const HUGGING_FACE_API_KEY = 'your_actual_api_key_here';
```

### 2. How to Use

1. **Activate Voice Chat**: Click the "Chat" button in the VR menu
2. **Start Voice Input**: Click the red "🎤 Voice" button on the 3D screen
3. **Speak**: Say your message when the button turns green and shows "🔴 Listening..."
4. **AI Response**: Wait for the AI to respond (both text and speech)

### 3. Features

- **Voice Recognition**: Uses Web Speech API for speech-to-text
- **AI Integration**: Hugging Face Google Gemma 2-9B model
- **Text-to-Speech**: AI responses are spoken aloud
- **3D Display**: Chat messages appear on a floating 3D screen
- **VR Compatible**: Works in both desktop and VR modes

### 4. Troubleshooting

- **Voice not working**: Ensure microphone permissions are granted
- **API errors**: Check your Hugging Face API key and quota
- **No speech output**: Check browser audio permissions

### 5. Code Structure

The implementation includes:
- `createVoiceChatScreen()` - Creates the 3D chat interface
- `initVoiceRecognition()` - Sets up speech recognition
- `generateAIResponse()` - Handles AI API calls
- `addChatMessage()` - Manages chat display
- `speakText()` - Text-to-speech functionality

## Testing

1. Start your Flask server
2. Open the application in a browser
3. Click the Chat button in the VR menu
4. Test voice input by clicking the voice button and speaking
5. Verify AI responses appear and are spoken aloud
