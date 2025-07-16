import { setFillColor } from "./utils.js";

function sumForces(...forces) {
    let result = { x: 0, y: 0 };
    for (let force of forces) {
        result.x += force.x;
        result.y += force.y;
    }
    return result;
}
// Character state enum
const CharacterState = {
    NORMAL: 0,
    JUMPING: 1,
};

const speedToDragMultiplier = {
    1: 1.3,
    2: 1.0,
    3: 0.9,
    4: 0.8,
    5: 0.65,
    6: 0.5,
}

const StatToTurningMultiplier = {
    1: 0.5,
    2: 0.8,
    3: 1.0,
    4: 1.5,
    5: 2.0,
    6: 3.5,
}

const StatToEdgeMultiplier = {
    1: 3.0,
    2: 2.5,
    3: 1.0,
    4: 0.7,
    5: 0.5,
    6: 0.2,
}


class SkiPhysics {
    constructor(x, y, vx, vy, particleEngine, skiLength, terrainManager, mass, camera) {
        this.x = x;
        this.y = y;
        this.z = 0;
        this.particleEngine = particleEngine;
        this.skiLength = skiLength;
        this.skiWidth = 1;
        this.skiSpacing = 10;
        this.isSnowboard = false;
        this.mass = mass;
        this.camera = camera;

        this.terrainManager = terrainManager;

        this.accelleration = 400;
        this.drag = 0.5;
        this.tuckDragMultiplier = 0.8;
        this.edgeDrag = 1.5;

        this.steering = 0.95;

        this.maxInAirTurnRate = 7.5
        this.maxTurnRate = 3.0;

        this.stompSprayFactor = 10;
        this.sprayFactor = 1.5;

        this.rampJumpFactor = 0.04
        this.jumpGravityUp = 30;
        this.jumpGravityDown = 30;
        this.jumpDownhillAccelleration = 200;
        this.mountainSlope = 0.0035;
        this.floatDrag = 6;
        this.stompSpeed = 8;

        this.trails = [new Trail(this.isSnowboard, this.camera)];

        // Set up state vars:
        this.state = CharacterState.NORMAL;
        this.currFloatDrag = this.floatDrag;
        this.skiAngle = Math.PI / 2;
        this.prevContactSkiAngle = Math.PI / 2;
        this.velocity = { x: 0, y: 0, z: 0 };
        this.skiUnitVector = { x: 1, y: 0 };
        this.edgeForce = { x: 0, y: 0 };
        this.zVelocity = 0;
        this.forces = [];
        this.skiSplay = 0;
        this.jumpStartTime = 0;

        this.equipment = [];

        this.onTreeCollision = (entity) => {};
        this.onLand = (airTime) => {};
        this.calculateParams();
    }

    setIsSnowboard(isSnowboard) {
        this.isSnowboard = isSnowboard
        for (let trail of this.trails) {
            trail.isSnowboard = isSnowboard;
        }
    }

    setOnTreeCollision(onTreeCollision) {
        this.onTreeCollision = onTreeCollision;
    }

    setOnLand(onLand) {
        this.onLand = onLand;
    }

    

    calculateParams() {
        let drag = this.drag;
        let turnMultiplier = 1;
        let edgeMultiplier = 1;
        let allowUphill = false;
        
        for (let equipment of Object.values(this.equipment)) {            
            if (!equipment) {
                continue;
            }

            drag *= equipment.getDragMultiplier();

            if (equipment.getStats().speed) {
                drag *= speedToDragMultiplier[equipment.getStats().speed];
            }
            
            if (equipment.getStats().turning) {
                turnMultiplier *= StatToTurningMultiplier[equipment.getStats().turning];
            }

            if (equipment.getStats().sharp_edges) {
                edgeMultiplier *= StatToEdgeMultiplier[equipment.getStats().sharp_edges];
            }

            if (equipment.getAllowUphill()) {
                allowUphill = true;
            }
        }
        
        
        this.params = {
            drag: drag,
            maxTurnRate: this.maxTurnRate * turnMultiplier,
            steering: 1 - (1 - this.steering) * edgeMultiplier,
            edgeDrag: this.edgeDrag / edgeMultiplier,
            allowUphill: allowUphill
        };
    }

    getParams() {
        return this.params;
    }

    jump(jumpVel) {
        if (this.state == CharacterState.NORMAL) {
            this.jumpStartTime = performance.now();
            this.state = CharacterState.JUMPING;
            this.currFloatDrag = this.floatDrag;
            this.zVelocity = jumpVel;
        }
    }

