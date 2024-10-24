import CharacterState from "./skiPhysics.js";
import SkiPhysics from "./skiPhysics.js";
import Sword from "./weapons.js";

class Character {
    constructor(x, y, particleEngine, treeManager, joystick) {
        this.level = undefined;
        this.mass = 100;
        this.skiPhysics = new SkiPhysics(x, y, 0, 0, particleEngine, 30, treeManager, this.mass);
        this.skiPhysics.maxTurnRate = 5.0;
        this.particleEngine = particleEngine;
        this.treeManager = treeManager;

        this.rightHand = undefined;
        this.leftHand = undefined;
        this.jacket = undefined;
        this.pants = undefined;
        this.hat = undefined;
        this.goggles = undefined;
        this.boots = undefined;
        this.skis = undefined;
        
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
        this.COR = 0.5;

        this.targetSkiAngle = this.skiPhysics.skiAngle;

        // Collision damage parameters
        this.speedDamageFactor = 0.01;

        // Jumping parameters
        this.floatMoveSpeedX = 500;
        this.floatMoveSpeedY = 0;

        this.clickJumpSpeed = 6;

        // set up state vars
        this.health = this.maxHealth;
        this.medals = 0;

        this.joystick.addTapListener(() => {
            if (this.skiPhysics.isJumping()) {
                this.skiPhysics.stomp();
            } else {
                this.skiPhysics.jump(this.clickJumpSpeed);
            }
        });

        this.skiPhysics.setOnTreeCollision((treeEntity) => {

        });

        this.skiPhysics.setOnLand((time) => {
            if (this.level) {
                this.level.airTime += time;
            }
        });

    }

    equip(equipment, chosenSlot) {
        if (equipment.getSlots().includes("jacket")) {
            this.jacket = equipment;
        }
        if (equipment.getSlots().includes("pants")) {
            this.pants = equipment;
        }
        if (equipment.getSlots().includes("skis")) {
            this.skis = equipment;
        }
        if (equipment.getSlots().includes("boots")) {
            this.boots = equipment;
        }
        if (equipment.getSlots().includes("hat")) {
            this.hat = equipment;
        }
        if (equipment.getSlots().includes("goggles")) {
            this.goggles = equipment;
        }
        if (chosenSlot == "right_hand") {
            this.rightHand = equipment;
            equipment.equip(this, this.mobManager);
        }
        if (chosenSlot == "left_hand") {
            this.leftHand = equipment;
            equipment.equip(this, this.mobManager);
        }
        console.log(this.getAllEquipment());
    }

    getAllEquipment() {
        return {
            jacket: this.jacket,
            right_hand: this.rightHand,
            left_hand: this.leftHand,
            boots: this.boots,
            hat: this.hat,
            goggles: this.goggles,
            pants: this.pants,
            skis: this.skis
        };
    }

    equipRightHand(weapon) {
        this.rightHand = weapon;
    }

    equipLeftHand(weapon) {
        this.leftHand = weapon;
    }

    scoreKill(mob) {
        if (mob.type == "goblin") {
            this.level.goblinKilled();
        } else {
            this.level.enemyKilled();
        }
    }

    collideWithMob(mob) {
        console.log("Collided with mob");
        // Calculate the vector between player and mob
        const dx = mob.x - this.x;
        const dy = mob.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Prevent division by zero if entities are at the same position
        if (distance === 0) {
            console.error("Entities are at the same position; cannot compute collision normal.");
            return;
        }

        // Calculate the normal vector (unit vector)
        const nx = dx / distance;
        const ny = dy / distance;

        // Calculate relative velocity
        const rvx = mob.velocity.x - this.velocity.x;
        const rvy = mob.velocity.y - this.velocity.y;

        // Calculate relative velocity along the normal
        const velAlongNormal = -rvx * nx + -rvy * ny;

        // Do not resolve if velocities are separating
        if (velAlongNormal < 0) {
            return;
        }

        // Calculate average Coefficient of Restitution
        const COR = (this.COR + mob.COR) / 2;

        // Calculate impulse scalar
        const impulseScalar = (1 + COR) * velAlongNormal / (1 / this.mass + 1 / mob.mass);

        // Calculate impulse vector
        const impulseX = impulseScalar * nx;
        const impulseY = impulseScalar * ny;

        // Apply impulse to player and mob
        const velReductionX = impulseX / this.mass;
        const velReductionY = impulseY / this.mass;

        // Calculate speeds
        const playerSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
        const mobSpeed = Math.sqrt(mob.velocity.x ** 2 + mob.velocity.y ** 2);

        // Define deadband and scaling factor for damage
        const deadband = 100;        // Units per second
        const damageScaling = 0.02;     // Adjust this factor as needed

        // Initialize damage variables
        let damageToMob = 0;
        let damageToPlayer = 0;

        // Determine which entity is moving faster
        if (playerSpeed > mobSpeed) {
            // Player is faster; calculate damage to mob
            if (velAlongNormal > deadband) {
                damageToMob = (velAlongNormal - deadband) * damageScaling;
                console.log("Damage to mob: " + damageToMob);
            }
        } else if (mobSpeed > playerSpeed) {
            // Mob is faster; calculate damage to player
            if (velAlongNormal > deadband) {
                damageToPlayer = (velAlongNormal - deadband) * damageScaling;
                console.log("Damage to player: " + damageToPlayer);
            }
        }

        // Apply damage to mob
        if (damageToMob > 0) {
            const mobOriginalHealth = mob.health;
            let killed = mob.damage(damageToMob);
            if (killed) {
                this.scoreKill(mob);
            }

            // Check if mob is killed
            if (mob.health <= 0) {
                const excessDamage = damageToMob - mobOriginalHealth;
                if (excessDamage > 0) {
                    const momentumConservationFactor = Math.min(excessDamage / 50, 1.0);
                    this.velocity.x += velReductionX * momentumConservationFactor;
                    this.velocity.y += velReductionY * momentumConservationFactor;
                }
            }
        }
        // Apply damage to player
        if (damageToPlayer > 0) {
            this.damage(damageToPlayer);
        }

        this.velocity.x -= velReductionX;
        this.velocity.y -= velReductionY;
        mob.applyImpulse(impulseX, impulseY);

    }

