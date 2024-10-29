
const CAMERA_Y_PER_X = 0.5
const PIXELS_PER_METER = 10;

// The 3D frame defines x as down the hill, z as up to the sky, and y as across the hill.
export function getXYScreen(point) {
    return [
        point.y * PIXELS_PER_METER,
        -point.z * PIXELS_PER_METER + point.x * CAMERA_Y_PER_X * PIXELS_PER_METER
    ]
}


let CAMERA_UNIT_VECTOR = {x: -1, y:0, z: -CAMERA_Y_PER_X};
const len = Math.sqrt(CAMERA_UNIT_VECTOR.x * CAMERA_UNIT_VECTOR.x + CAMERA_UNIT_VECTOR.y * CAMERA_UNIT_VECTOR.y + CAMERA_UNIT_VECTOR.z * CAMERA_UNIT_VECTOR.z);
CAMERA_UNIT_VECTOR.x /= len;
CAMERA_UNIT_VECTOR.y /= len;
CAMERA_UNIT_VECTOR.z /= len;

function getSortDepth(point) {
    return point.x + point.z * CAMERA_Y_PER_X;
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
    constructor(points, frame, color, thickness) {
        this.points = points; // Array of points in the local frame of this segment
        this.frame = frame; // Reference frame for the segment
        this.worldPoints = this.points.map(point => frame.toWorld(point));
        this.color = color;
        this.thickness = thickness;
    }

    setFrame(frame) {
        this.frame = frame;
        this.worldPoints = this.points.map(point => frame.toWorld(point));
    }

    // Returns points in the world frame
    inWorldFrame() {
        return this.worldPoints;
    }

    averageX() {
        return (this.worldPoints[0].x + this.worldPoints[1].x) / 2;
    }

    averageY() {
        return (this.worldPoints[0].y + this.worldPoints[1].y) / 2;
    } 

    averageZ() {
        return (this.worldPoints[0].z + this.worldPoints[1].z) / 2;
    }

    draw(ctx) {
        const [x1, y1] = getXYScreen(this.worldPoints[0]);
        const [x2, y2] = getXYScreen(this.worldPoints[1]);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.thickness * PIXELS_PER_METER;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }
}

export class Ball {
    constructor(position, radius, frame, color) {
        this.position = position;
        this.radius = radius;
        this.frame = frame;
        this.color = color;
        this.worldPosition = this.frame.toWorld(this.position);
    }

    setFrame(frame) {
        this.frame = frame;
        this.worldPosition = this.frame.toWorld(this.position);
    }

    averageX() {
        return this.worldPosition.x;
    }

    averageY() {
        return this.worldPosition.y;
    }

    averageZ() {
        return this.worldPosition.z;
    }

    draw(ctx) {
        const [x, y] = getXYScreen(this.worldPosition);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(x, y, this.radius * PIXELS_PER_METER, 0, 2 * Math.PI);
        ctx.fill();
    }

}

class Hemisphere {
    constructor(radius, liftRadius, frame, color, baseColor) {
        this.radius = radius;
        this.liftRadius = liftRadius;
        this.frame = frame;
        this.color = color;
        this.baseColor = baseColor;
        this.positionInWorldFrame = this.frame.toWorld({x: 0, y: 0, z: 0});
    }

    averageX() {
        return this.positionInWorldFrame.x;
    }

    averageY() {
        return this.positionInWorldFrame.y;
    }

    averageZ() {
        return this.positionInWorldFrame.z;
    }

    drawBase(ctx, squash, color) {
        ctx.save(); {
            ctx.scale(squash, 1);
            ctx.beginPath();
            ctx.fillStyle = color;
            ctx.arc(0, 0, this.radius * PIXELS_PER_METER, 0, 2 * Math.PI);
            ctx.fill();
        } ctx.restore();
    }

