
const CAMERA_Y_PER_X = 0.5
const PIXELS_PER_METER = 10;

// The 3D frame defines x as down the hill, z as up to the sky, and y as across the hill.
function getXYScreen(point) {
    return [
        point.y * PIXELS_PER_METER,
        -point.z * PIXELS_PER_METER + point.x * CAMERA_Y_PER_X * PIXELS_PER_METER
    ]
}

export class Frame {
    constructor(parent = null) {
        this.parent = parent;
        this.translation = { x: 0, y: 0, z: 0 };
        this.rotation = { x: 0, y: 0, z: 0 }; // Store rotations in radians
        this.sinRotation = { x: 0, y: 0, z: 0 }; // Store sin of rotations
        this.cosRotation = { x: 1, y: 1, z: 1 }; // Store cos of rotations
        this.name = null;
    }

    // Rotate about X-axis by a specified radians
    rotate_about_x(rad, name = null) {
        const newFrame = new Frame(this);
        newFrame.rotation.x = rad;
        newFrame.sinRotation.x = Math.sin(rad);
        newFrame.cosRotation.x = Math.cos(rad);
        newFrame.name = name;
        return newFrame;
    }

    // Rotate about Y-axis by a specified radians
    rotate_about_y(rad, name = null) {
        const newFrame = new Frame(this);
        newFrame.rotation.y = rad;
        newFrame.sinRotation.y = Math.sin(rad);
        newFrame.cosRotation.y = Math.cos(rad);
        newFrame.name = name;
        return newFrame;
    }

    // Rotate about Z-axis by a specified radians
    rotate_about_z(rad, name = null) {
        const newFrame = new Frame(this);
        newFrame.rotation.z = rad;
        newFrame.sinRotation.z = Math.sin(rad);
        newFrame.cosRotation.z = Math.cos(rad);
        newFrame.name = name;
        return newFrame;
    }

    // Translate in 3D space by specified x, y, z
    translate(x, y, z, name = null) {
        const newFrame = new Frame(this);
        newFrame.translation = { x, y, z };
        newFrame.name = name;
        return newFrame;
    }

    // Helper function to apply rotation matrix
    applyRotation(point, rotation, sinRotation, cosRotation) {
        const { x, y, z } = point;

        // Rotate about X-axis
        const xRot = { x, y: y * cosRotation.x - z * sinRotation.x, z: y * sinRotation.x + z * cosRotation.x };

        // Rotate about Y-axis
        const yRot = { x: xRot.x * cosRotation.y + xRot.z * sinRotation.y, y: xRot.y, z: -xRot.x * sinRotation.y + xRot.z * cosRotation.y };

        // Rotate about Z-axis
        return { x: yRot.x * cosRotation.z - yRot.y * sinRotation.z, y: yRot.x * sinRotation.z + yRot.y * cosRotation.z, z: yRot.z };
    }

    // Calculates the world frame position of a local point by chaining transformations
    toWorld(point, targetFrame = null) {
        let transformedPoint = { ...point };

        // Chain transformations from this frame to the root
        let currentFrame = this;
        while (currentFrame) {
            // Apply translation first
            transformedPoint = {
                x: transformedPoint.x + currentFrame.translation.x,
                y: transformedPoint.y + currentFrame.translation.y,
                z: transformedPoint.z + currentFrame.translation.z
            };

            // Then apply rotation
            transformedPoint = currentFrame.applyRotation(transformedPoint, currentFrame.rotation, currentFrame.sinRotation, currentFrame.cosRotation);

            // Move up the chain to parent frame
            currentFrame = currentFrame.parent;
            if (targetFrame && currentFrame.name === targetFrame) {
                break;
            }
        }

        return transformedPoint;
    }
}

// Primitive line segment, defined by two points in a given frame
class LineSegment {
    constructor(points, frame) {
        this.points = points; // Array of points in the local frame of this segment
        this.frame = frame; // Reference frame for the segment
        this.worldPoints = this.points.map(point => this.frame.toWorld(point));
    }

    setFrame(frame) {
        this.frame = frame;
        this.worldPoints = this.points.map(point => frame.toWorld(point));
    }

    // Returns points in the world frame
    inWorldFrame() {
        return this.worldPoints;
    }
}

export class Ball {
    constructor(position, radius, frame, color) {
        this.position = position;
        this.radius = radius;
        this.frame = frame;
        this.color = color;
    }

    setFrame(frame) {
        this.frame = frame;
    }

    averageX() {
        return this.frame.toWorld(this.position).x;
    }

    averageY() {
        return this.frame.toWorld(this.position).y;
    }

    averageZ() {
        return this.frame.toWorld(this.position).z;
    }

