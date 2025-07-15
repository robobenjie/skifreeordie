import { setFillColor, clipPath } from "./utils.js";
const CAMERA_Y_PER_X = 0.5;
const PIXELS_PER_METER = 10;

const IDENTITY_MATRIX = [
    [1, 0, 0],
    [0, 1, 0], 
    [0, 0, 1]
];

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
        // Store single 3x3 rotation matrix, initialized as identity matrix
        this.rotationMatrix = IDENTITY_MATRIX;
        this.name = null;
        this.staticCachedTransformTo = null;
        this.dynamicCachedTransformTo = null;
        this.dynamic = false;
        this.update_callback = null;
    }

    reset() {
        this.dynamicCachedTransformTo = null;
    }

    calculateStaticCachedTransformTo() {
        // First find the next dynamic parent
        let nextDynamicParent = this.parent;
        while (nextDynamicParent !== null && !nextDynamicParent.dynamic) {
            nextDynamicParent = nextDynamicParent.parent;
        }
        
        // Calculate transform from this frame to the next dynamic parent
        const transform = this.parent ? this.getTransformTo(nextDynamicParent) : {
            rotationMatrix: IDENTITY_MATRIX,
            translation: {x: 0, y: 0, z: 0}
        };

        this.staticCachedTransformTo = {
            frame: nextDynamicParent,
            transform: transform
        };
    }

    getRotationAboutX(rad) {
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        return [
            [1, 0, 0],
            [0, cos, -sin],
            [0, sin, cos]
        ];
    }

    getRotationAboutY(rad) {
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        return [
            [cos, 0, sin],
            [0, 1, 0],
            [-sin, 0, cos]
        ];
    }

    getRotationAboutZ(rad) {
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        return [
            [cos, -sin, 0],
            [sin, cos, 0],
            [0, 0, 1]
        ];
    }

    // Rotate about X-axis by a specified radians
    rotate_about_x(rad, name = null, dynamic = false) {
        const newFrame = new Frame(this);
        newFrame.rotationMatrix = this.getRotationAboutX(rad);
        newFrame.name = name;
        newFrame.dynamic = dynamic;
        newFrame.calculateStaticCachedTransformTo();
        if (dynamic) {
            newFrame.update_callback = (rad) => {
                newFrame.rotationMatrix = this.getRotationAboutX(rad);
            }
        }
        return newFrame;
    }

    // Rotate about Y-axis by a specified radians 
    rotate_about_y(rad, name = null, dynamic = false) {
        const newFrame = new Frame(this);
        newFrame.rotationMatrix = this.getRotationAboutY(rad);
        newFrame.name = name;
        newFrame.dynamic = dynamic;
        newFrame.calculateStaticCachedTransformTo();
        if (dynamic) {
            newFrame.update_callback = (rad) => {
                newFrame.rotationMatrix = this.getRotationAboutY(rad);
            }
        }
        return newFrame;
    }

    rotate_about_z(rad, name = null, dynamic = false) {
        const newFrame = new Frame(this);
        newFrame.rotationMatrix = this.getRotationAboutZ(rad);
        newFrame.name = name;
        newFrame.dynamic = dynamic;
        newFrame.calculateStaticCachedTransformTo();
        if (dynamic) {
            newFrame.update_callback = (rad) => {
                newFrame.rotationMatrix = this.getRotationAboutZ(rad);
            }
        }
        return newFrame;
    }

    // Translate in 3D space by specified x, y, z
    translate(x, y, z, name = null, dynamic = false) {
        const newFrame = new Frame(this);
        newFrame.translation = { x, y, z };
        newFrame.name = name;
        newFrame.dynamic = dynamic;
        newFrame.calculateStaticCachedTransformTo();
        if (dynamic) {
            newFrame.update_callback = (x, y, z) => {
                newFrame.translation = { x, y, z };
            }
        }
        return newFrame;
    }

    // Matrix multiplication helper function
    static matrixMultiply(A, B) {
        const result = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
        // Row 0
        result[0][0] = A[0][0] * B[0][0] + A[0][1] * B[1][0] + A[0][2] * B[2][0];
        result[0][1] = A[0][0] * B[0][1] + A[0][1] * B[1][1] + A[0][2] * B[2][1];
        result[0][2] = A[0][0] * B[0][2] + A[0][1] * B[1][2] + A[0][2] * B[2][2];

        // Row 1 
        result[1][0] = A[1][0] * B[0][0] + A[1][1] * B[1][0] + A[1][2] * B[2][0];
        result[1][1] = A[1][0] * B[0][1] + A[1][1] * B[1][1] + A[1][2] * B[2][1];
        result[1][2] = A[1][0] * B[0][2] + A[1][1] * B[1][2] + A[1][2] * B[2][2];

        // Row 2
        result[2][0] = A[2][0] * B[0][0] + A[2][1] * B[1][0] + A[2][2] * B[2][0];
        result[2][1] = A[2][0] * B[0][1] + A[2][1] * B[1][1] + A[2][2] * B[2][1];
        result[2][2] = A[2][0] * B[0][2] + A[2][1] * B[1][2] + A[2][2] * B[2][2];

        return result;
    }

    // Applies a rotation matrix to a point
    static applyRotationMatrix(point, rotationMatrix) {
        const { x, y, z } = point;
        return {
            x: rotationMatrix[0][0] * x + rotationMatrix[0][1] * y + rotationMatrix[0][2] * z,
            y: rotationMatrix[1][0] * x + rotationMatrix[1][1] * y + rotationMatrix[1][2] * z,
            z: rotationMatrix[2][0] * x + rotationMatrix[2][1] * y + rotationMatrix[2][2] * z
        };
    }

    // Recursive method to get the composite transformation to the target frame
    // Target frame can be null, which means the world frame, a string, which is
    // a frame name, or a Frame object
    getTransformTo(targetFrame = null) {
        if (targetFrame !== null) {
            //debugger;
        }
        // First check dynamic cache for transform to world
        if (targetFrame === null && this.dynamicCachedTransformTo) {
            return this.dynamicCachedTransformTo;
        }

        // For static transforms, check if we have cached transform to next dynamic parent
        if (targetFrame === null && this.staticCachedTransformTo && !this.dynamic) {
            const nextDynamicFrame = this.staticCachedTransformTo.frame;

            // If no dynamic parent, return cached transform
            if (nextDynamicFrame === null) {
                return this.staticCachedTransformTo.transform;
            }
            
            const parentTransform = nextDynamicFrame.getTransformTo(targetFrame);
            const cachedTransform = this.staticCachedTransformTo.transform;

            // Combine the cached transform with parent transform
            const combinedRotationMatrix = Frame.matrixMultiply(
                parentTransform.rotationMatrix, 
                cachedTransform.rotationMatrix
            );
            const rotatedTranslation = Frame.applyRotationMatrix(
                cachedTransform.translation,
                parentTransform.rotationMatrix
            );
            const combinedTranslation = {
                x: parentTransform.translation.x + rotatedTranslation.x,
                y: parentTransform.translation.y + rotatedTranslation.y,
                z: parentTransform.translation.z + rotatedTranslation.z
            };

            const compositeTransform = {
                rotationMatrix: combinedRotationMatrix,
                translation: combinedTranslation
            };

            // Cache the world transform if this is a transform to world
            if (targetFrame === null) {
                this.dynamicCachedTransformTo = compositeTransform;
            }

            return compositeTransform;
        }

        // Calculate new transform
        if ((this.name && this.name === targetFrame) || this.parent === null || targetFrame === this) {
            return {
                rotationMatrix: IDENTITY_MATRIX,
                translation: {x: 0, y: 0, z: 0}
            };
        } else {
            const parentTransform = this.parent.getTransformTo(targetFrame);
            const combinedRotationMatrix = Frame.matrixMultiply(
                parentTransform.rotationMatrix,
                this.rotationMatrix
            );
            const rotatedTranslation = Frame.applyRotationMatrix(
                this.translation,
                parentTransform.rotationMatrix
            );
            const combinedTranslation = {
                x: parentTransform.translation.x + rotatedTranslation.x,
                y: parentTransform.translation.y + rotatedTranslation.y,
                z: parentTransform.translation.z + rotatedTranslation.z
            };
            return {
                rotationMatrix: combinedRotationMatrix,
                translation: combinedTranslation
            };
        }
    }

    // Transforms a point to the world frame or a target frame
    toWorld(point, targetFrame = null) {
        const compositeTransform = this.getTransformTo(targetFrame);

        // Apply the composite rotation to the point
        const rotatedPoint = Frame.applyRotationMatrix(point, compositeTransform.rotationMatrix);

        // Apply the composite translation
        const transformedPoint = {
            x: rotatedPoint.x + compositeTransform.translation.x,
            y: rotatedPoint.y + compositeTransform.translation.y,
            z: rotatedPoint.z + compositeTransform.translation.z
        };

        return transformedPoint;
    }
}

