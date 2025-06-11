/**
 * WebXR Manager - Handles VR/AR setup and hand tracking
 */
import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { OculusHandModel } from 'three/addons/webxr/OculusHandModel.js';
import { OculusHandPointerModel } from 'three/addons/webxr/OculusHandPointerModel.js';
import { createText } from 'three/addons/webxr/Text2D.js';

export class WebXRManager {
    constructor() {
        this.controllers = [];
        this.hands = [];
        this.handPointers = [];
        this.controllerGrips = [];
    }

    init(renderer, scene) {
        this.setupWebXR(renderer);
        this.setupControllers(renderer, scene);
        this.setupHands(renderer, scene);
        this.createInstructionText(scene);
        
        return {
            controllers: this.controllers,
            hands: this.hands,
            handPointers: this.handPointers,
            controllerGrips: this.controllerGrips
        };
    }

    setupWebXR(renderer) {
        const sessionInit = {
            requiredFeatures: ['hand-tracking']
        };

        document.body.appendChild(VRButton.createButton(renderer, sessionInit));
    }

    setupControllers(renderer, scene) {
        const controllerModelFactory = new XRControllerModelFactory();

        // Controller 1
        const controller1 = renderer.xr.getController(0);
        scene.add(controller1);
        this.controllers.push(controller1);

        const controllerGrip1 = renderer.xr.getControllerGrip(0);
        controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
        scene.add(controllerGrip1);
        this.controllerGrips.push(controllerGrip1);

        // Controller 2
        const controller2 = renderer.xr.getController(1);
        scene.add(controller2);
        this.controllers.push(controller2);

        const controllerGrip2 = renderer.xr.getControllerGrip(1);
        controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
        scene.add(controllerGrip2);
        this.controllerGrips.push(controllerGrip2);
    }

    setupHands(renderer, scene) {
        // Hand 1
        const hand1 = renderer.xr.getHand(0);
        hand1.add(new OculusHandModel(hand1));
        const handPointer1 = new OculusHandPointerModel(hand1, this.controllers[0]);
        hand1.add(handPointer1);
        scene.add(hand1);
        this.hands.push(hand1);
        this.handPointers.push(handPointer1);

        // Hand 2
        const hand2 = renderer.xr.getHand(1);
        hand2.add(new OculusHandModel(hand2));
        const handPointer2 = new OculusHandPointerModel(hand2, this.controllers[1]);
        hand2.add(handPointer2);
        scene.add(hand2);
        this.hands.push(hand2);
        this.handPointers.push(handPointer2);
    }

    createInstructionText(scene) {
        const instructionText = createText('This is a WebXR Hands demo, please explore with hands.', 0.04);
        instructionText.material.opacity = 1;
        instructionText.material.transparent = true;
        instructionText.position.set(0, 1.6, -0.6);
        scene.add(instructionText);

        const exitText = createText('Exiting session...', 0.04);
        exitText.material.opacity = 1;
        exitText.material.transparent = true;
        exitText.position.set(0, 1.5, -0.6);
        exitText.visible = false;
        scene.add(exitText);

        return { instructionText, exitText };
    }

    getHandPointers() {
        return this.handPointers;
    }

    getControllerGrips() {
        return this.controllerGrips;
    }
}
