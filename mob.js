import SkiPhysics from "./skiPhysics.js";
import {randomCentered} from "./utils.js";

class MobManager {
    constructor(character, terrain, snowParticles, camera
    ) {
        this.character = character;
        this.terrain = terrain;
        this.snowParticles = snowParticles;
        this.mobs = [];
        this.camera = camera;
    }

    addMob(mob) {
        this.mobs.push(mob);
    }

    spawnGoblin() {
        let loc = this.camera.offBottomOfScreen(this.character); // {x: this.character.x, y:this.character.y + 100}; //
        let angle = randomCentered(Math.PI / 4);
        let vx = Math.sin(angle) * 100;
        let vy = Math.cos(angle) * 100;
        this.addMob(new Goblin(loc.x, loc.y, vx, vy, this.character));
    }

    spawnAxeOrc() {
        //const onLeft = Math.random() < 0.5;
        //var loc = onLeft? this.camera.offLeftOfScreen(this.character) : this.camera.offRightOfScreen(this.character);
        let loc = this.camera.offBottomOfScreen(this.character);
        this.addMob(new AxeBoarderOrc(loc.x, loc.y, 0, 0, this.character, this.terrain, this.snowParticles));
    }

    spawnSpearOrc() {
        const onLeft = Math.random() < 0.5;
        let loc = onLeft? this.camera.offLeftOfScreen(this.character) : this.camera.offRightOfScreen(this.character);
        this.addMob(new SpearOrc(loc.x, loc.y, 0, 0, this.character, this.terrain, this.snowParticles));
    }

    update(dt) {
        this.mobs = this.mobs.filter(mob => mob.health > 0);
        for (let mob of this.mobs) {
            mob.update(dt);
        }

        // Sort by mob.y
        this.mobs.sort((a, b) => a.y - b.y);
    }

    drawUnderMob(ctx) {
        for (let mob of this.mobs) {
            mob.drawTrail(ctx);
            mob.drawShadow(ctx);
        }
    }

    draw(ctx) {
        for (let mob of this.mobs) {
            mob.draw(ctx);
        }
    }
}

class Mob {
    constructor(x, y, vx, vy, health, width, height, color, character) {
        this.x = x;
        this.y = y;
        this.z = 0;
        this.maxHealth = health;
        this.health = health;
        this.velocity = { x: vx, y: vy };
        this.character = character;
        this.width = width;
        this.height = height;
        this.color = color;
        this.damageCooldown = 0.25;
        this.timeSinceDamagedCharacter = 0;
    }

    damage(amount) {
        this.health -= amount;
    }

    update(dt) {
        this.timeSinceDamagedCharacter += dt;
        this.x += this.velocity.x * dt;
        this.y += this.velocity.y * dt;
        if (this.collideWith(this.character)) {
            this.onCollideWithCharacter(this.character);
        }
    }

    collideWith(other) {
        return (
            this.z * 70 < other.z * 70 + other.height &&
            this.z * 70 + this.height > other.z * 70 &&
            this.x < other.x + other.width &&
            this.x + this.width > other.x &&
            this.y < other.y + other.height &&
            this.y + this.height > other.y
        );
    }

    onCollideWithCharacter(character) {
        // Override this method in subclasses
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.restore();
    }

    drawShadow(ctx) {
    }

    drawTrail(ctx) {
    }
}

class AxeBoarderOrc extends Mob {
    constructor(x, y, vx, vy, character, terrain, snowParticles) {
        super(x, y, vx, vy, 5, 8, 25, 'orange', character);
        this.terrain = terrain;
        this.snowParticles = snowParticles;
        this.skiPhysics = new SkiPhysics(x, y, vx, vy, snowParticles, 25, terrain);
        this.skiPhysics.setIsSnowboard(true);
        this.skiPhysics.skiWidth = 6;
        this.skiSpacing = 0;



        this.targetDistanceX = 40 + Math.random() * 50;
        this.targetDistanceY = randomCentered(30);
        this.sinAmplitude = Math.PI / 3;
        this.sinFrequency = 10;
        this.skiPhysics.drag = 0.50 + randomCentered(0.05);
        this.skiPhysics.accelleration = 800;
        this.skiPhysics.steering = 0.5;
        this.skiPhysics.edgeDrag = 4.0;
        this.skiPhysics.sprayFactor = 0.25;
        this.skiPhysics.maxTurnRate = 7;
        this.skiPhysics.maxInAirTurnRate = 12;

        if (Math.random() < 0.5) {
            this.targetDistanceX *= -1;
        }

        if (x < character.x) {
            this.targetAngle = -Math.PI / 2;
        } else {
            this.targetAngle = Math.PI / 2;
        }
        this.slowing = false;
        this.t = 0;
    }

    onCollideWithCharacter(character) {
        if (this.timeSinceDamagedCharacter < this.damageCooldown) return;
        this.timeSinceDamagedCharacter = 0;
        character.collideWithMob(this);
    }