    impulse(impulseVec) {
        this.velocity.x += impulseVec.x / this.mass;
        this.velocity.y += impulseVec.y / this.mass;
    }

    bump(velocity, mass) {
        this.velocity.x += velocity.x * mass / this.mass;
        this.velocity.y += velocity.y * mass / this.mass
        this.skiAngle += 3 * mass / this.mass * velocity.x > 0 ? 1 : -1;
    }

    bumpX(velocity, mass) {
        this.velocity.x += velocity.x * mass / this.mass
        this.skiAngle += 3 * mass / this.mass * velocity.x > 0 ? 1 : -1;
    }

    setVelocity(velocity) {
        this.velocity = velocity;
    }

    limitSpeed(maxSpeed) {
        const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
        const scale = maxSpeed / speed;
        if (scale < 1) {
            this.velocity.x *= scale;
            this.velocity.y *= scale;
        }
    }

    rampJump() {
        this.jump(this.rampJumpFactor * this.velocity.y);
    }

    stomp() {
        if (this.state == CharacterState.JUMPING) {
            this.currFloatDrag = 0;
            this.zVelocity -=this.stompSpeed;
        }
    }

    isJumping() {
        return this.state == CharacterState.JUMPING;
    }

    applyForce(force) {
        this.forces.push(force);
    }

    rotateAbout(x, y, angle) {
        for (let trail of this.trails) {
            trail.rotateAbout(x, y, angle);
        }
    }


    leftSkiCenter() {
        return { x: this.x + this.skiSpacing * 0.3 - this.skiWidth / 2, y: this.y};
    }

    rightSkiCenter() {
        return { x: this.x - this.skiSpacing * 0.3 - this.skiWidth / 2, y: this.y};
    }

    drawTrail(ctx) {
        for (let trail of this.trails) {
            trail.draw(ctx);
        }
    }   

