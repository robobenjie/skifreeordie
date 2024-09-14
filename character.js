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
    constructor(x, y){
        this.leftFrontTrail = [];
        this.rightFrontTrail = [];
        this.leftRearTrail = [];
        this.rightRearTrail = [];
        this.color = "#E8E8F0"
    }
    update(character){
        const leftSkiCenter = character.leftSkiCenter();
        const rightSkiCenter = character.rightSkiCenter();
        const newFrontLeft = { x: leftSkiCenter.x + character.skiLength/2 * character.skiUnitVector.x, y: leftSkiCenter.y + character.skiLength/2 * character.skiUnitVector.y };
        if (this.leftFrontTrail.length == 0 
            || Math.abs(newFrontLeft.y - this.leftFrontTrail[this.leftFrontTrail.length - 1].y) > 3
            || Math.abs(newFrontLeft.x - this.leftFrontTrail[this.leftFrontTrail.length - 1].x) > 3
        ) {
            this.leftFrontTrail.push(newFrontLeft);
            this.rightFrontTrail.push({ x: rightSkiCenter.x + character.skiLength/2 * character.skiUnitVector.x, y: rightSkiCenter.y + character.skiLength/2 * character.skiUnitVector.y });
            this.leftRearTrail.push({ x: leftSkiCenter.x - character.skiLength/2 * character.skiUnitVector.x, y: leftSkiCenter.y - character.skiLength/2 * character.skiUnitVector.y });
            this.rightRearTrail.push({ x: rightSkiCenter.x - character.skiLength/2 * character.skiUnitVector.x, y: rightSkiCenter.y - character.skiLength/2 * character.skiUnitVector.y });

            // limit to 100 points
            if (this.leftFrontTrail.length > 100) {
                this.leftFrontTrail.shift();
                this.rightFrontTrail.shift();
                this.leftRearTrail.shift();
                this.rightRearTrail.shift();
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
    }

    isOffScreen(character){
        if (this.leftFrontTrail.length == 0) {
            return false;
        }
        return this.leftFrontTrail[this.leftFrontTrail.length - 1].y < character.y - 1000;
    }
}

class Character {
    constructor(x, y, particleEngine, treeManager, joystick) {
        this.x = x;
        this.y = y;
        this.z = 0;
        this.particleEngine = particleEngine;
        this.treeManager = treeManager;
        this.width = 10;
        this.height = 25;
        this.color = "red";
        this.skiLength = 30;
        this.hitBoxSizeX = 10;
        this.hitBoxSizeY =  5;
        this.joystick = joystick;
        this.maxHealth = 100;

        this.accelleration = 400;
        this.drag = 0.5;
        this.edgeDrag = 1.5;

        this.steering = 0.95;
        this.maxUphillAngle = 25 * Math.PI / 180;
        this.maxInAirTurnRate = 7.5
        this.maxTurnRate = 3.5;
        this.sprayFactor = 1;

        // Collision damage parameters
        this.speedDamageFactor = 0.01;

        // Jumping parameters
        this.floatMoveSpeedX = 500;
        this.floatMoveSpeedY = 0;
        this.floatDrag = 6;
        this.clickJumpSpeed = 6;
        this.stompSpeed = 8;
        this.rampJumpFactor = 0.04
        this.jumpGravityUp = 30;
        this.jumpGravityDown = 30;
        this.jumpDownhillAccelleration = 200;
        this.mountainSlope = 0.0035;
        this.stompSprayFactor = 10;

        // set up state vars
        this.health = this.maxHealth;
        this.currFloatDrag = this.floatDrag;
        this.state = CharacterState.NORMAL;
        this.skiAngle = Math.PI / 2;
        this.prevContactSkiAngle = Math.PI / 2;
        this.velocity = { x: 0, y: 0, z: 0 };
        this.skiUnitVector = { x: 1, y: 0 };
        this.edgeForce = { x: 0, y: 0 };
        this.trails = [new Trail()]

        this.zVelocity = 0;

        this.joystick.addTapListener(() => {
            this.jump(this.clickJumpSpeed);
        });

        //this.joystick.addTapListener(this.stomp.bind(this));

    }

    jump(jumpVel) {
        if (this.state == CharacterState.NORMAL) {
            this.state = CharacterState.JUMPING;
            this.currFloatDrag = this.floatDrag;
            this.zVelocity = jumpVel;
        } else if (this.state == CharacterState.JUMPING) {
            this.currFloatDrag = 0;
            this.zVelocity -=this.stompSpeed;
        }

    }

    isJumping() {
        return this.state == CharacterState.JUMPING;
    }

    collideWithMob(mob) {
        const collisionVel = {
            x: this.velocity.x - mob.velocity.x,
            y: this.velocity.y - mob.velocity.y
        }
        const speed = Math.sqrt(collisionVel.x * collisionVel.x + collisionVel.y * collisionVel.y);
        const damage = speed * this.speedDamageFactor;
        const damageDealt = Math.min(damage, mob.health);
        mob.damage(damageDealt);
        this.damage(damage);
        const velUnitVector = {
            x: collisionVel.x / speed,
            y: collisionVel.y / speed
        };
        this.velocity.x -= velUnitVector.x * damageDealt / this.speedDamageFactor;
        this.velocity.y -= velUnitVector.y * damageDealt / this.speedDamageFactor;

    }

    damage(damage) {
        this.health -= damage;
        if (this.health <= 0) {
            this.health = 0;
        }
    }

    update(dt, ctx) {

        let prevSkiAngle = this.skiAngle;
        if (this.joystick.isActive) {
            this.skiAngle = Math.atan2(this.joystick.currVals.y, this.joystick.currVals.x) + Math.PI / 2;
        }

        this.skiAngle = Math.min(
            Math.max(Math.PI / 2 - this.maxUphillAngle, (this.skiAngle + 2 * Math.PI) % (2 * Math.PI)),
            Math.PI * 1.5 + this.maxUphillAngle
        );

        let angleChangeRate = Math.abs(this.skiAngle - prevSkiAngle) / dt;


        var force = { x: 0, y: 0};
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
            var glideForce = {
                x: 0,
                y: 0
            }
            if (this.joystick.isActive) {
                if (this.joystick.currVals.x * this.velocity.x < 0 || (Math.abs(this.velocity.y) > Math.abs(this.velocity.x) && Math.abs(this.velocity.y) > 200)) {
                    glideForce = {
                        x: this.joystick.currVals.x * this.floatMoveSpeedX / this.joystick.maxRadius,
                        y: this.joystick.currVals.y * this.floatMoveSpeedY / this.joystick.maxRadius
                    }
                }
            }

            this.velocity.x += glideForce.x * dt;
            this.velocity.y += glideForce.y * dt;
            this.z += this.zVelocity * dt;
            
            if (this.z < 0) {

                this.state = CharacterState.NORMAL;
                let num_particles = Math.floor(Math.abs(this.zVelocity) * this.stompSprayFactor);
                for (let i = 0; i < num_particles; i++) {
                    let angle = Math.random() * Math.PI * 2;
                    let vel = Math.random() * this.velocity.y * 0.5;
                    let lifetime = Math.random() * num_particles / 100;
                    this.particleEngine.emit(
                        this.x + this.width / 2,
                        this.y + this.height,
                        { 
                            x: Math.cos(angle) * vel + this.velocity.x,
                            y: Math.sin(angle) * vel * 0.4 + this.velocity.y * 1.3
                        },
                        lifetime
                    );
                }
                this.z = 0;
                this.zVelocity = 0;
                this.trails.push(new Trail());
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
                this.trails.push(new Trail());
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
                    * (Math.random() * 0.5 + 0.5);
                const skiAlpha = Math.random() - 0.5;

                this.particleEngine.emit(
                    this.x + this.width / 2 + this.skiUnitVector.x * this.skiLength * skiAlpha,
                    this.y + this.height + this.skiUnitVector.y * this.skiLength * skiAlpha,

                    { 
                        x: Math.cos(emitAngle) * edgeForceMagnitude,
                        y: Math.sin(emitAngle) * edgeForceMagnitude + this.velocity.y
                    },
                    0.25);
            }

            force = sumForces(gravityForceInSkiDirection, dragForce, this.edgeForce);

            const collidingEntities = this.treeManager.collidesWith(this.x, this.y + this.height/2 + this.hitBoxSizeY, this.hitBoxSizeX, this.hitBoxSizeY, this.velocity.y * dt);
            for (let entity of collidingEntities) {
                if (entity.type == "tree") {
                    const damage = Math.max((Math.abs(this.velocity.y) - 100) * 0.01, 0);
                    this.damage(damage);
                    this.velocity.x = this.skiUnitVector.x * 10;
                    this.velocity.y = this.skiUnitVector.y * 10;
                }
                if (entity.type == "jumpRamp") {
                    this.jump(this.rampJumpFactor * this.velocity.y);
                }
            }
        }
        this.velocity.x += force.x * dt;
        this.velocity.y += force.y * dt;

        this.x += this.velocity.x * dt;
        this.y += this.velocity.y * dt;

        if (this.trails.length > 0 && this.trails[0].isOffScreen(this)) {
            // remove it
            this.trails.shift();
        }
    }

    leftSkiCenter() {
        return { x: this.x + this.width * 0.2, y: this.y + this.height };
    }

    rightSkiCenter() {
        return { x: this.x + this.width * 0.8, y: this.y + this.height };
    }

    drawTrail(ctx) {
        for (let trail of this.trails) {
            trail.draw(ctx);
        }
    }   

    drawShadow(ctx) {
        var skiSplay = this.state == CharacterState.JUMPING ? -0.05 : 0;

        const shadowColor = "#E0E0E4";
        ctx.fillStyle = shadowColor;
        // draw a circle for the shadow
        ctx.beginPath();
        ctx.ellipse(this.x + this.width / 2, this.y + this.height + 2, 8, 4, 0, 0, 2 * Math.PI);
        ctx.fill();
        // Draw the ski
        ctx.save();
        const leftSkiCenter = this.leftSkiCenter();
        const rightSkiCenter = this.rightSkiCenter();
        ctx.translate(leftSkiCenter.x, leftSkiCenter.y);
        ctx.rotate(this.skiAngle + skiSplay);
        ctx.fillRect(-1, -this.skiLength / 2, 3, this.skiLength);
        ctx.restore();
        ctx.save();
        ctx.translate(rightSkiCenter.x, rightSkiCenter.y);
        ctx.rotate(this.skiAngle - skiSplay);
        ctx.fillRect(-1, -this.skiLength/2, 3, this.skiLength);
        ctx.restore();

    }

    drawHealthBar(ctx) {
        // Draw a health bar across the top of the screen
        const padding_x = 10;
        const padding_y = 10;
        const width = ctx.canvas.width - 2 * padding_x;
        const height = 12;
        const healthWidth = width * this.health / this.maxHealth;
        ctx.fillStyle = "#cccccc";
        ctx.fillRect(padding_x-1, padding_y-1, width+2, height+2);
        ctx.fillStyle = "#f55742";
        ctx.fillRect(padding_x, padding_y, healthWidth, height);
        ctx.fillStyle = "#ff9f85";
        ctx.fillRect(padding_x, padding_y + 2, healthWidth, 4);

    }

    draw(ctx) {

        var skiSplay = this.state == CharacterState.JUMPING ? -0.05 : 0;

        ctx.save();
        ctx.translate(0, -this.z * 70);
        // Draw the ski
        ctx.save();
        const leftSkiCenter = this.leftSkiCenter();
        const rightSkiCenter = this.rightSkiCenter();
        ctx.translate(leftSkiCenter.x, leftSkiCenter.y);
        ctx.rotate(this.skiAngle + skiSplay);
        ctx.fillStyle = "blue";
        ctx.fillRect(0, -this.skiLength / 2, 1, this.skiLength);
        ctx.restore();
        ctx.save();
        ctx.translate(rightSkiCenter.x, rightSkiCenter.y);
        ctx.rotate(this.skiAngle - skiSplay);
        ctx.fillStyle = "blue";
        ctx.fillRect(0, -this.skiLength/2, 1, this.skiLength);
        ctx.restore();

        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = "black";
        ctx.restore();

    }
}
export default Character;