    drawLift(ctx, squash, color) {
        ctx.save(); {
            ctx.scale(squash, 1);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * PIXELS_PER_METER, 3 * Math.PI / 2, Math.PI / 2, );
            ctx.fill();
        } ctx.restore();
    }

    draw(ctx) {
        ctx.fillStyle = this.baseColor;

        const center = getXYScreen(this.positionInWorldFrame);
        const topPoint = this.frame.toWorld({x: 0, y: 0, z: 1.0});
        const topUnit = getXYScreen(topPoint);
        const unitVector3D = {x: topPoint.x - this.positionInWorldFrame.x, y: topPoint.y - this.positionInWorldFrame.y, z: topPoint.z - this.positionInWorldFrame.z};
        
        const crossProduct = {
            x: unitVector3D.y * CAMERA_UNIT_VECTOR.z - unitVector3D.z * CAMERA_UNIT_VECTOR.y, 
            y: unitVector3D.z * CAMERA_UNIT_VECTOR.x - unitVector3D.x * CAMERA_UNIT_VECTOR.z, 
            z: unitVector3D.x * CAMERA_UNIT_VECTOR.y - unitVector3D.y * CAMERA_UNIT_VECTOR.x};
        const newVectorEndpoint = {x: this.positionInWorldFrame.x + crossProduct.x, y: this.positionInWorldFrame.y + crossProduct.y, z: this.positionInWorldFrame.z + crossProduct.z};
        const EndPointInPixels = getXYScreen(newVectorEndpoint);
        const vectorAtExtreme = {x: EndPointInPixels[0] - center[0], y: EndPointInPixels[1] - center[1]};
        const vectorToTop = {x: topUnit[0] - center[0], y: topUnit[1] - center[1]};
        const angleFromVertical = Math.atan2(vectorAtExtreme.y, vectorAtExtreme.x) + Math.PI / 2;
        let squash = 1 - Math.sqrt(vectorToTop.x * vectorToTop.x + vectorToTop.y * vectorToTop.y) / PIXELS_PER_METER;

        ctx.save(); {
            ctx.translate(center[0], center[1]);
            ctx.rotate(angleFromVertical);
            if (getSortDepth(this.positionInWorldFrame) > getSortDepth(topPoint)) {
                this.drawLift(ctx, this.liftRadius / this.radius, this.color);
                this.drawBase(ctx, squash, this.baseColor);
            } else {
                this.drawLift(ctx, this.liftRadius / this.radius, this.color);
                this.drawBase(ctx, squash, this.color);
            }

        } ctx.restore();
    }
}

export class Polygon {
    constructor(points, frame, color) {
        this.points = points.map(point => frame.toWorld(point));
        this.frame = frame;
        this.color = color;
    }

    setFrame(frame) {
        this.frame = frame;
        this.points = this.points.map(point => frame.toWorld(point));
    }

    averageX() {
        return this.points.map(point => point.x).reduce((a, b) => a + b, 0) / this.points.length;
    }   

    averageY() {
        return this.points.map(point => point.y).reduce((a, b) => a + b, 0) / this.points.length;
    }

    averageZ() {
        return this.points.map(point => point.z).reduce((a, b) => a + b, 0) / this.points.length;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        this.points.forEach(point => {
            const [x, y] = getXYScreen(point);
            ctx.lineTo(x, y);
        });
        ctx.fill();
    }
}

export class BodySegment {
    constructor(first_point, second_point, frame, color) {
        this.frame = frame;
        this.points = [first_point.position, second_point.position];
        this.first_point = first_point;
        this.second_point = second_point;
        this.color = color;
        this.worldPoints = this.points.map(point => frame.toWorld(point));
    }

    setFrame(frame) {
        this.frame = frame;      
        this.worldPoints = this.points.map(point => frame.toWorld(point));
    }

    averageX() {
        return (this.worldPoints[0].x + this.worldPoints[1].x) / 2;
    }

    averageY() {
        return (this.worldPoints[0].y + this.worldPoints[1].y) / 2;
    }

    averageZ() {
        return (this.worldPoints[0].z + this.worldPoints[1].z) / 2;
    }

    draw(ctx) {
        const [x1, y1] = getXYScreen(this.worldPoints[0]);
        const [x2, y2] = getXYScreen(this.worldPoints[1]);
        
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

    lineSegment(points, frame, color, thickness, layer) {
        const segment = new LineSegment(points, frame, color, thickness);
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

    hemisphere(radius, liftRadius, frame, color, baseColor, layer) {
        const hemisphere = new Hemisphere(radius, liftRadius, frame, color, baseColor);
        this.addComponent(hemisphere, layer);
        return hemisphere;
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