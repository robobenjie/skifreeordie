import SkiPhysics from "./skiPhysics.js";
import {randomCentered} from "./utils.js";
import Projectile from "./projectile.js";
import { MobDeathParticleEffect } from "./particle_engine.js";

class MobManager {
    constructor(character, terrain, snowParticles, camera
    ) {
        this.character = character;
        this.terrain = terrain;
        this.snowParticles = snowParticles;
        this.mobs = [];
        this.projectiles = [];
        this.camera = camera;
        this.deathEffect = new MobDeathParticleEffect(300);
    }

    addMob(mob) {
        this.mobs.push(mob);
        mob.setManager(this);
        mob.setCamera(this.camera);
    }

    addProjectile(projectile) {
        this.projectiles.push(projectile);
    }

    numAxeOrcs() {
        return this.mobs.filter(mob => mob instanceof AxeBoarderOrc).length;
    }

    numSpearOrcs() {
        return this.mobs.filter(mob => mob instanceof SpearOrc).length;
    }

    numGoblins() {
        return this.mobs.filter(mob => mob instanceof Goblin).length;
    }

    spawnGoblin() {
        console.log("Spawning goblin");
        let loc = this.camera.offBottomOfScreen(); // {x: this.character.x, y:this.character.y + 100}; //
        let angle = randomCentered(Math.PI / 4);
        let vx = Math.sin(angle) * 100;
        let vy = Math.cos(angle) * 100;
        this.addMob(new Goblin(loc.x, loc.y, vx, vy, this.character, this.terrain, this.snowParticles, this.deathEffect, this.camera));
    }

    spawnAxeOrc() {
        //const onLeft = Math.random() < 0.5;
        //var loc = onLeft? this.camera.offLeftOfScreen(this.character) : this.camera.offRightOfScreen(this.character);
        let loc = this.camera.offBottomOfScreen(this.character);
        this.addMob(new AxeBoarderOrc(loc.x, loc.y, 0, 0, this.character, this.terrain, this.snowParticles, this.deathEffect));
    }

    spawnSpearOrc() {
        const onLeft = Math.random() < 0.5;
        let loc = onLeft? this.camera.offLeftOfScreen(this.character) : this.camera.offRightOfScreen(this.character);
        this.addMob(new SpearOrc(loc.x, loc.y, 0, 0, this.character, this.terrain, this.snowParticles, this.deathEffect));
    }

    update(dt) {

        this.deathEffect.update(dt);

        // filter out inactive projectiles
        this.projectiles = this.projectiles.filter(projectile => projectile.active);

        for (let mob of this.mobs) {
            if (mob.shouldBackOff && this.camera.distanceOffScreenY(mob.y) < - 100) {
                mob.health = 0;
            }
            mob.update(dt);
        }

        this.mobs = this.mobs.filter(mob => mob.health > 0);
        for (let projectile of this.projectiles) {
            projectile.update(dt);
            if (projectile.collides(this.character)) {
                projectile.onCollision(this.character);
            }
        }

                

        // Sort by mob.y
        this.mobs.sort((a, b) => a.y - b.y);
        this.projectiles.sort((a, b) => a.y - b.y);
    }

    notifyLevelComplete() {
        for (let mob of this.mobs) {
            mob.backOff();
        }
    }

    mobsInRegion(x, y, neg_x, pos_x, neg_y, pos_y) {
    // Filter mobs that are within the specified region
        return this.mobs.filter(mob => {
            return mob.x >= x + neg_x && mob.x <= x + pos_x &&
                   mob.y >= y + neg_y && mob.y <= y + pos_y;
        });
    }

    drawUnderMob(ctx) {
        for (let mob of this.mobs) {
            mob.drawTrail(ctx);
            mob.drawShadow(ctx);
        }
    }

    drawUnderProjectile(ctx) {
        for (let projectile of this.projectiles) {
            projectile.drawShadow(ctx);
        }
    }

    drawEffects(ctx){
        this.deathEffect.draw(ctx);
    }
}