    damage(damage) {
        this.health -= damage;
        if (this.health <= 0) {
            this.health = 0;
            // refresh the page
            window.location.reload();
        }
    }

    startedRun() {
        if (this.level == undefined){
            return false;
        }
        return !this.level.isComplete();
    }

    update(dt, ctx) {

        if (this.level != undefined) {
            this.level.update(dt);
        }

        if (this.joystick.isActive) {
            this.targetSkiAngle = Math.atan2(this.joystick.currVals.y, this.joystick.currVals.x) + Math.PI / 2;
        }

        const targetSkiAngle = Math.min(
            Math.max(Math.PI / 2 - this.maxUphillAngle, (this.targetSkiAngle + 2 * Math.PI) % (2 * Math.PI)),
            Math.PI * 1.5 + this.maxUphillAngle
        );
        this.skiPhysics.update(dt, targetSkiAngle);

        if (this.rightHand) {
            this.rightHand.update(dt, this, this.mobManager);
        }
        if (this.leftHand) {
            this.leftHand.update(dt);
        }

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
                if (entity.type == "firstAid") {
                    this.health = Math.min(this.health + 30, this.maxHealth);
                    entity.claim();
                }
                if (entity.type == "skiBoundary") {
                    // Compute the signed distance from the player to the boundary
                    let distance = (this.x - entity.x1) * entity.normalX + (this.y - entity.y1) * entity.normalY;
                
                    // Compute the dot product of velocity and normal
                    let dotProduct = this.skiPhysics.velocity.x * entity.normalX + this.skiPhysics.velocity.y * entity.normalY;
                
                    // Define a small threshold (epsilon) for proximity
                    let epsilon = 10; // Adjust as necessary
                    
                    //console.log("Distance: " + distance.toFixed(2), "Dot product: " + dotProduct.toFixed(2));
                    
                    if (Math.abs(distance) <= epsilon && dotProduct * distance < 0) {
                        console.log("Collided with ski boundary");
                
                        // Correct the player's position to be just outside the boundary
                        let penetrationDepth = distance - epsilon;
                        this.x -= penetrationDepth * entity.normalX;
                        this.y -= penetrationDepth * entity.normalY;
                
                        // Remove the normal component from the velocity
                        this.skiPhysics.velocity.x -= dotProduct * entity.normalX;
                        this.skiPhysics.velocity.y -= dotProduct * entity.normalY;
                    }
                }
                if (entity.type == "skiRunSign") {
                    this.level = entity.level;
                    this.level.start();
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

        // Draw medals
        if (this.medals > 0) {
            const medalEmoji = '🏅';
            const medalText = `${medalEmoji}${Math.round(this.medals)}`;
            const medalY = padding_y + height + 10;
            
            ctx.font = '300 18px Oswald'    
            ctx.textBaseline = 'top';
            ctx.textAlign = 'right';
            
            const medalX = ctx.canvas.width - padding_x;
            
            ctx.fillStyle = 'black';
            ctx.fillText(medalText, medalX, medalY);
            ctx.textBaseline = 'alphabetic';
            ctx.textAlign = 'left';
        }
    }

    draw(ctx) {

        var skiSplay = this.skiPhysics.isJumping() ? 0.05 : 0.0;

        ctx.save();
        ctx.translate(0, -this.z * 70);
        this.skiPhysics.drawSkis(ctx, "blue", skiSplay);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.width / 2, this.y - this.height, this.width, this.height);
        if (this.leftHand) {
            this.leftHand.draw(ctx);
        }
        if (this.rightHand) {
            this.rightHand.draw(ctx);
        }
        ctx.restore();

    }
}
export default Character;