    update(dt, targetSkiAngle, tuck) {
        let params = this.getParams();
        let drag = params.drag;
        if (tuck !== undefined) {
            drag *= this.tuckDragMultiplier * tuck + (1 - tuck);
        }


        while (this.forces.length > 0) {
            let force = this.forces.pop();
            this.velocity.x += force.x * dt;
            this.velocity.y += force.y * dt;
        }
        let prevSkiAngle = this.skiAngle;   
        
        this.skiAngle = targetSkiAngle;

        let angleChangeRate = (this.skiAngle - prevSkiAngle) / dt;

        if (this.state == CharacterState.JUMPING) {
            if (angleChangeRate > this.maxInAirTurnRate) {
                this.skiAngle = prevSkiAngle + Math.sign(this.skiAngle - prevSkiAngle) * this.maxInAirTurnRate * dt;
            }
            if (this.zVelocity > 0) {
                this.zVelocity -= this.jumpGravityUp * dt;
            } else {
                this.zVelocity -= this.jumpGravityDown * dt;
            }
            const windSpeed = this.zVelocity - this.velocity.y * this.mountainSlope;
            let windForce = windSpeed * this.currFloatDrag;
            if (windForce > this.jumpGravityDown) {
                windForce = this.jumpGravityDown * 0.95;
            }
            this.zVelocity -= windForce * dt;

            this.z += this.zVelocity * dt;
            if (this.z <= 0) {
                this.z = 0;
                this.zVelocity = 0;
                this.state = CharacterState.NORMAL;
                this.onLand((performance.now() - this.jumpStartTime) / 1000);
                this.trails.push(new Trail(this.isSnowboard, this.camera));

                this.state = CharacterState.NORMAL;
                let num_particles = Math.floor(Math.abs(this.zVelocity) * this.stompSprayFactor);
                for (let i = 0; i < num_particles; i++) {
                    let angle = Math.random() * Math.PI * 2;
                    let vel = Math.random() * this.velocity.y * 0.5;
                    let lifetime = Math.random() * num_particles / 100;
                    this.particleEngine.emit(
                        this.x,
                        this.y,
                        { 
                            x: Math.cos(angle) * vel + this.velocity.x,
                            y: Math.sin(angle) * vel * 0.4 + this.velocity.y * 1.3
                        },
                        lifetime
                    );
                }


            }
        } else if (this.state == CharacterState.NORMAL) {
            if (angleChangeRate > params.maxTurnRate) {
                this.skiAngle = prevSkiAngle + Math.sign(this.skiAngle - prevSkiAngle) * params.maxTurnRate * dt;
            }
            this.zVelocity = 0;
            this.z = 0;

            let angleChangeRateContact = Math.abs(this.skiAngle - this.prevContactSkiAngle) / dt;

            // Apply the self.steering constant to determine how much momentum is retained
            let steeringEffect = Math.max(0, 1 - angleChangeRateContact * (1 - params.steering));
            this.prevContactSkiAngle = this.skiAngle;

            // Steer velocity towards the new ski angle
            const prevVForward = this.velocity.x * this.skiUnitVector.x + this.velocity.y * this.skiUnitVector.y;
            const prevVSide = this.velocity.x * -this.skiUnitVector.y + this.velocity.y * this.skiUnitVector.x;

            this.skiUnitVector = { x: Math.cos(this.skiAngle + Math.PI / 2), y: Math.sin(this.skiAngle + Math.PI / 2) };
        
            this.velocity.x = steeringEffect * (prevVForward * this.skiUnitVector.x + prevVSide * -this.skiUnitVector.y) + (1 - steeringEffect) * this.velocity.x;
            this.velocity.y = steeringEffect * (prevVForward * this.skiUnitVector.y + prevVSide * this.skiUnitVector.x) + (1 - steeringEffect) * this.velocity.y;
            
            const gravity = { x: 0, y: this.accelleration };
            const gravity_dot_ski = gravity.y * this.skiUnitVector.y;

            // Now scale the ski direction vector by the dot product to get the effective force in the ski direction
            const gravityForceInSkiDirection = {
                x: this.skiUnitVector.x * gravity_dot_ski,
                y: this.skiUnitVector.y * gravity_dot_ski
            };
            const dragForce = {
                x: -this.velocity.x * drag,
                y: -this.velocity.y * drag
            };

            if (this.trails.length == 0) {
                this.trails.push(new Trail(this.isSnowboard, this.camera));
            }
            this.trails[this.trails.length - 1].update(this)
    

            const perpendicularVector = { x: -this.skiUnitVector.y, y: this.skiUnitVector.x };
            const velDotPerpendicular = this.velocity.x * perpendicularVector.x + this.velocity.y * perpendicularVector.y;
            this.edgeForce = {
                x: -perpendicularVector.x * velDotPerpendicular * params.edgeDrag,
                y: -perpendicularVector.y * velDotPerpendicular * params.edgeDrag
            };

            this.leanAngle = velDotPerpendicular / 300;

            var num_paricles = Math.floor(Math.abs(velDotPerpendicular * this.sprayFactor) * dt);
            for (let i = 0; i < num_paricles; i++) {
                var emitAngle = this.skiAngle - Math.PI / 2 + (velDotPerpendicular > 0 ? -Math.PI / 2 : + Math.PI / 2) + Math.random() * Math.PI / 2 - Math.PI / 4;
                var edgeForceMagnitude = (
                    Math.sqrt(this.edgeForce.x * this.edgeForce.x + this.edgeForce.y * this.edgeForce.y))
                    * (Math.random() * 0.5 + 0.5) * this.sprayFactor;
                const skiAlpha = Math.random() - 0.5;

                this.particleEngine.emit(
                    this.x + this.skiUnitVector.x * this.skiLength * skiAlpha,
                    this.y + this.skiUnitVector.y * this.skiLength * skiAlpha,

                    { 
                        x: Math.cos(emitAngle) * edgeForceMagnitude,
                        y: Math.sin(emitAngle) * edgeForceMagnitude + this.velocity.y
                    },
                    0.25);
            }

            let force = sumForces(gravityForceInSkiDirection, dragForce, this.edgeForce);
            this.velocity.x += force.x * dt;
            this.velocity.y += force.y * dt;
        }

        this.x += this.velocity.x * dt;
        this.y += this.velocity.y * dt;

        if (this.trails.length > 0 && this.trails[0].isOffScreen(this)) {
            // remove it
            this.trails.shift();
        }
    }

    getSnowboardAngle(targetAngle) {
        // Normalize the angles
        let currentAngle = normalize(this.skiAngle);
        let angleOption1 = normalize(targetAngle);
        let angleOption2 = normalize(targetAngle + Math.PI); // Add π to flip the angle
    
        // Calculate the angular differences
        let diff1 = Math.abs(angleDifference(currentAngle, angleOption1));
        let diff2 = Math.abs(angleDifference(currentAngle, angleOption2));
    
        // Determine which angle is closer to self.skiAngle
        if (diff1 <= diff2) {
            return angleOption1;
        } else {
            return angleOption2;
        }
    }
    