// Primitive line segment, defined by two points in a given frame
class LineSegment {
    constructor(points, frame, color, thickness) {
        this.points = points; // Array of points in the local frame of this segment
        this.frame = frame; // Reference frame for the segment
        this.color = color;
        this.thickness = thickness;
        this.calculate();
    }

    calculate() {
        this.worldPoints = [];
        for (const point of this.points) {
            if (point.frame) {
                this.worldPoints.push(point.frame.toWorld(point));
            } else {
                this.worldPoints.push(this.frame.toWorld(point));
            }
        }

        this.sortDepth = getSortDepth(
            {
                x: (this.worldPoints[0].x + this.worldPoints[1].x) / 2, 
                y: (this.worldPoints[0].y + this.worldPoints[1].y) / 2,
                z: (this.worldPoints[0].z + this.worldPoints[1].z) / 2
            }
        );
    }

    setFrame(frame) {
        this.frame = frame;
        this.calculate();
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
        ctx.miterLimit = 1;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.thickness * PIXELS_PER_METER;
        ctx.beginPath();
        
        const [firstX, firstY] = getXYScreen(this.worldPoints[0]);
        ctx.moveTo(firstX, firstY);
        
        for (let i = 1; i < this.worldPoints.length; i++) {
            const [x, y] = getXYScreen(this.worldPoints[i]);
            ctx.lineTo(x, y);
        }
        
        ctx.stroke();
    }
}

