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

class Trail{
    constructor(isSnowboard){
        this.leftFrontTrail = [];
        this.rightFrontTrail = [];
        this.leftRearTrail = [];
        this.rightRearTrail = [];
        this.color = "#E8E8F0"
        this.trailResolutionPx = 10;
        this.trailLen = 500;
        this.isSnowboard = isSnowboard;
        this.skiWidth = 1;
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
            if (this.leftFrontTrail.length > 500) {
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
        // Draw the left trail:
        if (this.leftFrontTrail.length < 2) {
            return;
        }
        ctx.beginPath();
        ctx.moveTo(this.leftFrontTrail[0].x, this.leftFrontTrail[0].y);
        for (let i = 1; i < this.leftFrontTrail.length; i++) {
            ctx.lineTo(this.leftFrontTrail[i].x + 1, this.leftFrontTrail[i].y);
        }
        // backwards on leftBackTrail
        for (let i = this.leftRearTrail.length - 1; i >= 0; i--) {
            ctx.lineTo(this.leftRearTrail[i].x - 1, this.leftRearTrail[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.skiWidth/2;
        ctx.stroke();
        if (this.isSnowboard) {
            return
        }

        // Draw the right trail:
        ctx.beginPath();
        ctx.moveTo(this.rightFrontTrail[0].x, this.rightFrontTrail[0].y);
        for (let i = 1; i < this.rightFrontTrail.length; i++) {
            ctx.lineTo(this.rightFrontTrail[i].x + 1, this.rightFrontTrail[i].y);
        }
        // backwards on rightBackTrail
        for (let i = this.rightRearTrail.length - 2; i >= 0; i--) {
            ctx.lineTo(this.rightRearTrail[i].x -1, this.rightRearTrail[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.skiWidth/2;
        ctx.stroke();
    }

    isOffScreen(character){
        if (this.leftFrontTrail.length == 0) {
            return false;
        }
        return this.leftFrontTrail[this.leftFrontTrail.length - 1].y < character.y - 1000;
    }
}

class SkiPhysics {
    constructor(x, y, vx, vy, particleEngine, skiLength, terrainManager) {
        this.x = x;
        this.y = y;
        this.z = 0;
        this.particleEngine = particleEngine;
        this.skiLength = skiLength;
        this.skiWidth = 1;
        this.skiSpacing = 10;
        this.isSnowboard = false;

        this.terrainManager = terrainManager;

        this.accelleration = 400;
        this.drag = 0.5;
        this.edgeDrag = 1.5;

        this.steering = 0.95;

        this.maxInAirTurnRate = 7.5
        this.maxTurnRate = 3.5;

        this.stompSprayFactor = 10;
        this.sprayFactor = 1;

        this.rampJumpFactor = 0.04
        this.jumpGravityUp = 30;
        this.jumpGravityDown = 30;
        this.jumpDownhillAccelleration = 200;
        this.mountainSlope = 0.0035;
        this.floatDrag = 6;
        this.stompSpeed = 8;

        this.trails = [new Trail(this.isSnowboard)];

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

        this.onTreeCollision = (entity) => {};
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

    jump(jumpVel) {
        if (this.state == CharacterState.NORMAL) {
            this.state = CharacterState.JUMPING;
            this.currFloatDrag = this.floatDrag;
            this.zVelocity = jumpVel;
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

    update(dt, targetSkiAngle) {
        while (this.forces.length > 0) {
            let force = this.forces.pop();
            this.velocity.x += force.x * dt;
            this.velocity.y += force.y * dt;
        }
        let prevSkiAngle = this.skiAngle;   
        
        this.skiAngle = targetSkiAngle;
        let angleChangeRate = Math.abs(this.skiAngle - prevSkiAngle) / dt;
        if (this.state == CharacterState.JUMPING) {
            if (angleChangeRate > this.maxTurnRate) {
                this.skiAngle = prevSkiAngle + Math.sign(this.skiAngle - prevSkiAngle) * this.maxInAirTurnRate * dt;
            }
            if (this.zVelocity > 0) {
                this.zVelocity -= this.jumpGravityUp * dt;
            } else {
                this.zVelocity -= this.jumpGravityDown * dt;
            }
            const windSpeed = this.zVelocity - this.velocity.y * this.mountainSlope;
            const windForce = windSpeed * this.currFloatDrag;
            this.zVelocity -= windForce * dt;

            this.z += this.zVelocity * dt;
            
            if (this.z < 0) {

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
                this.z = 0;
                this.zVelocity = 0;
                this.trails.push(new Trail(this.isSnowboard));
            }
        } else if (this.state == CharacterState.NORMAL) {
            if (angleChangeRate > this.maxTurnRate) {
                this.skiAngle = prevSkiAngle + Math.sign(this.skiAngle - prevSkiAngle) * this.maxTurnRate * dt;
            }
            this.zVelocity = 0;
            this.z = 0;

            let angleChangeRateContact = Math.abs(this.skiAngle - this.prevContactSkiAngle) / dt;

            // Apply the self.steering constant to determine how much momentum is retained
            let steeringEffect = Math.max(0, 1 - angleChangeRateContact * (1- this.steering));
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
                x: -this.velocity.x * this.drag,
                y: -this.velocity.y * this.drag
            };

            if (this.trails.length == 0) {
                this.trails.push(new Trail(this.isSnowboard));
            }
            this.trails[this.trails.length - 1].update(this)
    

            const perpendicularVector = { x: -this.skiUnitVector.y, y: this.skiUnitVector.x };
            const velDotPerpendicular = this.velocity.x * perpendicularVector.x + this.velocity.y * perpendicularVector.y;
            this.edgeForce = {
                x: -perpendicularVector.x * velDotPerpendicular * this.edgeDrag,
                y: -perpendicularVector.y * velDotPerpendicular * this.edgeDrag
            };
            var num_paricles = Math.floor(Math.abs(this.edgeDrag * velDotPerpendicular * this.sprayFactor) * dt);
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

    setVelocity(velocity) {
        this.velocity = velocity;
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
        this.skiSplay = skiSplay;
    
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
        ctx.fillStyle = shadowColor;
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

export default SkiPhysics;