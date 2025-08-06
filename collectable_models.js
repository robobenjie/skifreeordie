import { KinematicRenderer } from './kinematic_renderer.js';

const YELLOW = "#FFFF00";

// Gradient color stops for the coin gradient
const GRADIENT_STOPS = [
    { position: 0, color: { r: 237, g: 221, b: 83 }},
    { position: 0.23, color: { r: 218, g: 202, b: 139 } },
    { position: 0.33, color: { r: 255, g: 255, b: 255 } },
    { position: 0.39, color: { r: 255, g: 249, b: 196 } },
    { position: 1, color: { r: 237, g: 221, b: 83 } }
];

function calculateGradientColor(rotation) {
    // Normalize rotation to 0-1 range (0 to 2π)
    let normalizedRotation = (rotation % (2 * Math.PI)) / (2 * Math.PI);
    if (normalizedRotation < 0) normalizedRotation += 1;
    
    // Find the two stops that bracket our position
    let startStop = null;
    let endStop = null;
    
    for (let i = 0; i < GRADIENT_STOPS.length - 1; i++) {
        if (normalizedRotation >= GRADIENT_STOPS[i].position && 
            normalizedRotation <= GRADIENT_STOPS[i + 1].position) {
            startStop = GRADIENT_STOPS[i];
            endStop = GRADIENT_STOPS[i + 1];
            break;
        }
    }
    
    // If we're at the end, use the last stop
    if (!startStop) {
        startStop = GRADIENT_STOPS[GRADIENT_STOPS.length - 2];
        endStop = GRADIENT_STOPS[GRADIENT_STOPS.length - 1];
    }
    
    // Calculate interpolation factor
    const range = endStop.position - startStop.position;
    const factor = range === 0 ? 0 : (normalizedRotation - startStop.position) / range;
    
    // Interpolate between the two colors
    const r = Math.round(startStop.color.r + (endStop.color.r - startStop.color.r) * factor);
    const g = Math.round(startStop.color.g + (endStop.color.g - startStop.color.g) * factor);
    const b = Math.round(startStop.color.b + (endStop.color.b - startStop.color.b) * factor);
    
    return `rgb(${r}, ${g}, ${b})`;
}

export class Coin {
    constructor(radius = 0.5) {
        this.model = new KinematicRenderer(2);
        const baseFrame = this.model.frame();
        const coinFrame = baseFrame
            .translate(0, 0, 0, "translation", true)
            .rotate_about_x(Math.PI/2)
            .rotate_about_y(0, "rotation", true);

        
        this.model.circle({x: 0, y: 0, z: 0}, radius, coinFrame, {dynamic: true, name: "color", value: YELLOW}, 1, {color: "#EDDD53", thickness: 2});

        this.params = {
            rotation: 0,
            translation: {x: 0, y: 0, z: 0},
            color: YELLOW
        }
    }

    update(dt, rotation, height) {
        const gradientColor = calculateGradientColor(rotation);
        this.params.rotation = rotation;
        this.params.translation.z = height;
        this.params.color = gradientColor;
        this.model.update(dt, this.params);
    }

    draw(ctx) {
        this.model.draw(ctx);
    }
}