export class Ball {
    constructor(position, radius, frame, color) {
        this.position = position;
        this.radius = radius;
        this.frame = frame;
        this.color = color;
        this.calculate();
    }

    calculate() {
        this.worldPosition = this.frame.toWorld(this.position);
        this.sortDepth = getSortDepth(this.worldPosition);
    }

    setFrame(frame) {
        this.frame = frame;
        this.calculate();
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
        setFillColor(ctx, this.color);
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
        this.calculate();
    }

    calculate() {
        this.positionInWorldFrame = this.frame.toWorld({x: 0, y: 0, z: 0});

        this.topPoint = this.frame.toWorld({x: 0, y: 0, z: 1.0});
        this.sortDepth = (getSortDepth(this.positionInWorldFrame) + getSortDepth(this.topPoint)) / 2;
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
        setFillColor(ctx, color);
        ctx.save(); {
            ctx.scale(squash, 1);
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * PIXELS_PER_METER, 0, 2 * Math.PI);
            ctx.fill();
        } ctx.restore();
    }

    drawLift(ctx, squash, color) {
        setFillColor(ctx, color);
        ctx.save(); {
            ctx.scale(squash, 1);
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * PIXELS_PER_METER, 3 * Math.PI / 2, Math.PI / 2, );
            ctx.fill();
        } ctx.restore();
    }

    draw(ctx) {
        const center = getXYScreen(this.positionInWorldFrame);
        const topUnit = getXYScreen(this.topPoint);
        const unitVector3D = {x: this.topPoint.x - this.positionInWorldFrame.x, y: this.topPoint.y - this.positionInWorldFrame.y, z: this.topPoint.z - this.positionInWorldFrame.z};
        
        const crossProduct = {
            x: unitVector3D.y * CAMERA_UNIT_VECTOR.z - unitVector3D.z * CAMERA_UNIT_VECTOR.y, 
            y: unitVector3D.z * CAMERA_UNIT_VECTOR.x - unitVector3D.x * CAMERA_UNIT_VECTOR.z, 
            z: unitVector3D.x * CAMERA_UNIT_VECTOR.y - unitVector3D.y * CAMERA_UNIT_VECTOR.x};

        //const unitInPixels = getXYScreen(unitVector3D);
        //const angleFromVertical = Math.atan2(unitInPixels[1], unitInPixels[0]) + Math.PI / 2;
        
        const newVectorEndpoint = {x: this.positionInWorldFrame.x + crossProduct.x, y: this.positionInWorldFrame.y + crossProduct.y, z: this.positionInWorldFrame.z + crossProduct.z};
        const EndPointInPixels = getXYScreen(newVectorEndpoint);
        const vectorAtExtreme = {x: EndPointInPixels[0] - center[0], y: EndPointInPixels[1] - center[1]};
        const vectorToTop = {x: topUnit[0] - center[0], y: topUnit[1] - center[1]};

        const angleFromVertical = Math.atan2(vectorAtExtreme.y, vectorAtExtreme.x) + Math.PI / 2;
        let squash = 1 - Math.sqrt(vectorToTop.x * vectorToTop.x + vectorToTop.y * vectorToTop.y) / PIXELS_PER_METER;

        ctx.save(); {
            ctx.translate(center[0], center[1]);
            ctx.rotate(angleFromVertical);
            if (getSortDepth(this.positionInWorldFrame) > getSortDepth(this.topPoint)) {
                this.drawLift(ctx, this.liftRadius / this.radius, this.color);
                this.drawBase(ctx, squash, this.baseColor);
            } else {
                this.drawLift(ctx, this.liftRadius / this.radius, this.color);
                this.drawBase(ctx, squash, this.color);
            }

        } ctx.restore();
    }
}