    update(dt) {
        let lookaheadTime = 0.1; // seconds (when the y should match the character's y, at current vel)
        const dx = this.x - this.character.x - this.targetDistanceX;
        const dy = this.y - this.character.y +(this.skiPhysics.velocity.y  - this.character.skiPhysics.velocity.y) * lookaheadTime;

        let Kp = 0.05;
        this.targetAngle = Kp * dx;
        this.targetAngle = Math.max(Math.min(this.targetAngle, Math.PI / 4), -Math.PI / 4);


        let startSlowing = -100;
        let stopping = 400;
        //Below character
        if (dy > stopping) {
            this.slowing = false;
            if (Math.abs(this.skiPhysics.velocity.y) > 50 || Math.abs(this.skiPhysics.velocity.x) > 50) {
                let motionAngle = -Math.atan2(this.skiPhysics.velocity.x, this.skiPhysics.velocity.y);
                this.targetAngle = motionAngle + Math.PI / 2;
                                
            } else {
                this.targetAngle  = Math.PI / 2;
            }
        } else if (dy > startSlowing) {
            if (!this.slowing) {
                this.slowing = true;
                this.t = 0;
            }
            let slowingAmount = (dy - startSlowing)/(stopping - startSlowing);
            slowingAmount = Math.sqrt(slowingAmount);
            this.t += dt;
            this.targetAngle += Math.sin(this.t * this.sinFrequency) * this.sinAmplitude * slowingAmount;

        } else {
            this.slowing = false;
        }

        this.targetAngle = this.skiPhysics.getSnowboardAngle(this.targetAngle);

        this.skiPhysics.update(dt, this.targetAngle);
        this.x = this.skiPhysics.x;
        this.y = this.skiPhysics.y;
        this.z = this.skiPhysics.z;
        super.update(dt);
    }

    drawShadow(ctx) {
        this.skiPhysics.drawShadow(ctx);
    }

    drawTrail(ctx) {
        this.skiPhysics.drawTrail(ctx);
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(0, -this.skiPhysics.z * 70);

        this.skiPhysics.drawSkis(ctx, "blue", 0);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.width / 2, this.y - this.height, this.width, this.height);
        ctx.restore();
    }
}

class SpearOrc extends Mob {
    constructor(x, y, vx, vy, character, terrain, snowParticles) {
        super(x, y, vx, vy, 5, 15, 25, 'black', character);
        this.terrain = terrain;
        this.snowParticles = snowParticles;
        this.skiPhysics = new SkiPhysics(x, y, vx, vy, snowParticles, 45, terrain);
        if (x < character.x) {
            this.targetAngle = -Math.PI / 2;
        } else {
            this.targetAngle = Math.PI / 2;
        }
    }

    onCollideWithCharacter(character) {
        if (this.timeSinceDamagedCharacter < this.damageCooldown) return;
        this.timeSinceDamagedCharacter = 0;
        character.collideWithMob(this);
    }

    update(dt) {
        let lookaheadTime = 0.5; // seconds (when the y should match the character's y, at current vel)
        const dx = this.x - this.character.x;
        let dy = this.y - this.character.y;
        if (Math.abs(dx) > 50) {
            dy += (this.skiPhysics.velocity.y  - this.character.skiPhysics.velocity.y) * lookaheadTime;
        }
        this.skiPhysics.maxTurnRate = 1.5;
        this.skiPhysics.maxInAirTurnRate = 12;

       
        if (dy > 0) {
             // Below character

            if (this.targetAngle > 0) {
                this.targetAngle = Math.PI / 2;
            } else {
                this.targetAngle = -Math.PI / 2;
            }
            if (dy > 120 ) {
                this.skiPhysics.drag = 4;
                if (Math.abs(this.targetAngle - this.skiPhysics.skiAngle) > 0.2) {
                    this.skiPhysics.jump(5);
                }
            } else {
                this.skiPhysics.drag = 0.4;
            }


        } else {
            // Above character
            this.skiPhysics.drag = 0.4;
            this.targetAngle = Math.atan2(dx, -dy);

            if (Math.abs(this.targetAngle - this.skiPhysics.skiAngle) > 0.2 && Math.abs(this.skiPhysics.velocity.y) < 50) {
                this.skiPhysics.jump(5);
            }
        }
        this.targetAngle = Math.max(Math.min(this.targetAngle, Math.PI / 2), -Math.PI / 2);

        this.skiPhysics.update(dt, this.targetAngle);
        this.x = this.skiPhysics.x;
        this.y = this.skiPhysics.y;
        this.z = this.skiPhysics.z;
        super.update(dt);
    }

    drawShadow(ctx) {
        this.skiPhysics.drawShadow(ctx);
    }

    drawTrail(ctx) {
        this.skiPhysics.drawTrail(ctx);
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(0, -this.skiPhysics.z * 70);

        this.skiPhysics.drawSkis(ctx, "blue", 0);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.width / 2, this.y - this.height, this.width, this.height);
        ctx.restore();
    }
}

class Goblin extends Mob {
    constructor(x, y, vx, vy, character) {
        super(x, y, vx, vy, 3, 8, 15, 'green', character);
    }

    onCollideWithCharacter(character) {
        if (this.timeSinceDamagedCharacter < this.damageCooldown) return;
        this.timeSinceDamagedCharacter = 0;
        character.collideWithMob(this);
        //character.damage(5);
    }

    draw(ctx) {
        ctx.save();
        // draw skis
        ctx.fillStyle = 'black';
        ctx.save();
        let velAngle = Math.atan2(this.velocity.x, this.velocity.y);
        ctx.translate(this.x + this.width / 2, this.y + this.height);
        ctx.rotate(-velAngle);
        ctx.save();
        ctx.rotate(-0.25);    
        ctx.fillRect(-5, -this.height / 2, 1, this.height);
        ctx.restore();
        ctx.save();
        ctx.rotate(0.25);
        ctx.fillRect(5, -this.height / 2, 1, this.height);
        ctx.restore();
        ctx.restore();
        ctx.restore();
        ctx.fillStyle = "brown";
        ctx.fillRect(this.x, this.y, this.width, this.height);
        //Draw green head
        ctx.fillStyle = 'green';
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y - 2, 8, 0, Math.PI * 2);
        ctx.fill();
        // draw ears
        ctx.fillStyle = 'green';

    }
}

export default MobManager;

