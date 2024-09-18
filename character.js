import CharacterState from "./skiPhysics.js";
import SkiPhysics from "./skiPhysics.js";

class Character {
    constructor(x, y, particleEngine, treeManager, joystick) {
        this.skiPhysics = new SkiPhysics(x, y, 0, 0, particleEngine, 30, treeManager);
        this.particleEngine = particleEngine;
        this.treeManager = treeManager;
        this.x = x;
        this.y = y;
        this.z = 0;
        this.velocity = { x: 0, y: 0 };
        this.width = 10;
        this.height = 25;
        this.color = "red";
        this.hitBoxSizeX = 10;
        this.hitBoxSizeY =  5;
        this.joystick = joystick;
        this.maxHealth = 100;
        this.maxUphillAngle = 25 * Math.PI / 180;

        this.targetSkiAngle = this.skiPhysics.skiAngle;

        // Collision damage parameters
        this.speedDamageFactor = 0.01;

        // Jumping parameters
        this.floatMoveSpeedX = 500;
        this.floatMoveSpeedY = 0;

        this.clickJumpSpeed = 6;

        // set up state vars
        this.health = this.maxHealth;

        this.joystick.addTapListener(() => {
            if (this.skiPhysics.isJumping()) {
                this.skiPhysics.stomp();
            } else {
                this.skiPhysics.jump(this.clickJumpSpeed);
            }
        });

        this.skiPhysics.setOnTreeCollision((treeEntity) => {

        });

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

        if (this.joystick.isActive) {
            this.targetSkiAngle = Math.atan2(this.joystick.currVals.y, this.joystick.currVals.x) + Math.PI / 2;
        }

        const targetSkiAngle = Math.min(
            Math.max(Math.PI / 2 - this.maxUphillAngle, (this.targetSkiAngle + 2 * Math.PI) % (2 * Math.PI)),
            Math.PI * 1.5 + this.maxUphillAngle
        );
        this.skiPhysics.update(dt, targetSkiAngle);

        if (this.skiPhysics.isJumping()) {
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
            this.skiPhysics.applyForce(glideForce);
        } else {
            const collidingEntities = this.treeManager.collidesWith(this.x, this.y , this.hitBoxSizeX, this.hitBoxSizeY, this.skiPhysics.velocity.y * dt);
            for (let entity of collidingEntities) {
                if (entity.type == "tree") {
                    const damage = Math.max((Math.abs(this.velocity.y) - 100) * 0.01, 0);
                    this.damage(damage);
                    this.skiPhysics.setVelocity({
                        x: this.skiPhysics.skiUnitVector.x * 10,
                        y: this.skiPhysics.skiUnitVector.y * 10
                    });
                }
                if (entity.type == "jumpRamp") {
                    this.skiPhysics.rampJump()
                }   
            }
        }
        this.x = this.skiPhysics.x;
        this.y = this.skiPhysics.y;
        this.z = this.skiPhysics.z;
        this.velocity = this.skiPhysics.velocity;
    }

    drawTrail(ctx) {
        this.skiPhysics.drawTrail(ctx);
    }

    drawShadow(ctx) {
        this.skiPhysics.drawShadow(ctx);
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

        var skiSplay = this.skiPhysics.isJumping() ? 0.05 : 0.0;

        ctx.save();
        ctx.translate(0, -this.z * 70);
        this.skiPhysics.drawSkis(ctx, "blue", skiSplay);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.width / 2, this.y - this.height, this.width, this.height);
        ctx.fillStyle = "black";
        ctx.restore();

    }
}
export default Character;