export class Circle {
    constructor(position, radius, frame, color) {
        this.position = position;
        this.radius = radius;
        this.frame = frame;
        this.color = color;
        this.calculate();
    }

    calculate() {
        this.positionInWorldFrame = this.frame.toWorld(this.position);
        this.sortDepth = getSortDepth(this.positionInWorldFrame);
        this.quadCorners = [
            this.frame.toWorld({x: this.position.x - this.radius, y: this.position.y - this.radius, z: this.position.z}),
            this.frame.toWorld({x: this.position.x + this.radius, y: this.position.y - this.radius, z: this.position.z}),
            this.frame.toWorld({x: this.position.x + this.radius, y: this.position.y + this.radius, z: this.position.z}),
            this.frame.toWorld({x: this.position.x - this.radius, y: this.position.y + this.radius, z: this.position.z}),
        ];
    }

    draw(ctx) {
        const k = 0.5522847;
        setFillColor(ctx, this.color);
        const midpoints = [];
        const tangents = [];
        const points = this.quadCorners.map(p => {
            const [x, y] = getXYScreen(p);
            return { x, y };
          });

        for (let i = 0; i < 4; i++) {
            const p1 = points[i];
            const p2 = points[(i + 1) % 4];

            const mx = (p1.x + p2.x) / 2;
            const my = (p1.y + p2.y) / 2;
            midpoints.push({ x: mx, y: my });

            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const len = Math.hypot(dx, dy);
            tangents.push({ x: (dx / len) * len * k / 2, y: (dy / len) * len * k / 2 });
        }


        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
            const p0 = midpoints[i];
            const p1 = {
            x: p0.x + tangents[i].x,
            y: p0.y + tangents[i].y
            };
            const p3 = midpoints[(i + 1) % 4];
            const p2 = {
            x: p3.x - tangents[(i + 1) % 4].x,
            y: p3.y - tangents[(i + 1) % 4].y
            };

            if (i === 0) ctx.moveTo(p0.x, p0.y);
            ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
        }
        ctx.closePath();
        ctx.fill();
    }
}

export class CylinderProjection {
    constructor(topRadiusX, topRadiusY, bottomRadiusX, bottomRadiusY, height, points, frame, color) {
        this.topRadiusX = topRadiusX;
        this.topRadiusY = topRadiusY;
        this.bottomRadiusX = bottomRadiusX;
        this.bottomRadiusY = bottomRadiusY;
        this.height = height;
        this.frame = frame;
        this.color = color;
        this.points = points;
        this.calculate();
    }

