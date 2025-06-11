/**
 * Voice Chat System with AI Integration
 */
import * as THREE from 'three';
import { createText } from 'three/addons/webxr/Text2D.js';

export class VoiceChatSystem {
    constructor() {
        this.voiceChatScreen = null;
        this.voiceChatVisible = false;
        this.chatMessages = [];
        this.isListening = false;
        this.recognition = null;
        this.HUGGING_FACE_API_KEY = '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';
    }

    init(scene) {
        this.initVoiceRecognition();
        this.voiceChatScreen = this.createVoiceChatScreen();
        scene.add(this.voiceChatScreen);
        return this.voiceChatScreen;
    }

    createVoiceChatScreen() {
        const screenGroup = new THREE.Group();

        // Create screen background
        const screenGeometry = new THREE.PlaneGeometry(2, 1.5);
        const screenMaterial = new THREE.MeshPhongMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.9
        });
        const screenMesh = new THREE.Mesh(screenGeometry, screenMaterial);
        screenGroup.add(screenMesh);

        // Create screen border
        const borderGeometry = new THREE.PlaneGeometry(2.1, 1.6);
        const borderMaterial = new THREE.MeshPhongMaterial({
            color: 0x333333,
            transparent: true,
            opacity: 0.8
        });
        const borderMesh = new THREE.Mesh(borderGeometry, borderMaterial);
        borderMesh.position.z = -0.01;
        screenGroup.add(borderMesh);

        // Create voice button
        const voiceButton = this.makeButtonMesh(0.3, 0.1, 0.02, 0xff4444);
        const voiceButtonText = createText('🎤 Voice', 0.04);
        voiceButtonText.position.set(0, 0, 0.011);
        voiceButton.add(voiceButtonText);
        voiceButton.position.set(0, -0.6, 0.02);
        screenGroup.add(voiceButton);

        // Set name for easy identification
        screenGroup.name = 'voiceChatScreen';
        screenGroup.position.set(0, 0, -3);
        screenGroup.visible = false;

        // Store references
        screenGroup.userData = {
            screenMesh: screenMesh,
            voiceButton: voiceButton,
            voiceButtonText: voiceButtonText,
            messages: []
        };

        return screenGroup;
    }

    makeButtonMesh(x, y, z, color) {
        const geometry = new THREE.BoxGeometry(x, y, z);
        const material = new THREE.MeshPhongMaterial({
            color: color,
            transparent: true,
            opacity: 0.5,
            emissive: color,
            emissiveIntensity: 0.5,
        });
        return new THREE.Mesh(geometry, material);
    }

    initVoiceRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();

            this.recognition.lang = 'en-US';
            this.recognition.interimResults = false;
            this.recognition.continuous = false;

            this.recognition.onstart = () => {
                this.isListening = true;
                this.updateVoiceButtonState();
                console.log('Voice recognition started');
                if (this.chatMessages.length > 0 && this.chatMessages[this.chatMessages.length - 1].isLoading) {
                    this.removeChatMessage(this.chatMessages.length - 1);
                }
            };

            this.recognition.onend = () => {
                this.isListening = false;
                this.updateVoiceButtonState();
                console.log('Voice recognition ended');
            };

            this.recognition.onerror = (event) => {
                this.isListening = false;
                this.updateVoiceButtonState();
                console.error('Speech recognition error:', event.error);

                if (this.chatMessages.length > 0 && this.chatMessages[this.chatMessages.length - 1].isLoading) {
                    this.removeChatMessage(this.chatMessages.length - 1);
                }

                let errorMessage = 'Speech recognition error: ';
                switch(event.error) {
                    case 'not-allowed':
                        errorMessage += 'Microphone access denied. Please allow microphone permissions.';
                        break;
                    case 'no-speech':
                        errorMessage += 'No speech detected. Please try again.';
                        setTimeout(() => {
                            if (this.voiceChatVisible) this.startVoiceRecognition();
                        }, 1000);
                        break;
                    default:
                        errorMessage += event.error;
                }
                this.addChatMessage(errorMessage, false);
            };

            this.recognition.onresult = (event) => {
                if (event.results[0] && event.results[0].isFinal) {
                    const transcript = event.results[0][0].transcript.trim();
                    if (transcript) {
                        this.addChatMessage(`You: ${transcript}`, true);
                        this.generateAIResponse(transcript);
                    }
                }
            };
        }
    }

    startVoiceRecognition() {
        if (this.recognition && !this.isListening) {
            try {
                this.recognition.start();
                this.addChatMessage('🎤 Listening... Speak now!', false, true);
            } catch (error) {
                console.error('Failed to start voice recognition:', error);
                this.addChatMessage('Failed to start voice recognition. Please check microphone permissions.', false);
            }
        } else if (this.isListening) {
            this.addChatMessage('Already listening... Please speak!', false);
        } else {
            this.addChatMessage('Voice recognition not available. Please check browser compatibility.', false);
        }
    }

    updateVoiceButtonState() {
        if (this.voiceChatScreen && this.voiceChatScreen.userData.voiceButtonText) {
            const buttonText = this.voiceChatScreen.userData.voiceButtonText;
            buttonText.text = this.isListening ? '🔴 Listening...' : '🎤 Voice';

            const button = this.voiceChatScreen.userData.voiceButton;
            button.material.color.setHex(this.isListening ? 0x00ff00 : 0xff4444);
        }
    }

    async generateAIResponse(userMessage) {
        try {
            this.addChatMessage('AI is thinking...', false, true);

            const response = await fetch('https://api-inference.huggingface.co/models/google/gemma-2-9b-it', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.HUGGING_FACE_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    inputs: `User: ${userMessage}\nAssistant:`,
                    parameters: {
                        max_new_tokens: 150,
                        temperature: 0.7,
                        do_sample: true,
                        top_p: 0.9,
                        return_full_text: false
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            let aiResponse = '';

            if (Array.isArray(data) && data[0] && data[0].generated_text) {
                aiResponse = data[0].generated_text.trim();
                aiResponse = aiResponse.replace(/^Assistant:\s*/, '');
            } else if (data.error) {
                aiResponse = `API Error: ${data.error}`;
            } else {
                aiResponse = 'Sorry, I could not generate a response.';
            }

            this.removeChatMessage(this.chatMessages.length - 1);
            this.addChatMessage(`AI: ${aiResponse}`, false);
            this.speakText(aiResponse);

            setTimeout(() => {
                if (this.voiceChatVisible && !this.isListening) {
                    this.startVoiceRecognition();
                }
            }, 2000);

        } catch (error) {
            console.error('Error generating AI response:', error);
            this.removeChatMessage(this.chatMessages.length - 1);
            this.addChatMessage('Sorry, I encountered an error generating a response.', false);
        }
    }

    speakText(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.8;
            utterance.pitch = 1;
            utterance.volume = 0.8;
            speechSynthesis.speak(utterance);
        }
    }

    addChatMessage(message, isUser = false, isLoading = false) {
        const messageData = {
            text: message,
            isUser: isUser,
            isLoading: isLoading,
            timestamp: Date.now()
        };

        this.chatMessages.push(messageData);
        this.updateChatDisplay();
    }

    removeChatMessage(index) {
        if (index >= 0 && index < this.chatMessages.length) {
            this.chatMessages.splice(index, 1);
            this.updateChatDisplay();
        }
    }

    updateChatDisplay() {
        if (!this.voiceChatScreen || !this.voiceChatVisible) return;

        // Clear existing message displays
        const existingMessages = this.voiceChatScreen.children.filter(child =>
            child.userData && child.userData.isMessage
        );
        existingMessages.forEach(msg => this.voiceChatScreen.remove(msg));

        // Display recent messages (last 6 messages to fit on screen)
        const recentMessages = this.chatMessages.slice(-6);
        const startY = 0.5;
        const messageHeight = 0.15;

        recentMessages.forEach((messageData, index) => {
            const yPosition = startY - (index * messageHeight);
            const messageGroup = this.createMessageDisplay(messageData, yPosition);
            this.voiceChatScreen.add(messageGroup);
        });
    }

    createMessageDisplay(messageData, yPosition) {
        const messageGroup = new THREE.Group();
        messageGroup.userData.isMessage = true;

        // Create message background
        const bgWidth = 1.8;
        const bgHeight = 0.12;
        const bgGeometry = new THREE.PlaneGeometry(bgWidth, bgHeight);
        const bgColor = messageData.isUser ? 0x0066cc : (messageData.isLoading ? 0x666666 : 0x333333);
        const bgMaterial = new THREE.MeshPhongMaterial({
            color: bgColor,
            transparent: true,
            opacity: 0.7
        });
        const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
        bgMesh.position.set(messageData.isUser ? 0.1 : -0.1, yPosition, 0.01);
        messageGroup.add(bgMesh);

        // Create message text
        const maxLength = 50;
        const displayText = messageData.text.length > maxLength ?
            messageData.text.substring(0, maxLength) + '...' : messageData.text;

        const messageText = createText(displayText, 0.03);
        messageText.position.set(messageData.isUser ? 0.1 : -0.1, yPosition, 0.02);
        messageText.material.color.setHex(0xffffff);
        messageGroup.add(messageText);

        return messageGroup;
    }

    toggleVisibility() {
        this.voiceChatVisible = !this.voiceChatVisible;
        if (this.voiceChatScreen) {
            this.voiceChatScreen.visible = this.voiceChatVisible;
            if (this.voiceChatVisible) {
                this.updateChatDisplay();
                this.addChatMessage('Voice chat activated! Listening for your voice...', false);
                setTimeout(() => {
                    this.startVoiceRecognition();
                }, 1000);
            }
        }
        return this.voiceChatVisible;
    }

    updatePosition(camera, renderer) {
        if (this.voiceChatScreen && this.voiceChatVisible) {
            const chatDistance = 3;
            const chatOffset = new THREE.Vector3(0, 0, -chatDistance);
            
            if (renderer.xr.isPresenting) {
                const xrCamera = renderer.xr.getCamera();
                chatOffset.applyQuaternion(xrCamera.quaternion);
                this.voiceChatScreen.position.copy(xrCamera.position).add(chatOffset);
                this.voiceChatScreen.quaternion.copy(xrCamera.quaternion);
            } else {
                chatOffset.applyQuaternion(camera.quaternion);
                this.voiceChatScreen.position.copy(camera.position).add(chatOffset);
                this.voiceChatScreen.quaternion.copy(camera.quaternion);
            }
        }
    }
}
