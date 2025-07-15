import GoblinModel from './goblin_model.js';
import OrkModel from './ork_model.js';
import TrollModel from './troll_model.js';
import SnowmobileModel from './snowmobile_model.js';

class ModelViewer {
    constructor() {
        this.canvas = document.getElementById('modelCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Initialize models
        this.models = [
            {
                name: 'Snowmobile',
                model: new SnowmobileModel(),
                controls: [
                    { id: 'skiAngle', label: 'Ski Angle', min: -2 * Math.PI, max: 2 * Math.PI, step: 0.1, value: Math.PI / 4 },
                    { id: 'steeringAngle', label: 'Steering Angle', min: -Math.PI / 4, max: Math.PI / 4, step: 0.01, value: 0 },
                    { id: 'forwardLean', label: 'Forward Lean', min: -Math.PI / 4, max: Math.PI / 4, step: 0.01, value: 0 }
                ],
                updateArgs: (dt, skiAngle, values) => [
                    dt, 
                    (values.skiAngle || 0) % (2 * Math.PI),
                    values.steeringAngle || 0,
                    values.forwardLean || 0
                ]
            },
            {
                name: 'Goblin',
                model: new GoblinModel(),
                controls: [
                    { id: 'pizzaAngle', label: 'Pizza Angle', min: -0.5, max: 0.5, step: 0.1, value: 0 },
                    { id: 'armPinwheelAngle1', label: 'Left Arm Angle', min: -1, max: 1, step: 0.1, value: 0 },
                    { id: 'armPinwheelAngle2', label: 'Right Arm Angle', min: -1, max: 1, step: 0.1, value: 0 }
                ],
                updateArgs: (dt, skiAngle, values) => [
                    dt, 
                    skiAngle, 
                    values.pizzaAngle || 0, 
                    values.armPinwheelAngle1 || 0, 
                    values.armPinwheelAngle2 || 0
                ]
            },
            {
                name: 'Ork',
                model: new OrkModel(),
                controls: [
                    { id: 'crouchAngle', label: 'Crouch Angle', min: 0, max: 1, step: 0.01, value: 0 },
                    { id: 'spearAngle', label: 'Spear Angle', min: -1, max: 1, step: 0.01, value: 0 },
                    { id: 'torsoTurn', label: 'Torso Turn', min: -1, max: 1, step: 0.1, value: 0 },
                    { id: 'pokingSpear', label: 'Poking Spear', min: 0, max: 1, step: 1, value: 0, type: 'checkbox' }
                ],
                updateArgs: (dt, skiAngle, values) => [
                    dt, 
                    skiAngle, 
                    values.crouchAngle || 0, 
                    values.spearAngle || 0, 
                    values.torsoTurn || 0, 
                    values.pokingSpear || false
                ]
            },
            {
                name: 'Troll',
                model: new TrollModel(),
                controls: [
                    { id: 'skiAngle', label: 'Ski Angle', min: -2 * Math.PI, max: 2 * Math.PI, step: 0.1, value: 0 },
                    { id: 'legAngle', label: 'Leg Angle', min: -0.5, max: 0.5, step: 0.1, value: 0 },
                    { id: 'angleToTarget', label: 'Angle to Target', min: -Math.PI, max: Math.PI, step: 0.1, value: 0 },
                    { id: 'armDown', label: 'Arm Down', min: 0, max: 1, step: 0.1, value: 0 }
                ],
                updateArgs: (dt, skiAngle, values) => [
                    dt, 
                    (values.skiAngle || 0) % (2 * Math.PI), 
                    values.legAngle || 0, 
                    values.angleToTarget || 0, 
                    values.armDown || 0
                ]
            }
        ];
        
        // Current model index - start with Snowmobile (index 0)
        this.currentModelIndex = 0;
        this.updateModelInfo();
        
        // Animation state
        this.skiAngle = Math.PI / 4;
        this.rotationSpeed = 1.0; // Fixed at 1.0
        this.lastTime = 0;
        this.controlValues = {};
        
        // Setup navigation
        this.setupNavigation();
        
        // Setup initial controls
        this.updateControls();
        
        // Start animation loop
        this.animate();
    }
    
    setupNavigation() {
        const prevButton = document.getElementById('prevModel');
        const nextButton = document.getElementById('nextModel');
        
        prevButton.addEventListener('click', () => {
            this.currentModelIndex = (this.currentModelIndex - 1 + this.models.length) % this.models.length;
            this.updateControls();
            this.updateModelInfo();
        });
        
        nextButton.addEventListener('click', () => {
            this.currentModelIndex = (this.currentModelIndex + 1) % this.models.length;
            this.updateControls();
            this.updateModelInfo();
        });
    }
    
    updateControls() {
        const controlsContainer = document.getElementById('controls');
        const currentModel = this.models[this.currentModelIndex];
        
        // Clear existing controls
        controlsContainer.innerHTML = '';
        
        // Create controls for current model
        currentModel.controls.forEach(control => {
            const controlGroup = document.createElement('div');
            controlGroup.className = 'control-group';
            
            const label = document.createElement('label');
            label.textContent = control.label;
            label.htmlFor = control.id;
            
            const input = document.createElement('input');
            input.id = control.id;
            input.type = control.type || 'range';
            input.min = control.min;
            input.max = control.max;
            input.step = control.step;
            input.value = this.controlValues[control.id] || control.value;
            
            // Handle checkbox differently
            if (control.type === 'checkbox') {
                input.type = 'checkbox';
                input.checked = this.controlValues[control.id] || control.value;
                input.addEventListener('change', (e) => {
                    this.controlValues[control.id] = e.target.checked;
                });
            } else {
                input.addEventListener('input', (e) => {
                    this.controlValues[control.id] = parseFloat(e.target.value);
                });
            }
            
            controlGroup.appendChild(label);
            controlGroup.appendChild(input);
            controlsContainer.appendChild(controlGroup);
        });
    }
    
    updateModelInfo() {
        const currentModel = this.models[this.currentModelIndex];
        document.getElementById('modelName').textContent = currentModel.name;
    }
    
    update(dt) {
        // Update ski angle for rotation (only for non-manual models)
        if (this.currentModelIndex !== 0 && this.currentModelIndex !== 3) { // Not Snowmobile or Troll
            this.skiAngle += this.rotationSpeed * dt;
        }
        
        // Update current model
        const currentModel = this.models[this.currentModelIndex];
        const updateArgs = currentModel.updateArgs(dt, this.skiAngle, this.controlValues);
        currentModel.model.update(...updateArgs);
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#F4F4F8';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Save context for transformations
        this.ctx.save();
        
        // Center the canvas
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        
        // Scale for better visibility
        this.ctx.scale(3, 3);
        
        // Draw current model
        const currentModel = this.models[this.currentModelIndex];
        currentModel.model.draw(this.ctx);
        
        // Restore context
        this.ctx.restore();
    }
    
    animate(currentTime = 0) {
        // Calculate delta time
        const dt = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        // Cap delta time to prevent large jumps
        const clampedDt = Math.min(dt, 1/30);
        
        // Update and draw
        this.update(clampedDt);
        this.draw();
        
        // Continue animation loop
        requestAnimationFrame((time) => this.animate(time));
    }
}

// Initialize the viewer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new ModelViewer();
}); 