    clipPoints(angleOfTerminus) {
        // Normalize angle to [0, 2π]
        angleOfTerminus = angleOfTerminus % (2 * Math.PI);
        if (angleOfTerminus < 0) {
            angleOfTerminus += 2 * Math.PI;
        }

        // Calculate end angle
        let endAngle = angleOfTerminus + Math.PI;
        
        // Filter points based on angle range
        let shapes = [];
        
        if (endAngle <= 2 * Math.PI) {
            // Simple case - no wrap around
            shapes.push( clipPath(this.points, angleOfTerminus, endAngle));
        } else {
            // Wrap around case - need to keep points connected
            shapes.push(clipPath(this.points, angleOfTerminus, 2 * Math.PI));
            shapes.push(clipPath(this.points, 0, endAngle % (2 * Math.PI)));
        }
        return shapes;
    }

    cylinderProjection(points) {
        return points.map(point => {
            const theta = point.x;
            const radiusX = this.topRadiusX + (this.bottomRadiusX - this.topRadiusX) * (1 - point.y);
            const radiusY = this.topRadiusY + (this.bottomRadiusY - this.topRadiusY) * (1 - point.y);
            const x = -radiusX * Math.cos(theta);
            const y = -radiusY * Math.sin(theta); 
            const z = point.y * this.height;
            return {x, y, z};
        });
    }

    calculate() {
        this.positionInWorldFrame = this.frame.toWorld({x: 0, y: 0, z: 0});
        this.sortDepth = getSortDepth(this.positionInWorldFrame);
        this.worldPoints = [];
        const center = getXYScreen(this.positionInWorldFrame);
        this.topPoint = this.frame.toWorld({x: 0, y: 0, z: 1.0});
        const topUnit = getXYScreen(this.topPoint);
        const unitVector3D = {x: this.topPoint.x - this.positionInWorldFrame.x, y: this.topPoint.y - this.positionInWorldFrame.y, z: this.topPoint.z - this.positionInWorldFrame.z};
        const crossProduct = {
            x: unitVector3D.y * CAMERA_UNIT_VECTOR.z - unitVector3D.z * CAMERA_UNIT_VECTOR.y, 
            y: unitVector3D.z * CAMERA_UNIT_VECTOR.x - unitVector3D.x * CAMERA_UNIT_VECTOR.z, 
            z: unitVector3D.x * CAMERA_UNIT_VECTOR.y - unitVector3D.y * CAMERA_UNIT_VECTOR.x};
        const newVectorEndpoint = {x: this.positionInWorldFrame.x + crossProduct.x, y: this.positionInWorldFrame.y + crossProduct.y, z: this.positionInWorldFrame.z + crossProduct.z};
        const EndPointInPixels = getXYScreen(newVectorEndpoint);
        const vectorAtExtreme = {x: EndPointInPixels[0] - center[0], y: EndPointInPixels[1] - center[1]};
        const angleToLargeRadius = Math.atan2(vectorAtExtreme.y, vectorAtExtreme.x) + Math.PI / 2;
        const seamPoint = this.frame.toWorld({x: -1, y: 0, z: 0});
        const seamPointInPixels = getXYScreen(seamPoint);
        const angleToSeam = Math.atan2(seamPointInPixels[1] - center[1], seamPointInPixels[0] - center[0]);
        let angleOfTerminus = -(angleToLargeRadius - angleToSeam) + Math.PI / 2;
        
        
        let clippedPoints = this.clipPoints(angleOfTerminus);

        for (const shape of clippedPoints) {
            const cylinderProjectionPoints = this.cylinderProjection(shape);
            this.worldPoints.push(cylinderProjectionPoints.map(point => this.frame.toWorld(point)));
            this.sortDepth = this.worldPoints.map(points => 
                points.length > 0 ? points.map(point => getSortDepth(point)).reduce((a, b) => Math.max(a, b)) : -Infinity
            ).reduce((a, b) => Math.max(a, b));
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        for (const worldPoints of this.worldPoints) {
            const points2D = worldPoints.map(point => getXYScreen(point));
            ctx.beginPath();
            if (points2D.length > 0) {
                ctx.moveTo(points2D[0][0], points2D[0][1]);
                for (const point of points2D) {
                    const [x, y] = point;
                    ctx.lineTo(x, y); 
                }
                ctx.closePath();
            }
        }
        ctx.fill();
    }
}

export class Polygon {
    constructor(points, frame, color) {
        this.points = points;
        this.frame = frame;
        this.color = color;
        this.calculate();
    }