    drawSkis(ctx, color, skiSplay) {
        this.skiSplay = skiSplay * (1 - Math.abs(this.skiAngle / (Math.PI / 2)));
    
        if (this.isSnowboard) {
            // Draw the snowboard with rounded ends and dynamic width
            ctx.save();
            const snowboardCenter = this.leftSkiCenter(); // Use leftSkiCenter as the snowboard center
            ctx.translate(snowboardCenter.x, snowboardCenter.y);
            ctx.rotate(this.skiAngle);
            ctx.fillStyle = color;
    
            // Calculate the width scaling factor based on skiAngle
            const scaleFactor = 0.5 + 0.5 * Math.abs(Math.cos(this.skiAngle));
            const adjustedWidth = this.skiWidth * scaleFactor;
    
            // Set the radius for rounded ends
            const radius = adjustedWidth / 2;
    
            // Draw the snowboard shape
            ctx.beginPath();
            ctx.moveTo(-adjustedWidth / 2, -this.skiLength / 2 + radius);
            ctx.lineTo(-adjustedWidth / 2, this.skiLength / 2 - radius);
            ctx.arcTo(-adjustedWidth / 2, this.skiLength / 2, 0, this.skiLength / 2, radius);
            ctx.arcTo(adjustedWidth / 2, this.skiLength / 2, adjustedWidth / 2, this.skiLength / 2 - radius, radius);
            ctx.lineTo(adjustedWidth / 2, -this.skiLength / 2 + radius);
            ctx.arcTo(adjustedWidth / 2, -this.skiLength / 2, 0, -this.skiLength / 2, radius);
            ctx.arcTo(-adjustedWidth / 2, -this.skiLength / 2, -adjustedWidth / 2, -this.skiLength / 2 + radius, radius);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
    
            // No need to draw the right ski when using a snowboard
            return;
        }
    
        // Draw the left ski (unchanged)
        ctx.save();
        const leftSkiCenter = this.leftSkiCenter();
        ctx.translate(leftSkiCenter.x, leftSkiCenter.y);
        ctx.rotate(this.skiAngle + skiSplay);
        ctx.fillStyle = color;
        ctx.fillRect(-this.skiWidth / 2, -this.skiLength / 2, this.skiWidth, this.skiLength);
        ctx.restore();
    
        // Draw the right ski (unchanged)
        ctx.save();
        const rightSkiCenter = this.rightSkiCenter();
        ctx.translate(rightSkiCenter.x, rightSkiCenter.y);
        ctx.rotate(this.skiAngle - skiSplay);
        ctx.fillStyle = color;
        ctx.fillRect(-this.skiWidth / 2, -this.skiLength / 2, this.skiWidth, this.skiLength);
        ctx.restore();
    }
    

    drawShadow(ctx) {

        const shadowColor = "#E0E0E4";
        setFillColor(ctx, shadowColor);

        // draw a circle for the shadow
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + 2, 8, 4, 0, 0, 2 * Math.PI);
        ctx.fill();
        // Draw the ski
        ctx.save();
        const leftSkiCenter = this.leftSkiCenter();
        const rightSkiCenter = this.rightSkiCenter();
        ctx.translate(leftSkiCenter.x, leftSkiCenter.y);
        ctx.rotate(this.skiAngle + this.skiSplay);
        ctx.fillRect(-1, -this.skiLength / 2, 3, this.skiLength);
        ctx.restore();
        if (this.isSnowboard) {
            return;
        }
        ctx.save();
        ctx.translate(rightSkiCenter.x, rightSkiCenter.y);
        ctx.rotate(this.skiAngle - this.skiSplay);
        ctx.fillRect(-1, -this.skiLength/2, 3, this.skiLength);
        ctx.restore();
    }
}

// Normalize an angle to the range [0, 2π)
function normalize(angle) {
    return angle - Math.floor(angle / (2 * Math.PI)) * (2 * Math.PI);
}

// Compute the minimal angular difference between two angles
function angleDifference(a, b) {
    let diff = a - b;
    return Math.atan2(Math.sin(diff), Math.cos(diff));
}


const OFF_TOP_THRESHOLD = 300;
class Trail{
    constructor(isSnowboard, camera){
        this.leftFrontTrail = [];
        this.rightFrontTrail = [];
        this.leftRearTrail = [];
        this.rightRearTrail = [];
        this.color = "#E8E8F0"
        this.trailResolutionPx = 10;
        this.trailLen = 500;
        this.camera = camera;
        this.isSnowboard = isSnowboard;
        this.skiWidth = 1;
    }

