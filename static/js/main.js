/**
 * Main Application Entry Point
 * Coordinates all systems and components
 */
import * as THREE from 'three';
import { World } from 'three/addons/libs/ecsy.module.js';

// Import components and systems
import * as ECSComponents from './components/ECSComponents.js';
import * as ECSSystems from './systems/ECSSystems.js';
import { SceneManager } from './components/SceneManager.js';
import { WebXRManager } from './components/WebXRManager.js';
import { UIManager } from './components/UIManager.js';
import { VoiceChatSystem } from './components/VoiceChatSystem.js';
import { ControlsManager } from './utils/controls.js';
import { DateTimeUtils } from './utils/datetime.js';

export class ThreeJSApp {
    constructor() {
        this.world = new World();
        this.clock = new THREE.Clock();
        this.sceneManager = new SceneManager();
        this.webXRManager = new WebXRManager();
        this.uiManager = new UIManager();
        this.voiceChatSystem = new VoiceChatSystem();
        this.controlsManager = new ControlsManager();
        
        // Global references for backward compatibility
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.cubeEntities = [];
    }

    init() {
        this.setupContainer();
        this.initScene();
        this.initWebXR();
        this.setupGlobalReferences(); // Move this before ECS and UI init
        this.initECS();
        this.initUI();
        this.initVoiceChat();
        this.initControls();
        this.createCubes();
        this.setupEventListeners();
        this.startAnimation();
        
        // Start datetime updater
        DateTimeUtils.startDateTimeUpdater();
    }

    setupContainer() {
        this.container = document.createElement('div');
        document.body.appendChild(this.container);
    }

    initScene() {
        const sceneData = this.sceneManager.init(this.container);
        this.scene = sceneData.scene;
        this.camera = sceneData.camera;
        this.renderer = sceneData.renderer;
        
        this.renderer.setAnimationLoop(() => this.animate());
    }

    initWebXR() {
        this.webXRData = this.webXRManager.init(this.renderer, this.scene);
    }

    initECS() {
        // Register components
        this.world
            .registerComponent(ECSComponents.Object3D)
            .registerComponent(ECSComponents.Button)
            .registerComponent(ECSComponents.Intersectable)
            .registerComponent(ECSComponents.HandsInstructionText)
            .registerComponent(ECSComponents.OffsetFromCamera)
            .registerComponent(ECSComponents.NeedCalibration)
            .registerComponent(ECSComponents.Randomizable)
            .registerComponent(ECSComponents.Draggable);

        // Register systems
        this.world
            .registerSystem(ECSSystems.RandomizerSystem)
            .registerSystem(ECSSystems.InstructionSystem, { 
                controllers: this.webXRData.controllerGrips 
            })
            .registerSystem(ECSSystems.CalibrationSystem, { 
                renderer: this.renderer, 
                camera: this.camera 
            })
            .registerSystem(ECSSystems.ButtonSystem)
            .registerSystem(ECSSystems.DraggableSystem)
            .registerSystem(ECSSystems.HandRaySystem, { 
                handPointers: this.webXRData.handPointers 
            });
    }

    initUI() {
        this.uiManager.init(this.scene, this.world, this.sceneManager, this.voiceChatSystem);
    }

    initVoiceChat() {
        this.voiceChatSystem.init(this.scene);
    }

    initControls() {
        this.controlsManager.init();
    }

    createCubes() {
        // Create draggable cubes
        for (let i = 0; i < 20; i++) {
            const object = new THREE.Mesh(
                new THREE.BoxGeometry(0.15, 0.15, 0.15), 
                new THREE.MeshLambertMaterial({ color: 0xffffff })
            );
            object.visible = false;
            this.scene.add(object);

            const entity = this.world.createEntity();
            entity.addComponent(ECSComponents.Intersectable);
            entity.addComponent(ECSComponents.Randomizable);
            entity.addComponent(ECSComponents.Object3D, { object: object });
            entity.addComponent(ECSComponents.Draggable);

            this.cubeEntities.push(entity);
        }
    }

    setupGlobalReferences() {
        // Set global references for backward compatibility
        window.scene = this.scene;
        window.camera = this.camera;
        window.renderer = this.renderer;
        window.cubeEntities = this.cubeEntities;
        window.ECSComponents = ECSComponents;
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());
    }

    animate() {
        const delta = this.clock.getDelta();
        const elapsedTime = this.clock.elapsedTime;

        // Update controls
        this.controlsManager.updateMovement(this.camera, this.renderer);

        // Update UI positions
        this.uiManager.updatePositions(this.camera, this.renderer);

        // Update voice chat position
        this.voiceChatSystem.updatePosition(this.camera, this.renderer);

        // Update camera for XR
        this.renderer.xr.updateCamera(this.camera);

        // Execute ECS world
        this.world.execute(delta, elapsedTime);

        // Update scene animations
        this.sceneManager.updateAnimations();

        // Render scene
        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        this.sceneManager.onWindowResize();
    }

    startAnimation() {
        // Animation loop is handled by renderer.setAnimationLoop
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new ThreeJSApp();
    app.init();
});
