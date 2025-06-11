/**
 * UI Manager - Handles UI elements, buttons, and menu systems
 */
import * as THREE from 'three';
import { createText } from 'three/addons/webxr/Text2D.js';
import { Object3D, Button, Intersectable, OffsetFromCamera, NeedCalibration } from './ECSComponents.js';

export class UIManager {
    constructor() {
        this.menuMesh = null;
        this.menuToggleButton = null;
        this.menuVisible = true;
        this.isMapVisible = true;
        this.isChatVisible = true;
        this.verticalOffset = -0.1;
    }

    init(scene, world, sceneManager, voiceChatSystem) {
        this.sceneManager = sceneManager;
        this.voiceChatSystem = voiceChatSystem;
        this.createMenu(scene, world);
        this.createMenuToggle(scene, world);
        this.setupUIEventHandlers();
        return {
            menuMesh: this.menuMesh,
            menuToggleButton: this.menuToggleButton
        };
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

    createMenu(scene, world) {
        // Create menu panel
        const menuGeometry = new THREE.PlaneGeometry(0.24, 0.77);
        const menuMaterial = new THREE.MeshPhongMaterial({
            opacity: 0.2,
            transparent: true,
        });
        this.menuMesh = new THREE.Mesh(menuGeometry, menuMaterial);
        this.menuMesh.name = 'menuPanel';
        this.menuMesh.position.set(0.4, 1 + this.verticalOffset, -1);
        this.menuMesh.rotation.y = -Math.PI / 12;
        scene.add(this.menuMesh);

        // Create ECS entity for menu panel
        this.menuEntity = world.createEntity();
        this.menuEntity.addComponent(Object3D, { object: this.menuMesh });
        this.menuEntity.addComponent(OffsetFromCamera, { x: 0.4, y: 0, z: -1 });
        this.menuEntity.addComponent(NeedCalibration);

        // Create buttons
        this.createMenuButtons(world);
    }

    createMenuButtons(world) {
        const buttons = [
            { name: 'Video', color: 0x4CAF50, yOffset: 0.18, action: 'video' },
            { name: 'Map', color: 0x4287f5, yOffset: 0.30, action: 'map' },
            { name: 'Chat', color: 0x4CAF50, yOffset: 0.42, action: 'chat' },
            { name: 'Dive', color: 0x4287f5, yOffset: 0.06, action: 'dive' },
            { name: 'cube', color: 0x355c7d, yOffset: -0.06, action: 'cube' },
            { name: 'exit', color: 0xff0000, yOffset: -0.18, action: 'exit' }
        ];

        buttons.forEach(buttonConfig => {
            const button = this.makeButtonMesh(0.2, 0.1, 0.01, buttonConfig.color);
            const buttonText = createText(buttonConfig.name, 0.06);
            buttonText.material.opacity = 1;
            buttonText.material.transparent = true;
            button.add(buttonText);
            buttonText.position.set(0, 0, 0.0051);
            button.position.set(0, buttonConfig.yOffset + this.verticalOffset, 0);
            this.menuMesh.add(button);

            // Store button action
            button.userData = { 
                isButton: true, 
                action: () => this.handleButtonAction(buttonConfig.action, button, buttonText)
            };

            // Create ECS entities for buttons
            this.createButtonEntity(world, button, buttonConfig.action);
        });
    }

    createButtonEntity(world, buttonMesh, actionType) {
        const entity = world.createEntity();
        entity.addComponent(Intersectable);
        entity.addComponent(Object3D, { object: buttonMesh });
        entity.addComponent(Button, { 
            action: () => this.handleButtonAction(actionType, buttonMesh)
        });

        return entity;
    }

    handleButtonAction(actionType, button, buttonText) {
        switch (actionType) {
            case 'video':
                this.handleVideoToggle(button, buttonText);
                break;
            case 'map':
                this.handleMapToggle(button, buttonText);
                break;
            case 'chat':
                this.handleChatToggle(button, buttonText);
                break;
            case 'dive':
                this.handleDiveAction();
                break;
            case 'cube':
                this.handleCubeAction();
                break;
            case 'exit':
                this.handleExitAction();
                break;
        }
    }

    handleVideoToggle(button, buttonText) {
        const isVisible = this.sceneManager.toggleVideoBackground();
        if (buttonText) {
            buttonText.text = isVisible ? 'Video' : 'Show Video';
        }
        button.material.color.setHex(isVisible ? 0x4287f5 : 0xff0000);
    }

    handleMapToggle(button, buttonText) {
        this.isMapVisible = !this.isMapVisible;
        const mapElement = document.getElementById('mapIframe');
        if (mapElement) {
            mapElement.style.display = this.isMapVisible ? 'block' : 'none';
        }
        if (buttonText) {
            buttonText.text = this.isMapVisible ? 'Map' : 'Show Map';
        }
        button.material.color.setHex(this.isMapVisible ? 0x4287f5 : 0xff0000);
    }

    handleChatToggle(button, buttonText) {
        const isVisible = this.voiceChatSystem.toggleVisibility();
        
        // Hide the iframe when using 3D chat
        const chatElement = document.getElementById('chatIframe');
        if (chatElement) {
            chatElement.style.display = 'none';
        }

        if (buttonText) {
            buttonText.text = isVisible ? 'Voice Chat' : 'Show Chat';
        }
        button.material.color.setHex(isVisible ? 0x4287f5 : 0xff0000);
    }

    handleDiveAction() {
        console.log('Dive');
        const hiText = createText('Dive', 0.2);
        hiText.position.set(0, 1.5, -1);
        window.scene.add(hiText);
        setTimeout(() => window.scene.remove(hiText), 2000);

        // Toggle visibility of GLTF models and roof
        this.sceneManager.toggleModels();
    }

    handleCubeAction() {
        // Toggle cube visibility - this should be handled by the ECS system
        if (window.cubeEntities) {
            window.cubeEntities.forEach(entity => {
                const { Object3D } = window.ECSComponents;
                const object = entity.getComponent(Object3D).object;
                object.visible = !object.visible;
            });
        }
    }

    handleExitAction() {
        const exitText = createText('Exiting session...', 0.04);
        exitText.material.opacity = 1;
        exitText.material.transparent = true;
        exitText.position.set(0, 1.5, -0.6);
        exitText.visible = true;
        window.scene.add(exitText);

        setTimeout(() => {
            exitText.visible = false;
            if (window.renderer && window.renderer.xr.getSession()) {
                window.renderer.xr.getSession().end();
            }
        }, 2000);
    }

    createMenuToggle(scene, world) {
        this.menuToggleButton = this.makeButtonMesh(0.07, 0.07, 0.01, 0x9932CC);
        const menuToggleText = createText('≡', 0.04);
        menuToggleText.material.opacity = 1;
        menuToggleText.material.transparent = true;
        this.menuToggleButton.add(menuToggleText);
        menuToggleText.position.set(0, 0, 0.0051);
        this.menuToggleButton.name = 'menuToggle';
        this.menuToggleButton.position.set(-0.3, 0.3, -0.5);
        scene.add(this.menuToggleButton);

        // Create ECS entity for menu toggle
        const menuToggleEntity = world.createEntity();
        menuToggleEntity.addComponent(Intersectable);
        menuToggleEntity.addComponent(Object3D, { object: this.menuToggleButton });
        menuToggleEntity.addComponent(OffsetFromCamera, { x: -0.3, y: 0.3, z: -0.5 });
        menuToggleEntity.addComponent(NeedCalibration);

        const menuToggleAction = () => {
            this.menuVisible = !this.menuVisible;
            this.menuMesh.visible = this.menuVisible;
            menuToggleText.text = this.menuVisible ? '≡' : '≣';
            this.menuToggleButton.material.color.setHex(this.menuVisible ? 0x9932CC : 0xff0000);

            // Recalibrate menu position when showing
            if (this.menuVisible && this.menuEntity) {
                this.menuEntity.addComponent(NeedCalibration);
            }
        };

        menuToggleEntity.addComponent(Button, { action: menuToggleAction });
        this.menuToggleButton.userData = { isButton: true, action: menuToggleAction };
    }

    setupUIEventHandlers() {
        // Setup mouse interaction handlers
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        const onMouseMove = (event) => {
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        };

        const onMouseClick = (event) => {
            if (!window.camera || !window.scene) return;
            
            raycaster.setFromCamera(mouse, window.camera);
            const intersects = raycaster.intersectObjects(window.scene.children, true);

            if (intersects.length > 0) {
                const intersectedObject = intersects[0].object;
                if (intersectedObject.userData.isButton && intersectedObject.userData.action) {
                    intersectedObject.userData.action();
                }
            }
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mousedown', onMouseClick);
    }

    updatePositions(camera, renderer) {
        if (!this.menuToggleButton || !this.menuMesh) return;

        if (renderer.xr.isPresenting) {
            const xrCamera = renderer.xr.getCamera();

            // Toggle button positioning
            const toggleDistance = 0.5;
            const toggleOffset = new THREE.Vector3(-0.3, 0.15, -toggleDistance);
            toggleOffset.applyQuaternion(xrCamera.quaternion);
            this.menuToggleButton.position.copy(xrCamera.position).add(toggleOffset);
            this.menuToggleButton.quaternion.copy(xrCamera.quaternion);

            // Menu panel positioning
            const menuDistance = 1;
            const menuOffset = new THREE.Vector3(0.4, 0, -menuDistance);
            menuOffset.applyQuaternion(xrCamera.quaternion);
            this.menuMesh.position.copy(xrCamera.position).add(menuOffset);
            this.menuMesh.quaternion.copy(xrCamera.quaternion);
            this.menuMesh.rotateY(-Math.PI / 12);

        } else {
            // Non-VR positioning
            const toggleDistance = 0.5;
            const toggleOffset = new THREE.Vector3(-0.3, 0.15, -toggleDistance);
            toggleOffset.applyQuaternion(camera.quaternion);
            this.menuToggleButton.position.copy(camera.position).add(toggleOffset);
            this.menuToggleButton.quaternion.copy(camera.quaternion);

            // Menu panel positioning
            const menuDistance = 1;
            const menuOffset = new THREE.Vector3(0.4, 0, -menuDistance);
            menuOffset.applyQuaternion(camera.quaternion);
            this.menuMesh.position.copy(camera.position).add(menuOffset);
            this.menuMesh.quaternion.copy(camera.quaternion);
            this.menuMesh.rotateY(-Math.PI / 12);
        }
    }
}
