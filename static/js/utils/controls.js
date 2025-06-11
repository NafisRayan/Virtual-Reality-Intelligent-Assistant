/**
 * Input controls and event handlers
 */
import * as THREE from 'three';

export class ControlsManager {
    constructor() {
        this.moveSpeed = 0.1;
        this.mouseSensitivity = 0.002;
        this.keyStates = {
            'w': false,
            's': false,
            'a': false,
            'd': false,
            'q': false,
            'e': false
        };
        this.isMouseDown = false;
        this.previousMousePosition = { x: 0, y: 0 };
        this.rotationEuler = new THREE.Euler(0, 0, 0, 'YXZ');
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        window.addEventListener('keydown', (event) => this.handleKeyDown(event));
        window.addEventListener('keyup', (event) => this.handleKeyUp(event));
        window.addEventListener('mousedown', (event) => this.handleMouseDown(event));
        window.addEventListener('mouseup', () => this.handleMouseUp());
        window.addEventListener('mousemove', (event) => this.handleMouseMove(event));
    }

    handleKeyDown(event) {
        if (this.keyStates.hasOwnProperty(event.key.toLowerCase())) {
            this.keyStates[event.key.toLowerCase()] = true;
        }
    }

    handleKeyUp(event) {
        if (this.keyStates.hasOwnProperty(event.key.toLowerCase())) {
            this.keyStates[event.key.toLowerCase()] = false;
        }
    }

    handleMouseDown(event) {
        this.isMouseDown = true;
        this.previousMousePosition.x = event.clientX;
        this.previousMousePosition.y = event.clientY;
    }

    handleMouseUp() {
        this.isMouseDown = false;
    }

    handleMouseMove(event) {
        if (!this.isMouseDown) return;

        const deltaX = event.clientX - this.previousMousePosition.x;
        const deltaY = event.clientY - this.previousMousePosition.y;

        // Update rotation euler
        this.rotationEuler.setFromQuaternion(window.camera.quaternion);

        // Apply rotations
        this.rotationEuler.y -= deltaX * this.mouseSensitivity;
        this.rotationEuler.x = Math.max(
            -Math.PI / 2.1, 
            Math.min(Math.PI / 2.1, 
            this.rotationEuler.x - deltaY * this.mouseSensitivity)
        );

        // Convert back to quaternion
        window.camera.quaternion.setFromEuler(this.rotationEuler);

        this.previousMousePosition.x = event.clientX;
        this.previousMousePosition.y = event.clientY;
    }

    updateMovement(camera, renderer) {
        if (!renderer.xr.isPresenting) {
            // Get forward and right vectors from camera's rotation
            const forward = new THREE.Vector3(0, 0, -1);
            const right = new THREE.Vector3(1, 0, 0);
            forward.applyQuaternion(camera.quaternion);
            right.applyQuaternion(camera.quaternion);

            // Zero out y component to keep movement horizontal
            forward.y = 0;
            right.y = 0;
            forward.normalize();
            right.normalize();

            if (this.keyStates['w']) {
                camera.position.addScaledVector(forward, this.moveSpeed);
            }
            if (this.keyStates['s']) {
                camera.position.addScaledVector(forward, -this.moveSpeed);
            }
            if (this.keyStates['a']) {
                camera.position.addScaledVector(right, -this.moveSpeed);
            }
            if (this.keyStates['d']) {
                camera.position.addScaledVector(right, this.moveSpeed);
            }
            if (this.keyStates['q']) {
                camera.position.y += this.moveSpeed;
            }
            if (this.keyStates['e']) {
                camera.position.y -= this.moveSpeed;
            }
        }
    }
}