    draw(ctx) {
        const worldPosition = this.frame.toWorld(this.position);
        const [x, y] = getXYScreen(worldPosition);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(x, y, this.radius * PIXELS_PER_METER, 0, 2 * Math.PI);
        ctx.fill();
    }


}

export class Polygon {
    constructor(points, frame, color) {
        this.points = points;
        this.frame = frame;
        this.color = color;
    }

    setFrame(frame) {
        this.frame = frame;
        this.points = this.points.map(point => frame.toWorld(point));
    }

    averageX() {
        return this.points.map(point => this.frame.toWorld(point).x).reduce((a, b) => a + b, 0) / this.points.length;
    }   

    averageY() {
        return this.points.map(point => this.frame.toWorld(point).y).reduce((a, b) => a + b, 0) / this.points.length;
    }

    averageZ() {
        return this.points.map(point => this.frame.toWorld(point).z).reduce((a, b) => a + b, 0) / this.points.length;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        this.points.forEach(point => {
            const [x, y] = getXYScreen(this.frame.toWorld(point));
            ctx.lineTo(x, y);
        });
        ctx.fill();
    }
}

export class BodySegment {
    constructor(first_point, second_point, frame, color) {
        this.segment = new LineSegment([first_point.position, second_point.position], frame);
        this.first_point = first_point;
        this.second_point = second_point;
        this.color = color;
    }

    setFrame(frame) {
        this.segment.frame = frame;
        this.segment.worldPoints = this.segment.points.map(point => frame.toWorld(point));
    }

    averageX() {
        return (this.segment.worldPoints[0].x + this.segment.worldPoints[1].x) / 2;
    }

    averageY() {
        return (this.segment.worldPoints[0].y + this.segment.worldPoints[1].y) / 2;
    }

    averageZ() {
        return (this.segment.worldPoints[0].z + this.segment.worldPoints[1].z) / 2;
    }

    draw(ctx) {
        const [x1, y1] = getXYScreen(this.segment.worldPoints[0]);
        const [x2, y2] = getXYScreen(this.segment.worldPoints[1]);
        
        const r1 = this.first_point.radius * PIXELS_PER_METER;
        const r2 = this.second_point.radius * PIXELS_PER_METER;
        
        // Calculate the direction vector
        const dx = x2 - x1;
        const dy = y2 - y1;
        
        // Calculate the length (norm) of the direction vector
        const norm = Math.sqrt(dx * dx + dy * dy);
        
        // Calculate the unit perpendicular vector
        const perpX = dy / norm;
        const perpY = -dx / norm;
        
        ctx.fillStyle = this.color;

        
        // Draw the first circle
        
        if (this.first_point.skip !== true) {
            ctx.beginPath();
            ctx.arc(x1, y1, r1, 0, 2 * Math.PI);
            ctx.closePath();
            ctx.fill();
        }
        
        // Draw the trapezoid
        ctx.beginPath();
        ctx.moveTo(x1 + r1 * perpX, y1 + r1 * perpY);
        ctx.lineTo(x2 + r2 * perpX, y2 + r2 * perpY);
        ctx.lineTo(x2 - r2 * perpX, y2 - r2 * perpY);
        ctx.lineTo(x1 - r1 * perpX, y1 - r1 * perpY);
        ctx.closePath();
        ctx.fill();

        
        // Draw the second circle
        if (this.second_point.skip !== true) {  
            ctx.beginPath();
            ctx.arc(x2, y2, r2, 0, 2 * Math.PI);
            ctx.closePath();
            ctx.fill();
        }
    }

}

export class KinematicRenderer {
    constructor(num_layers = 1) {
        this.num_layers = num_layers;
        this.components = [];
        for (let i = 0; i < num_layers; i++) {
            this.components.push([]);
        }
    }

    frame() {
        return new Frame();
    }

    bodySegment(first_point, second_point, frame, color, layer) {
        const segment = new BodySegment(first_point, second_point, frame, color);
        this.addComponent(segment, layer);
        return segment;
    }

    ball(position, radius, frame, color, layer) {
        const ball = new Ball(position, radius, frame, color);
        this.addComponent(ball, layer);
        return ball;
    }

    polygon(points, frame, color, layer) {
        const polygon = new Polygon(points, frame, color);
        this.addComponent(polygon, layer);
        return polygon;
    }

    addComponent(component, layer) {
        this.components[layer].push(component);
    }

    draw(ctx) {
        for (let layer = 0; layer < this.num_layers; layer++) {
            let sortedByX = this.components[layer].sort((a, b) => (a.averageX() + a.averageZ() * CAMERA_Y_PER_X) - (b.averageX() + b.averageZ() * CAMERA_Y_PER_X));
            for (let component of sortedByX) {
                component.draw(ctx);
            }
        }
    }
}

export default { Frame, LineSegment, BodySegment };