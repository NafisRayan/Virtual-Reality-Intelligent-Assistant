/**
 * Scene Manager - Handles Three.js scene setup and 3D environment
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class SceneManager {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.models = [];
        this.roof = null;
        this.floor = null;
        this.isVideoVisible = false;
        this.verticalOffset = -0.1;
        this.scaleF = 1.1;
    }

    init(container) {
        this.createScene();
        this.createCamera();
        this.createRenderer(container);
        this.createLighting();
        this.createEnvironment();
        this.loadModels();
        
        return {
            scene: this.scene,
            camera: this.camera,
            renderer: this.renderer
        };
    }

    createScene() {
        this.scene = new THREE.Scene();
        this.scene.background = this.isVideoVisible ? null : new THREE.TextureLoader().load('/assets/sky_texture.jpg');
    }

    createCamera() {
        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, 1.2, 0.3);
    }

    createRenderer(container) {
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.xr.enabled = true;
        this.renderer.xr.cameraAutoUpdate = false;
        container.appendChild(this.renderer.domElement);
    }

    createLighting() {
        // Hemisphere light
        const hemisphereLight = new THREE.HemisphereLight(0xcccccc, 0x999999, 3);
        this.scene.add(hemisphereLight);

        // Directional light
        const light = new THREE.DirectionalLight(0xffffff, 3);
        light.position.set(0, 6, 0);
        light.castShadow = true;
        light.shadow.camera.top = 2;
        light.shadow.camera.bottom = -2;
        light.shadow.camera.right = 2;
        light.shadow.camera.left = -2;
        light.shadow.mapSize.set(4096, 4096);
        this.scene.add(light);
    }

    createEnvironment() {
        // Create floor
        const floorGeometry = new THREE.PlaneGeometry(4, 4);
        const floorMaterial = new THREE.MeshPhongMaterial({ color: 0x222222 });
        this.floor = new THREE.Mesh(floorGeometry, floorMaterial);
        this.floor.rotation.x = -Math.PI / 2;
        this.floor.receiveShadow = true;

        if (!this.isVideoVisible) {
            // Uncomment to add floor: this.scene.add(this.floor);
        }

        // Create pitched roof
        this.createRoof();
    }

    createRoof() {
        const roofHeight = 0.5;
        const roofWidth = 5;
        const roofDepth = 5;

        const roofGeometry = new THREE.BufferGeometry();
        const vertices = new Float32Array([
            // Front face
            -roofWidth/2, 0, roofDepth/2,
            roofWidth/2, 0, roofDepth/2,
            0, roofHeight, 0,
            
            // Back face
            -roofWidth/2, 0, -roofDepth/2,
            roofWidth/2, 0, -roofDepth/2,
            0, roofHeight, 0,
            
            // Left face
            -roofWidth/2, 0, -roofDepth/2,
            -roofWidth/2, 0, roofDepth/2,
            0, roofHeight, 0,
            
            // Right face
            roofWidth/2, 0, -roofDepth/2,
            roofWidth/2, 0, roofDepth/2,
            0, roofHeight, 0,
        ]);

        const indices = new Uint16Array([
            0, 1, 2,  // Front
            3, 4, 5,  // Back
            6, 7, 8,  // Left
            9, 10, 11 // Right
        ]);

        roofGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        roofGeometry.setIndex(new THREE.BufferAttribute(indices, 1));
        roofGeometry.computeVertexNormals();

        const roofMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x000000,
            shininess: 30,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9
        });

        this.roof = new THREE.Mesh(roofGeometry, roofMaterial);
        this.roof.position.set(4.00, 2.8, 2.50);
        this.roof.scale.set(6, 6, 6);
        this.scene.add(this.roof);
    }

    loadModels() {
        const modelsFolders = [
            { 
                folder: 'apartment_construction', 
                scale: [1 * this.scaleF, 1 * this.scaleF, 1 * this.scaleF], 
                position: [4.00, -0.2, 2.50],
                rotation: [0, 0, 0], 
                animation: false 
            }
        ];

        const loader = new GLTFLoader();
        modelsFolders.forEach((modelData) => {
            loader.load(
                `assets/models/${modelData.folder}/scene.gltf`,
                (gltf) => {
                    const model = gltf.scene;
                    model.rotation.set(...(modelData.rotation || [0, 0, 0]));

                    if (modelData.animation) {
                        model.mixer = new THREE.AnimationMixer(model);
                        model.mixer.clipAction(gltf.animations[0]).play();
                    }

                    model.scale.set(...modelData.scale);
                    model.position.set(...modelData.position);

                    this.scene.add(model);
                    this.models.push(model);
                },
                undefined,
                (error) => {
                    console.error(`An error occurred while loading ${modelData.folder}:`, error);
                }
            );
        });
    }

    toggleVideoBackground() {
        this.isVideoVisible = !this.isVideoVisible;
        const videoElement = document.getElementById('video-background');
        if (videoElement) {
            videoElement.style.display = this.isVideoVisible ? 'block' : 'none';
        }
        this.scene.background = this.isVideoVisible ? null : new THREE.TextureLoader().load('assets/sky_texture.jpg');
        return this.isVideoVisible;
    }

    toggleModels() {
        this.models.forEach(model => {
            model.visible = !model.visible;
        });
        if (this.roof) {
            this.roof.visible = !this.roof.visible;
        }
    }

    updateAnimations() {
        this.models.forEach((model) => {
            if (model && model.mixer) {
                model.mixer.update(0.016);
            }
        });
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    getVerticalOffset() {
        return this.verticalOffset;
    }

    getModels() {
        return this.models;
    }

    getRoof() {
        return this.roof;
    }
}