class Mob {
    constructor(x, y, vx, vy, health, width, height, color, character, deathEffect) {
        this.type = "mob";
        this.x = x;
        this.y = y;
        this.z = 0;
        this.maxHealth = health;
        this.health = health;
        this.velocity = { x: vx, y: vy };
        this.character = character;
        this.deathEffect = deathEffect;
        this.width = width;
        this.height = height;
        this.color = color;
        this.damageCooldown = 0.25;
        this.timeSinceDamagedCharacter = 0;
        this.mass = 80;
        this.COR = 0.5;

        this.shouldBackOff = false;

        this.colors = ["green"]
    }

    setManager(manager) {
        this.manager = manager;
    }

    backOff() {
        this.shouldBackOff = true;
    }

    setCamera(camera) {
        this.camera = camera;
    }

    applyImpulse(impulseX, impulseY) {
        if (this.skiPhysics) {
            this.skiPhysics.velocity.x += impulseX / this.mass;
            this.skiPhysics.velocity.y += impulseY / this.mass;
        } else {
            this.velocity.x += impulseX / this.mass;
            this.velocity.y += impulseY / this.mass;
        }
    }

    damage(amount) {
        // Returns if the damage killed the mob
        let prevHealth = this.health;
        this.health -= amount;
        if (this.health <= 0 && prevHealth > 0) {
            return true;
        }
        return false;
    }

    fireProjectile(projectile) {
        this.manager.addProjectile(projectile);
    }

    isOnScreen() {
        return this.camera.isOnScreen(this.x, this.y);
    }

    update(dt) {
        this.timeSinceDamagedCharacter += dt;
        this.x += this.velocity.x * dt;
        this.y += this.velocity.y * dt;
        if (this.collideWith(this.character)) {
            this.onCollideWithCharacter(this.character);
        }
        if (this.isOnScreen()) {    
            let terrainCollisions = this.terrain.collidesWith(this.x, this.y, this.width, this.width, this.velocity.y * dt);
            for (let entity of terrainCollisions) {
                if (entity.type == "tree") {
                    if (this.x > entity.x) {
                        this.skiPhysics.setVelocity({
                            x: 10.0,
                            y: 0
                        });
                    } else {
                        this.skiPhysics.setVelocity({
                            x: 10.0,
                            y: 0
                        });
                    }
                }
                if (entity.type == "jumpRamp") {
                    this.skiPhysics.rampJump()
                }
            }
        }

        if (this.health <= 0 && this.isOnScreen()) {
            let num_particles = 5 * this.maxHealth;
            console.log("Creating particles", num_particles)
            for (let i = 0; i < num_particles; i++) {
                let angle = Math.random() * Math.PI * 2;
                let vel = 100 + randomCentered(50);
                let lifetime = 1.0 + randomCentered(0.5);
                let randomColor = this.colors[Math.floor(Math.random() * this.colors.length)];

                this.deathEffect.emit(
                    this.x,
                    this.y,
                    { 
                        x: Math.cos(angle) * vel + this.velocity.x,
                        y: Math.sin(angle) * vel * 0.4 + this.velocity.y * 1.3
                    },
                    lifetime,
                    randomColor
                );
            }
        }
    }

