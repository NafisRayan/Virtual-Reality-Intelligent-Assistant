import * as THREE from 'three';
import { createText } from 'three/addons/webxr/Text2D.js';
import { InferenceClient } from 'https://cdn.skypack.dev/@huggingface/inference';
const renderer = new THREE.WebGLRenderer({ antialias: true });

export class VoiceChatSystem {
    constructor(apiKey) {
        this.voiceChatScreen = null;
        this.voiceChatVisible = false;
        this.chatMessages = [];
        this.isListening = false;
        this.isBanglaListening = false;
        this.isDetectedObjectMode = false;
        this.recognition = null;
        this.banglaRecognition = null;
        this.client = new InferenceClient("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");
        this.controllers = [];
        this.raycaster = new THREE.Raycaster();
        this.intersected = null;
        this.isMicActive = false;
        this.camera = null;
        this.detectedObjectsPrompt = '';
    }

    setCamera(camera) {
        this.camera = camera;
    }

    init(scene, renderer, controllers = []) {
        if (renderer) {
            this.renderer = renderer;
        } else if (!this.renderer) {
            console.error('Renderer is undefined in VoiceChatSystem.init and not set via setRenderer()');
        }

        this.initVoiceRecognition();
        this.voiceChatScreen = this.createVoiceChatScreen();
        scene.add(this.voiceChatScreen);
        this.controllers = controllers;
        this.setupEventListeners();
        return this.voiceChatScreen;
    }

    initVoiceRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

            // English Speech Recognition
            this.recognition = new SpeechRecognition();
            this.recognition.lang = 'en-US';
            this.recognition.interimResults = false;
            this.recognition.continuous = false;

            this.recognition.onstart = () => {
                this.isListening = true;
                this.updateVoiceButtonState();
                console.log('English voice recognition started');
                if (this.chatMessages.length > 0 && this.chatMessages[this.chatMessages.length - 1].isLoading) {
                    this.removeChatMessage(this.chatMessages.length - 1);
                }
            };

            this.recognition.onend = () => {
                this.isListening = false;
                this.updateVoiceButtonState();
                console.log('English voice recognition ended');
                if (this.isDetectedObjectMode) {
                    this.isDetectedObjectMode = false;
                    this.detectedObjectsPrompt = '';
                    this.addChatMessage('Detected object mode stopped.', false);
                }
            };

            this.recognition.onerror = (event) => {
                this.isListening = false;
                this.updateVoiceButtonState();
                console.error('English speech recognition error:', event.error);
                if (this.chatMessages.length > 0 && this.chatMessages[this.chatMessages.length - 1].isLoading) {
                    this.removeChatMessage(this.chatMessages.length - 1);
                }

                let errorMessage = 'Speech recognition error: ';
                switch (event.error) {
                    case 'not-allowed':
                        errorMessage += 'Microphone access denied. Please allow microphone permissions.';
                        break;
                    case 'no-speech':
                        errorMessage += 'No speech detected. Please try again.';
                        break;
                    default:
                        errorMessage += event.error;
                }
                this.addChatMessage(errorMessage, false);
                if (this.isDetectedObjectMode) {
                    this.isDetectedObjectMode = false;
                    this.detectedObjectsPrompt = '';
                }
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

            // Bangla Speech Recognition
            this.banglaRecognition = new SpeechRecognition();
            this.banglaRecognition.lang = 'bn-BD';
            this.banglaRecognition.interimResults = false;
            this.banglaRecognition.continuous = false;

            this.banglaRecognition.onstart = () => {
                this.isBanglaListening = true;
                this.updateBanglaButtonState();
                console.log('Bangla voice recognition started');
                if (this.chatMessages.length > 0 && this.chatMessages[this.chatMessages.length - 1].isLoading) {
                    this.removeChatMessage(this.chatMessages.length - 1);
                }
            };

            this.banglaRecognition.onend = () => {
                this.isBanglaListening = false;
                this.updateBanglaButtonState();
                console.log('Bangla voice recognition ended');
            };

            this.banglaRecognition.onerror = (event) => {
                this.isBanglaListening = false;
                this.updateBanglaButtonState();
                console.error('Bangla speech recognition error:', event.error);
                if (this.chatMessages.length > 0 && this.chatMessages[this.chatMessages.length - 1].isLoading) {
                    this.removeChatMessage(this.chatMessages.length - 1);
                }

                let errorMessage = 'বাংলা স্পিচ রিকগনিশন ত্রুটি: ';
                switch (event.error) {
                    case 'not-allowed':
                        errorMessage += 'মাইক্রোফোন অ্যাক্সেস প্রত্যাখ্যান করা হয়েছে। অনুগ্রহ করে মাইক্রোফোনের অনুমতি দিন।';
                        break;
                    case 'no-speech':
                        errorMessage += 'কোনো কথা শনাক্ত হয়নি। আবার চেষ্টা করুন।';
                        break;
                    default:
                        errorMessage += event.error;
                }
                this.addChatMessage(errorMessage, false);
            };

            this.banglaRecognition.onresult = (event) => {
                if (event.results[0] && event.results[0].isFinal) {
                    const transcript = event.results[0][0].transcript.trim();
                    if (transcript) {
                        this.addChatMessage(`আপনি: ${transcript}`, true);
                        this.generateAIResponse(transcript);
                    }
                }
            };
        }
    }