    rotateAbout(x, y, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        for (let trail of [this.leftFrontTrail, this.rightFrontTrail, this.leftRearTrail, this.rightRearTrail]) {
            for (let i = 0; i < trail.length; i++) {
                let point = trail[i];
            let dx = point.x - x;
                let dy = point.y - y;
                point.x = x + dx * cos - dy * sin;
                point.y = y + dx * sin + dy * cos;
            }
        }
    }

    update(character){
        const leftSkiCenter = character.leftSkiCenter();
        this.skiWidth = character.skiWidth;
        const rightSkiCenter = character.rightSkiCenter();
        const newFrontLeft = { x: leftSkiCenter.x + character.skiLength/2 * character.skiUnitVector.x, y: leftSkiCenter.y + character.skiLength/2 * character.skiUnitVector.y };
        if (this.leftFrontTrail.length == 0 
            || Math.abs(newFrontLeft.y - this.leftFrontTrail[this.leftFrontTrail.length - 1].y) > this.trailResolutionPx
            || Math.abs(newFrontLeft.x - this.leftFrontTrail[this.leftFrontTrail.length - 1].x) > this.trailResolutionPx
        ) {
            this.leftFrontTrail.push(newFrontLeft);
            this.leftRearTrail.push({ x: leftSkiCenter.x - character.skiLength/2 * character.skiUnitVector.x, y: leftSkiCenter.y - character.skiLength/2 * character.skiUnitVector.y });
            if (!this.isSnowboard) {
                this.rightFrontTrail.push({ x: rightSkiCenter.x + character.skiLength/2 * character.skiUnitVector.x, y: rightSkiCenter.y + character.skiLength/2 * character.skiUnitVector.y });
                this.rightRearTrail.push({ x: rightSkiCenter.x - character.skiLength/2 * character.skiUnitVector.x, y: rightSkiCenter.y - character.skiLength/2 * character.skiUnitVector.y });
            }

            // limit to 100 points
            if (this.leftFrontTrail.length > this.trailLen || this.camera.distanceOffScreenY(this.leftFrontTrail[0].y) > OFF_TOP_THRESHOLD) {
                this.leftFrontTrail.shift();
                this.leftRearTrail.shift();
                if (!this.isSnowboard) {
                    this.rightFrontTrail.shift();
                    this.rightRearTrail.shift();
                }
            }
        }
    }

    draw(ctx){
        setFillColor(ctx, this.color);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.skiWidth/2;
        // Draw the left trail:
        if (this.leftFrontTrail.length < 2) {
            return;
        }
        ctx.beginPath();
        let firstPoint = false;
        let onScreenPoints = [];
        for (let i = 0; i < this.leftFrontTrail.length; i++) {
            if (this.camera.isOnScreen(this.leftFrontTrail[i].x, this.leftFrontTrail[i].y, 60)) {
                onScreenPoints.push(i);
                if (!firstPoint) {
                    ctx.moveTo(this.leftFrontTrail[i].x + 1, this.leftFrontTrail[i].y);
                    firstPoint = true;
                } else {
                    ctx.lineTo(this.leftFrontTrail[i].x + 1, this.leftFrontTrail[i].y);
                }
            }
        }
        // backwards on leftBackTrail
        for (let i = onScreenPoints.length - 1; i >= 0; i--) {
            ctx.lineTo(this.leftRearTrail[onScreenPoints[i]].x - 1, this.leftRearTrail[onScreenPoints[i]].y);
        }

        if (this.isSnowboard) {
            ctx.fill();
            ctx.stroke();
            return
        }

        // Draw the right trail:



        firstPoint = false;
        for (let i = 0; i < onScreenPoints.length; i++) {
            if (!firstPoint) {
                ctx.moveTo(this.rightFrontTrail[onScreenPoints[i]].x + 1, this.rightFrontTrail[onScreenPoints[i]].y);
                firstPoint = true;
            } else {
                ctx.lineTo(this.rightFrontTrail[onScreenPoints[i]].x + 1, this.rightFrontTrail[onScreenPoints[i]].y);
            }
        }
        // backwards on rightBackTrail
        for (let i = onScreenPoints.length - 1; i >= 0; i--) {
            ctx.lineTo(this.rightRearTrail[onScreenPoints[i]].x - 1, this.rightRearTrail[onScreenPoints[i]].y);
        }
        ctx.fill();
        ctx.stroke();
    }

    isOffScreen(character){
        if (this.leftFrontTrail.length == 0) {
            return true;
        }
        return this.leftFrontTrail[this.leftFrontTrail.length - 1].y < character.y - 1000;
    }
}

export default SkiPhysics;