    cheatBackCloseToCharacter() {
        if (this.camera.distanceOffScreenX(this.x) < -100) {
            if (this.skiPhysics) {
                this.skiPhysics.x = this.camera.leftOfScreen() - 30;
                this.skiPhysics.velocity.x = this.camera.velocity.x;
            } else {
                this.x = this.camera.leftOfScreen() - 30;
            }
        }
        if (this.camera.distanceOffScreenX(this.x) > 100) {
            if (this.skiPhysics) {
                this.skiPhysics.x = this.camera.rightOfScreen() + 30;
                this.skiPhysics.velocity.x = this.camera.velocity.x;
            } else {
                this.x = this.camera.rightOfScreen() + 30;
            }
        }
        if (this.camera.distanceOffScreenY(this.y) < -100) {
            if (this.skiPhysics) {
                this.skiPhysics.y = this.camera.topOfScreen() - 30;
                if (this.skiPhysics.velocity.y < this.camera.velocity.y) {
                    this.skiPhysics.velocity.y = this.camera.velocity.y;
                }
            } else {
                this.y = this.camera.topOfScreen() - 30;
            }
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
        const barWidth = this.maxHealth * 4;
        if (this.health < this.maxHealth) {
            ctx.fillStyle = '#f2c7bd'; // Background color
            ctx.fillRect(this.x - barWidth / 2, this.y - this.height - 13 - this.z * 70, barWidth, 3);
            ctx.fillStyle = '#509e47';  // Green color
            ctx.fillRect(this.x - barWidth / 2, this.y - this.height - 13 - this.z * 70, barWidth * this.health / this.maxHealth, 3);
        }
    }

    drawShadow(ctx) {
    }

    drawTrail(ctx) {
    }
}

class AxeBoarderOrc extends Mob {
    constructor(x, y, vx, vy, character, terrain, snowParticles, deathEffect) {
        super(x, y, vx, vy, 5, 8, 25, 'orange', character, deathEffect);
        this.colors = ["orange", "yellow", "green"]
        this.terrain = terrain;
        this.snowParticles = snowParticles;
        this.skiPhysics = new SkiPhysics(x, y, vx, vy, snowParticles, 25, terrain, this.mass);
        this.skiPhysics.setIsSnowboard(true);
        this.skiPhysics.skiWidth = 6;
        this.skiSpacing = 0;

        this.AxeThrowInterval = 2 + randomCentered(0.5);
        this.AxeSpeed = 300;

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

        this.timeSinceAxeThrown = 0;
    }

    onCollideWithCharacter(character) {
        if (this.timeSinceDamagedCharacter < this.damageCooldown) return;
        this.timeSinceDamagedCharacter = 0;
        character.collideWithMob(this);
    }

    update(dt) {
        // Axe throwing
        this.cheatBackCloseToCharacter();
        if (this.camera.isOnScreen(this.x, this.y)) {
            this.timeSinceAxeThrown += dt;
        } else {
            this.timeSinceAxeThrown = 0;
        }

        if (this.timeSinceAxeThrown > this.AxeThrowInterval) {
            console.log("Throwing axe");
            this.timeSinceAxeThrown = 0;
            let angle = Math.atan2(this.character.y - this.y, this.character.x - this.x);
            let projectile = new Projectile(
                this.x, 
                this.y, 
                5,
                { 
                    x: Math.cos(angle) * this.AxeSpeed + this.character.velocity.x, 
                    y: Math.sin(angle) * this.AxeSpeed + this.character.velocity.y, 
                    z: 50,
                }, 
                this.camera);
            this.fireProjectile(projectile);
        }


        // Movement
        let lookaheadTime = 0.1; // seconds (when the y should match the character's y, at current vel)
        const dx = this.x - this.character.x - this.targetDistanceX;
        const dy = this.y - this.character.y +(this.skiPhysics.velocity.y  - this.character.skiPhysics.velocity.y) * lookaheadTime;

        let Kp = 0.05;
        this.targetAngle = Kp * dx;
        this.targetAngle = Math.max(Math.min(this.targetAngle, Math.PI / 4), -Math.PI / 4);


        let startSlowing = -100;
        let stopping = 400;
        //Below character
        if (dy > stopping || this.shouldBackOff) {
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
        this.velocity = this.skiPhysics.velocity;
        super.update(dt);
        this.x = this.skiPhysics.x;
        this.y = this.skiPhysics.y;
        this.z = this.skiPhysics.z;
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
        super.draw(ctx);
    }
}

class SpearOrc extends Mob {
    constructor(x, y, vx, vy, character, terrain, snowParticles, deathEffect) {
        super(x, y, vx, vy, 5, 15, 25, 'black', character, deathEffect);
        this.terrain = terrain;
        this.snowParticles = snowParticles;
        this.colors = ["black", "green"];
        this.skiPhysics = new SkiPhysics(x, y, vx, vy, snowParticles, 45, terrain, this.mass);
        if (x < character.x) {
            this.targetAngle = -Math.PI / 2;
        } else {
            this.targetAngle = Math.PI / 2;
        }
    }