async fetchDetectedObjects() {
    try {
        console.log('Fetching detected objects...');
        
        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        // Try to fetch the JSON endpoint first (which converts txt to JSON)
        const response = await fetch('/detected_objects.json', {
            signal: controller.signal,
            cache: 'no-cache',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        }
        
        // Get the response text first to debug
        const responseText = await response.text();
        console.log('Response length:', responseText.length);
        console.log('Response preview (first 200 chars):', responseText.substring(0, 200));
        
        // Check if response is empty
        if (!responseText || responseText.trim() === '') {
            console.log('Empty response received');
            return 'No detected objects found - file is empty.';
        }
        
        // Try to parse the JSON
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('JSON parsing error:', parseError);
            console.error('Response text that failed to parse:', responseText);
            return 'Error: Invalid JSON format in detected objects response.';
        }
        
        // Validate that we have an array with data
        if (!Array.isArray(data)) {
            console.error('Data is not an array:', typeof data, data);
            return 'Error: Expected array format in detected objects response.';
        }
        
        if (data.length === 0) {
            return 'No detected objects found.';
        }
        
        console.log(`Successfully parsed ${data.length} detected objects`);
        
        // Group objects by time to get latest detections
        const recentObjects = this.getRecentDetections(data, 10); // Get last 10 unique objects
        
        // Format the detected objects into a readable string
        const objectsList = recentObjects.map((item, index) => {
            let coords = 'N/A';
            if (item.coordinates && Array.isArray(item.coordinates) && item.coordinates.length >= 2) {
                coords = `(${item.coordinates[0].toFixed(1)}, ${item.coordinates[1].toFixed(1)})`;
            }
            
            return `${index + 1}. ${item.object || 'Unknown'} at ${coords} - ${item.time || 'Unknown time'}`;
        }).join('; ');
        
        return `Found ${data.length} total detections. Recent objects: ${objectsList}`;
        
    } catch (error) {
        console.error('Error fetching detected objects:', error);
        
        if (error.name === 'AbortError') {
            return 'Error: Request timed out while fetching detected objects. Please try again.';
        } else if (error.message.includes('Failed to fetch')) {
            return 'Error: Network error while fetching detected objects. Please check your connection.';
        } else {
            return `Error fetching detected objects: ${error.message}. Please try again.`;
        }
    }
}