    calculate() {
        this.pointsInWorldFrame = this.points.map(point => this.frame.toWorld(point));
        this.sortDepth = getSortDepth(
            {x: this.averageX(), y: this.averageY(), z: this.averageZ()}
        );
    }

    setFrame(frame) {
        this.frame = frame;
        this.calculate();
    }

    averageX() {
        return this.pointsInWorldFrame.map(point => point.x).reduce((a, b) => a + b, 0) / this.points.length;
    }   

    averageY() {
        return this.pointsInWorldFrame.map(point => point.y).reduce((a, b) => a + b, 0) / this.points.length;
    }

    averageZ() {
        return this.pointsInWorldFrame.map(point => point.z).reduce((a, b) => a + b, 0) / this.points.length;
    }

    draw(ctx) {
        setFillColor(ctx, this.color);
        ctx.beginPath();
        this.pointsInWorldFrame.forEach(point => {
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
        this.points_for_sort = [];
        if (first_point.use_for_sort) {
            this.points_for_sort.push(0);
        } else if (second_point.use_for_sort) {
            this.points_for_sort.push(1);
        } else {
            this.points_for_sort.push(0);
            this.points_for_sort.push(1);
        }
        this.color = color;
        this.calculate();
    }

    calculate() {
        this.worldPoints = this.points.map(point => this.frame.toWorld(point));
        if (this.points_for_sort.length == 1) {
            this.sortDepth = getSortDepth(this.worldPoints[this.points_for_sort[0]]);
        } else {
            this.sortDepth = getSortDepth(
                {x: this.averageX(), y: this.averageY(), z: this.averageZ()}
            );
        }
        
    }

    setFrame(frame) {
        this.frame = frame;      
        this.calculate();
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
        
        if (this.first_point.color || this.second_point.color) {
            const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
            gradient.addColorStop(0, this.first_point.color || this.color);
            gradient.addColorStop(1, this.second_point.color || this.color);
            setFillColor(ctx, gradient);
        } else {
            setFillColor(ctx, this.color);
        }

        
        // Draw the first circle
        
        ctx.beginPath();
        if (this.first_point.skip !== true) {
            ctx.moveTo(x1, y1);
            ctx.arc(x1, y1, r1, 0, 2 * Math.PI);
        }
        
        // Draw the trapezoid
        ctx.moveTo(x1 + r1 * perpX, y1 + r1 * perpY);
        ctx.lineTo(x2 + r2 * perpX, y2 + r2 * perpY);
        ctx.lineTo(x2 - r2 * perpX, y2 - r2 * perpY);
        ctx.lineTo(x1 - r1 * perpX, y1 - r1 * perpY);

        
        // Draw the second circle
        if (this.second_point.skip !== true) { 
            ctx.moveTo(x2, y2);
            ctx.arc(x2, y2, r2, 0, 2 * Math.PI);
        }
        
        ctx.fill();
    }

}

export class KinematicRenderer {
    constructor(num_layers = 1) {
        this.num_layers = num_layers;
        this.components = [];
        for (let i = 0; i < num_layers; i++) {
            this.components.push([]);
        }
        this.frames = [];
        this.dynamicFrames = [];
    }

    update(dt, data) {
        this.reset();
        for (let frame of this.dynamicFrames) {
            if (frame.name && data[frame.name]) {
                frame.update_callback(data[frame.name]);
            }
        }
        this.calculate();
    }

    calculate() {
        for (let layer of this.components) {
            for (let component of layer) {
                component.calculate();
            }
        }
    }

    reset() {
        for (let frame of this.frames) {
            frame.reset();
        }
    }

    frame() {
        return new Frame();
    }

    addFrame(frame) {
        if (!this.frames.includes(frame)) {
            this.frames.push(frame);
        }
        if (frame.dynamic && !this.dynamicFrames.includes(frame)) {
            this.dynamicFrames.push(frame);
        }
        if (frame.parent) {
            this.addFrame(frame.parent);
        }
    }

    bodySegment(first_point, second_point, frame, color, layer) {
        this.addFrame(frame);
        const segment = new BodySegment(first_point, second_point, frame, color);
        this.addComponent(segment, layer);
        return segment;
    }

    lineSegment(points, frame, color, thickness, layer) {
        this.addFrame(frame);
        const segment = new LineSegment(points, frame, color, thickness);
        this.addComponent(segment, layer);
        return segment;
    }

    ball(position, radius, frame, color, layer) {
        this.addFrame(frame);
        const ball = new Ball(position, radius, frame, color);
        this.addComponent(ball, layer);
        return ball;
    }

    polygon(points, frame, color, layer) {
        this.addFrame(frame);
        const polygon = new Polygon(points, frame, color);
        this.addComponent(polygon, layer);
        return polygon;
    }

    circle(position, radius, frame, color, layer) {
        this.addFrame(frame);
        const circle = new Circle(position, radius, frame, color);
        this.addComponent(circle, layer);
        return circle;
    }

    hemisphere(radius, liftRadius, frame, color, baseColor, layer) {
        this.addFrame(frame);
        const hemisphere = new Hemisphere(radius, liftRadius, frame, color, baseColor);
        this.addComponent(hemisphere, layer);
        return hemisphere;
    }

    cylinderProjection(topRadiusX, topRadiusY, bottomRadiusX, bottomRadiusY, height, points, frame, color, layer) {
        this.addFrame(frame);
        const cylinderProjection = new CylinderProjection(topRadiusX, topRadiusY, bottomRadiusX, bottomRadiusY, height, points, frame, color);
        this.addComponent(cylinderProjection, layer);
        return cylinderProjection;
    }
    
    _mirroredAbout(component, layer, transformPoint) {
        if (component instanceof Polygon) {
            // It is a polygon
            const mirrored = new Polygon(component.points.map(transformPoint), component.frame, component.color);
            this.addComponent(mirrored, layer);
            return mirrored;
        } else if (component instanceof BodySegment) {
            // It is a body segment
            const first_point = {
                position: transformPoint(component.first_point.position), 
                radius: component.first_point.radius, 
                color: component.first_point.color,
                frame: component.first_point.frame
            };
            const second_point = {
                position: transformPoint(component.second_point.position),
                radius: component.second_point.radius,
                color: component.second_point.color,
                frame: component.second_point.frame
            };
            const mirrored = new BodySegment(first_point, second_point, component.frame, component.color);
            this.addComponent(mirrored, layer);
            return mirrored;
        } else if (component instanceof LineSegment) {
            // It is a line segment
            const mirrored = new LineSegment(component.points.map(transformPoint), component.frame, component.color, component.thickness);
            this.addComponent(mirrored, layer);
            return mirrored;
        } else if (component instanceof Circle) {
            // It is a circle
            const mirrored = new Circle(transformPoint(component.position), component.radius, component.frame, component.color);
            this.addComponent(mirrored, layer);
            return mirrored;
        } else {
            throw new Error("Mirroring not implemented for this component type", component);
        }
    }

    addMirroredAboutX(component, layer) {
        return this._mirroredAbout(component, layer, point => ({
            x: -point.x,
            y: point.y, 
            z: point.z
        }));
    }

    addMirroredAboutY(component, layer) {
        return this._mirroredAbout(component, layer, point => ({
            x: point.x,
            y: -point.y,
            z: point.z
        }));
    }

    addMirroredAboutZ(component, layer) {
        return this._mirroredAbout(component, layer, point => ({
            x: point.x,
            y: point.y,
            z: -point.z
        }));
    }

    addComponent(component, layer) {
        this.components[layer].push(component);
    }

    draw(ctx) {
        for (let layer = 0; layer < this.num_layers; layer++) {
            let sortedByX = this.components[layer].sort((a, b) => a.sortDepth - b.sortDepth);
            for (let component of sortedByX) {
                component.draw(ctx);
            }
        }
    }
}

export default { Frame, LineSegment, BodySegment };