    onCollideWithCharacter(character) {

        character.collideWithMob(this);        
        if (this.timeSinceDamagedCharacter < this.damageCooldown) return;
        this.timeSinceDamagedCharacter = 0;
        let vecToPlayer = {
            x: character.x - this.x,
            y: character.y - this.y
        }
        let magVecToPlayer = Math.sqrt(vecToPlayer.x ** 2 + vecToPlayer.y ** 2);
        let unitVecToPlayer = {
            x: vecToPlayer.x / magVecToPlayer,
            y: vecToPlayer.y / magVecToPlayer
        }
        let relativeVelocity = {
            x: this.skiPhysics.velocity.x - character.skiPhysics.velocity.x,
            y: this.skiPhysics.velocity.y - character.skiPhysics.velocity.y
        }   
        let dot = unitVecToPlayer.x * relativeVelocity.x + unitVecToPlayer.y * relativeVelocity.y;
        if (dot > 10) {
            character.damage(10 + dot / 30);
        }
    }

    update(dt) {
        this.cheatBackCloseToCharacter();
        let lookaheadTime = 0.5; // seconds (when the y should match the character's y, at current vel)
        const dx = this.x - this.character.x;
        let dy = this.y - this.character.y;
        if (Math.abs(dx) > 50) {
            dy += (this.skiPhysics.velocity.y  - this.character.skiPhysics.velocity.y) * lookaheadTime;
        }
        this.skiPhysics.maxTurnRate = 1.5;
        this.skiPhysics.maxInAirTurnRate = 12;

       
        if (dy > 0 || this.shouldBackOff) {
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
        this.velocity = this.skiPhysics.velocity;
        super.update(dt);
        this.x = this.skiPhysics.x;
        this.y = this.skiPhysics.y;
        this.z = this.skiPhysics.z;
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
        super.draw(ctx);
    }
}

class Goblin extends Mob {
    constructor(x, y, vx, vy, character, terrain, snowParticles, deathEffect, camera) {
        super(x, y, vx, vy, 3, 8, 15, 'green', character, deathEffect);
        this.type = "goblin";
        this.maxHealth = 3;
        this.health = 3;
        this.camera = camera;
        this.colors = ["purple", "brown"]

        this.terrain = terrain;
        this.snowParticles = snowParticles;
        this.skiPhysics = new SkiPhysics(x, y, vx, vy, snowParticles, 25, terrain, this.mass);
        if (x < character.x) {
            this.targetAngle = -Math.PI / 6;
        } else {
            this.targetAngle = Math.PI / 6;
        }
        
        this.sinAmplitude = Math.PI / 6;
        this.sinFrequency = 5;
        this.skiPhysics.drag = 3.5 + randomCentered(0.05);
        this.skiPhysics.maxTurnRate = 5;
        this.skiPhysics.skiSpacing = 15;
        this.skiSplay = 0.2;

        this.gameTime = 0;
    }

    update(dt) {
        this.gameTime += dt;
        this.skiPhysics.update(dt, this.targetAngle + Math.sin(this.gameTime * this.sinFrequency) * this.sinAmplitude);
        this.velocity = this.skiPhysics.velocity;
        super.update(dt);
        this.x = this.skiPhysics.x;
        this.y = this.skiPhysics.y;
        this.z = this.skiPhysics.z;

        let aboveScreen = this.camera.distanceOffScreenY(this.y);
        if (aboveScreen < -700) {
            this.health = 0;
        }

    }


    onCollideWithCharacter(character) {
        character.collideWithMob(this);
    }

    drawTrail(ctx) {
        this.skiPhysics.drawTrail(ctx);
    }

    draw(ctx) {
        this.skiPhysics.drawSkis(ctx, "red", this.skiSplay);
        ctx.fillStyle = "brown";
        ctx.fillRect(this.x - this.width / 2, this.y - this.height, this.width, this.height);
        //Draw green head
        ctx.fillStyle = 'purple';
        ctx.beginPath();
        ctx.arc(this.x, this.y - 2 - this.height, 8, 0, Math.PI * 2);
        ctx.fill();
        // draw ears
        ctx.fillStyle = 'green';
        super.draw(ctx);
    }
}

export default MobManager;