// Helper method to get recent unique detections
getRecentDetections(data, maxCount = 10) {
    // Sort by time (most recent first)
    const sortedData = data.sort((a, b) => {
        const timeA = new Date(a.time || 0);
        const timeB = new Date(b.time || 0);
        return timeB - timeA;
    });
    
    // Get unique objects (latest occurrence of each object type)
    const uniqueObjects = new Map();
    
    for (const item of sortedData) {
        const key = item.object;
        if (!uniqueObjects.has(key)) {
            uniqueObjects.set(key, item);
        }
        
        if (uniqueObjects.size >= maxCount) {
            break;
        }
    }
    
    return Array.from(uniqueObjects.values());
}

    async toggleDetectedObjectMode() {
        if (this.recognition) {
            if (!this.isListening && !this.isDetectedObjectMode) {
                try {
                    this.detectedObjectsPrompt = await this.fetchDetectedObjects();
                    this.addChatMessage(`Detected object mode activated. ${this.detectedObjectsPrompt}`, false, true);
                    this.isDetectedObjectMode = true;
                    this.recognition.start();
                    this.addChatMessage('🎤 Listening for object-related input... Speak now!', false, true);
                } catch (error) {
                    console.error('Failed to start detected object mode:', error);
                    this.addChatMessage('Failed to start detected object mode. Please check microphone permissions or server availability.', false);
                    this.isDetectedObjectMode = false;
                    this.detectedObjectsPrompt = '';
                }
            } else {
                this.recognition.stop();
                this.addChatMessage('🎤 Stopped listening for object-related input.', false);
                this.isDetectedObjectMode = false;
                this.detectedObjectsPrompt = '';
            }
        } else {
            this.addChatMessage('Voice recognition not available. Please check browser compatibility.', false);
        }
    }

    createVoiceChatScreen() {
        const screenGroup = new THREE.Group();

        const screenGeometry = new THREE.PlaneGeometry(2, 1.5);
        const screenMaterial = new THREE.MeshPhongMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.9
        });
        const screenMesh = new THREE.Mesh(screenGeometry, screenMaterial);
        screenGroup.add(screenMesh);

        const borderGeometry = new THREE.PlaneGeometry(2.1, 1.6);
        const borderMaterial = new THREE.MeshPhongMaterial({
            color: 0x333333,
            transparent: true,
            opacity: 0.8
        });
        const borderMesh = new THREE.Mesh(borderGeometry, borderMaterial);
        borderMesh.position.z = -0.01;
        screenGroup.add(borderMesh);

        // Voice toggle button (English)
        const voiceButton = this.makeButtonMesh(0.3, 0.1, 0.02, 0xff4444);
        const voiceButtonText = createText('🎤 Voice', 0.04);
        voiceButtonText.position.set(0, 0, 0.011);
        voiceButton.add(voiceButtonText);
        voiceButton.position.set(-0.75, -0.6, 0.02);
        voiceButton.userData = { 
            isButton: true, 
            action: () => this.toggleVoiceRecognition() 
        };
        screenGroup.add(voiceButton);

        // Mic icon button for AI speech
        const micButton = this.makeButtonMesh(0.3, 0.1, 0.02, 0x4444ff);
        const micButtonText = createText('🔊 AI Speak', 0.04);
        micButtonText.position.set(0, 0, 0.011);
        micButton.add(micButtonText);
        micButton.position.set(-0.25, -0.6, 0.02);
        micButton.userData = { 
            isButton: true, 
            action: () => this.toggleMic() 
        };
        screenGroup.add(micButton);

        // Bangla voice button
        const banglaButton = this.makeButtonMesh(0.3, 0.1, 0.02, 0x44ff44);
        const banglaButtonText = createText('🎤 Bangla', 0.04);
        banglaButtonText.position.set(0, 0, 0.011);
        banglaButton.add(banglaButtonText);
        banglaButton.position.set(0.25, -0.6, 0.02);
        banglaButton.userData = { 
            isButton: true, 
            action: () => this.toggleBanglaVoiceRecognition() 
        };
        screenGroup.add(banglaButton);

        // Detected Object button
        const detectedObjectButton = this.makeButtonMesh(0.3, 0.1, 0.02, 0xffff44);
        const detectedObjectButtonText = createText('🔍 Vision', 0.04);
        detectedObjectButtonText.position.set(0, 0, 0.011);
        detectedObjectButton.add(detectedObjectButtonText);
        detectedObjectButton.position.set(0.75, -0.6, 0.02);
        detectedObjectButton.userData = { 
            isButton: true, 
            action: () => this.toggleDetectedObjectMode()
        };
        screenGroup.add(detectedObjectButton);

        screenGroup.name = 'voiceChatScreen';
        screenGroup.position.set(0, 0, -3);
        screenGroup.visible = false;

        screenGroup.userData = {
            screenMesh,
            voiceButton,
            voiceButtonText,
            micButton,
            micButtonText,
            banglaButton,
            banglaButtonText,
            detectedObjectButton,
            detectedObjectButtonText,
            messages: []
        };

        return screenGroup;
    }

    makeButtonMesh(x, y, z, color) {
        const geometry = new THREE.BoxGeometry(x, y, z);
        const material = new THREE.MeshPhongMaterial({
            color,
            transparent: true,
            opacity: 0.5,
            emissive: color,
            emissiveIntensity: 0.5,
        });
        return new THREE.Mesh(geometry, material);
    }

    setupEventListeners() {
        const mouse = new THREE.Vector2();
        const onMouseClick = (event) => {
            if (!this.voiceChatVisible || !this.renderer || !this.camera) {
                console.log('Click ignored: voiceChatVisible=', this.voiceChatVisible, 'renderer=', !!this.renderer, 'camera=', !!this.camera);
                return;
            }

            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            this.raycaster.setFromCamera(
                mouse,
                this.renderer.xr.isPresenting
                    ? this.renderer.xr.getCamera()
                    : this.camera
            );

            const buttons = [
                this.voiceChatScreen.userData.voiceButton,
                this.voiceChatScreen.userData.micButton,
                this.voiceChatScreen.userData.banglaButton,
                this.voiceChatScreen.userData.detectedObjectButton
            ];
            const intersects = this.raycaster.intersectObjects(buttons, true);
            console.log('Mouse click intersects:', intersects.length);

            if (intersects.length > 0) {
                let object = intersects[0].object;
                while (object && !object.userData.isButton) {
                    object = object.parent;
                }
                if (object && object.userData.isButton && object.userData.action) {
                    console.log('Button clicked:', object.userData);
                    object.userData.action();
                }
            }
        };

        window.addEventListener('mousedown', onMouseClick);

        this.controllers.forEach((controller, index) => {
            controller.addEventListener('selectstart', () => {
                if (!this.voiceChatVisible) {
                    console.log('Controller select ignored: voiceChat not visible');
                    return;
                }
                this.checkControllerIntersection(controller, index);
            });
        });
    }

    checkControllerIntersection(controller, index) {
        const tempMatrix = new THREE.Matrix4();
        tempMatrix.identity().extractRotation(controller.matrixWorld);
        this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

        const buttons = [
            this.voiceChatScreen.userData.voiceButton,
            this.voiceChatScreen.userData.micButton,
            this.voiceChatScreen.userData.banglaButton,
            this.voiceChatScreen.userData.detectedObjectButton
        ];
        const intersects = this.raycaster.intersectObjects(buttons, true);
        console.log(`Controller ${index} intersects:`, intersects.length);

        if (intersects.length > 0) {
            let object = intersects[0].object;
            while (object && !object.userData.isButton) {
                object = object.parent;
            }
            if (object && object.userData.isButton && object.userData.action) {
                console.log(`Controller ${index} clicked button:`, object.userData);
                object.userData.action();
            }
        }
    }

    toggleVoiceRecognition() {
        if (this.recognition) {
            if (!this.isListening) {
                try {
                    this.recognition.start();
                    this.addChatMessage('🎤 Listening (English)... Speak now!', false, true);
                } catch (error) {
                    console.error('Failed to start English voice recognition:', error);
                    this.addChatMessage('Failed to start voice recognition. Please check microphone permissions.', false);
                }
            } else {
                this.recognition.stop();
                this.addChatMessage('🎤 Stopped listening (English).', false);
            }
        } else {
            this.addChatMessage('Voice recognition not available. Please check browser compatibility.', false);
        }
    }

    toggleBanglaVoiceRecognition() {
        if (this.banglaRecognition) {
            if (!this.isBanglaListening) {
                try {
                    this.banglaRecognition.start();
                    this.addChatMessage('🎤 শোনা হচ্ছে (বাংলা)... এখন কথা বলুন!', false, true);
                } catch (error) {
                    console.error('Failed to start Bangla voice recognition:', error);
                    this.addChatMessage('বাংলা ভয়েস রিকগনিশন শুরু করতে ব্যর্থ। মাইক্রোফোনের অনুমতি পরীক্ষা করুন।', false);
                }
            } else {
                this.banglaRecognition.stop();
                this.addChatMessage('🎤 শোনা বন্ধ হয়েছে (বাংলা)।', false);
            }
        } else {
            this.addChatMessage('বাংলা ভয়েস রিকগনিশন উপলব্ধ নয়। ব্রাউজারের সামঞ্জস্য পরীক্ষা করুন।', false);
        }
    }

    toggleMic() {
        this.isMicActive = !this.isMicActive;
        console.log('Mic active state:', this.isMicActive);
        this.updateMicButtonState();
        this.addChatMessage(`AI speech ${this.isMicActive ? 'enabled' : 'disabled'}.`, false);
        if (!this.isMicActive && 'speechSynthesis' in window) {
            speechSynthesis.cancel(); // Immediately stop any ongoing speech
        }
    }

    updateVoiceButtonState() {
        if (this.voiceChatScreen && this.voiceChatScreen.userData.voiceButtonText) {
            const buttonText = this.voiceChatScreen.userData.voiceButtonText;
            buttonText.text = this.isListening ? '🔴 Listening (EN)...' : '🎤 Voice';
            const button = this.voiceChatScreen.userData.voiceButton;
            button.material.color.setHex(this.isListening ? 0x00ff00 : 0xff4444);
        }
    }

    updateBanglaButtonState() {
        if (this.voiceChatScreen && this.voiceChatScreen.userData.banglaButtonText) {
            const buttonText = this.voiceChatScreen.userData.banglaButtonText;
            buttonText.text = this.isBanglaListening ? '🔴 শোনা হচ্ছে (বাং)...' : 'Bangla Voice';
            const button = this.voiceChatScreen.userData.banglaButton;
            button.material.color.setHex(this.isBanglaListening ? 0x00ff00 : 0x44ff44);
        }
    }

    updateMicButtonState() {
        if (this.voiceChatScreen && this.voiceChatScreen.userData.micButtonText) {
            const buttonText = this.voiceChatScreen.userData.micButtonText;
            buttonText.text = this.isMicActive ? '🔊 AI Speaking' : '🔊 AI Speak';
            const button = this.voiceChatScreen.userData.micButton;
            button.material.color.setHex(this.isMicActive ? 0x00ff00 : 0x4444ff);
        }
    }

    async generateAIResponse(userMessage) {
        try {
            this.addChatMessage('AI is thinking...', false, true);

            const messages = [];
            if (this.isDetectedObjectMode && this.detectedObjectsPrompt) {
                messages.push({
                    role: 'system',
                    content: `You are assisting with questions related to detected objects. Here is the context: ${this.detectedObjectsPrompt}. Please respond to the user's query in this context.`
                });
            }
            messages.push({
                role: 'user',
                content: userMessage
            });

            const chatCompletion = await this.client.chatCompletion({
                provider: "nebius",
                model: "google/gemma-2-9b-it",
                messages
            });

            const aiResponse = chatCompletion?.choices?.[0]?.message?.content?.trim() || "Sorry, I could not generate a response.";

            this.removeChatMessage(this.chatMessages.length - 1);
            this.addChatMessage(`AI: ${aiResponse}`, false);
            if (this.isMicActive) {
                this.speakText(aiResponse);
            }

        } catch (error) {
            console.error('Error generating AI response:', error);
            this.removeChatMessage(this.chatMessages.length - 1);
            this.addChatMessage('Sorry, I encountered an error generating a response.', false);
        }
    }

    speakText(text) {
        if ('speechSynthesis' in window) {
            console.log('Attempting to speak:', text);
            speechSynthesis.cancel(); // Clear any existing utterances
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.8;
            utterance.pitch = 1;
            utterance.volume = 0.8;
            utterance.onstart = () => console.log('Speech started');
            utterance.onend = () => console.log('Speech ended');
            utterance.onerror = (event) => console.error('Speech error:', event.error);
            speechSynthesis.speak(utterance);
        } else {
            console.error('SpeechSynthesis not supported');
        }
    }

    addChatMessage(message, isUser = false, isLoading = false) {
        const messageData = {
            text: message,
            isUser,
            isLoading,
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

        const existingMessages = this.voiceChatScreen.children.filter(child =>
            child.userData && child.userData.isMessage
        );
        existingMessages.forEach(msg => this.voiceChatScreen.remove(msg));

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

        const maxLength = 50;
        const displayText = messageData.text.length > maxLength ? messageData.text.substring(0, maxLength) + '...' : messageData.text;

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
                this.addChatMessage('Voice chat activated! Click Voice button for English, Bangla Voice for Bangla, or Detected Object for object-related queries.', false);
            } else {
                if (this.isListening) {
                    this.toggleVoiceRecognition();
                }
                if (this.isBanglaListening) {
                    this.toggleBanglaVoiceRecognition();
                }
                if (this.isDetectedObjectMode) {
                    this.toggleDetectedObjectMode();
                }
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