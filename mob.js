import SkiPhysics from "./skiPhysics.js";
import {randomCentered} from "./utils.js";
import {Projectile, AxeProjectile} from "./projectile.js";
import { MobDeathParticleEffect } from "./particle_engine.js";
import OrkModel from "./ork_model.js";
import GoblinModel from "./goblin_model.js";
import TrollModel from "./troll_model.js";
import {SnowmobileModel, SnowmobileTracks} from "./snowmobile_model.js";
import {normalizeAngle, throttledLog, LowPassFilter} from "./utils.js";

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
        this.deadMobTrails = [];
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

    numSnowmobiles() {
        return this.getSnowmobiles().length;
    }

    getSnowmobiles() {
        return this.mobs.filter(mob => mob instanceof Snowmobile);
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
        this.addMob(new AxeBoarderOrc(loc.x, loc.y, 0, 0, this.character, this.terrain, this.snowParticles, this.deathEffect, this.camera));
    }

    spawnSpearOrc() {
        const onLeft = Math.random() < 0.5;
        let loc = onLeft? this.camera.offLeftOfScreen(this.character) : this.camera.offRightOfScreen(this.character);
        this.addMob(new SpearOrc(loc.x, loc.y, 0, 0, this.character, this.terrain, this.snowParticles, this.deathEffect, this.camera));
    }

    spawnSnowmobile() {
        let loc = this.camera.offBottomOfScreen(this.character);
        this.addMob(new Snowmobile(loc.x, loc.y, 0, 0, this.character, this.terrain, this.snowParticles, this.deathEffect, this.camera));
    }

    rotateAbout(x, y, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        for (let mob of this.mobs) {
            let dx = mob.x - x;
            let dy = mob.y - y;
            mob.x = x + dx * cos - dy * sin;
            mob.y = y + dx * sin + dy * cos;
            if (mob.skiPhysics) {
                mob.skiPhysics.rotateAbout(x, y, angle);
                mob.skiPhysics.x = mob.x;
                mob.skiPhysics.y = mob.y;
            }
        }
        for (let trail of this.deadMobTrails) {
            trail.rotateAbout(x, y, angle);
        }
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

            if (mob.health <= 0) {
                if (mob.skiPhysics) {
                    for (let trail of mob.skiPhysics.trails ) {
                        this.deadMobTrails.push(trail);
                    }
                }
            }
        }

        this.mobs = this.mobs.filter(mob => mob.health > 0);
        for (let projectile of this.projectiles) {
            projectile.update(dt);
            if (projectile.collides(this.character)) {
                projectile.onCollision(this.character);
            }
        }

        // Filter out dead mob trails that are off screen
        this.deadMobTrails = this.deadMobTrails.filter(trail => !trail.isOffScreen(this.character));

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

    mobsInArc(unit_vec_x, unit_vec_y, width_degrees, max_distance) {
        const cosHalfAngle = Math.cos((width_degrees / 2) * (Math.PI / 180));
        
        return this.mobs
            .map(mob => {
                const dx = mob.x - this.character.x;
                const dy = mob.y - this.character.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                const mob_unit_x = dx / distance;
                const mob_unit_y = dy / distance;
                
                const dotProduct = -unit_vec_x * mob_unit_x + -unit_vec_y * mob_unit_y;
                
                return { mob, distance, inArc: dotProduct > cosHalfAngle && distance < max_distance };
            })
            .filter(item => item.inArc)
            .sort((a, b) => a.distance - b.distance)
            .map(item => item.mob);
    }

    drawUnderMob(ctx) {
        for (let mob of this.mobs) {
            mob.drawTrail(ctx);
            mob.drawShadow(ctx);
        }
        for (let trail of this.deadMobTrails) {
            trail.draw(ctx);
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

    onCollideWithTerrain(terrainCollisions) {
        // Override this method in subclasses
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
            this.onCollideWithTerrain(terrainCollisions);
            if (this.skiPhysics) {

                for (let entity of terrainCollisions) {
                    if (entity.type == "tree") {
                        if (this.x > entity.x) {
                            this.skiPhysics.setVelocity({
                                x: 10.0,
                                y: 0
                            });
                        } else {
                            this.skiPhysics.setVelocity({
                                x: -10.0,
                                y: 0
                            });
                        }
                    }
                    if (entity.type == "jumpRamp") {
                        this.skiPhysics.rampJump()
                    }
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
    constructor(x, y, vx, vy, character, terrain, snowParticles, deathEffect, camera) {
        super(x, y, vx, vy, 5, 8, 25, 'orange', character, deathEffect);
        this.terrain = terrain;
        this.snowParticles = snowParticles;
        this.skiPhysics = new SkiPhysics(x, y, vx, vy, snowParticles, 25, terrain, this.mass, camera);
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
        this.skiPhysics.calculateParams();

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
        this.model = new TrollModel();
        this.colors = this.model.getColors();
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
            let projectile = new AxeProjectile(
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
        let leanAngle = Math.min(Math.max(this.skiPhysics.leanAngle, -0.7), 0.7);
        const throwPrepFraction = 1 - this.timeSinceAxeThrown / this.AxeThrowInterval;

        const angleToTarget = Math.atan2(this.character.y - this.y, this.character.x - this.x) + Math.PI / 2;

        this.model.update(dt, this.skiPhysics.skiAngle, -leanAngle, angleToTarget, throwPrepFraction);
    }

    drawShadow(ctx) {
        this.skiPhysics.drawShadow(ctx);
    }

    drawTrail(ctx) {
        this.skiPhysics.drawTrail(ctx);
    }

    draw(ctx) {
        ctx.save();
            ctx.translate(this.x, this.y - this.skiPhysics.z * 70);
            ctx.scale(0.8, 0.8);
            this.model.draw(ctx);
        ctx.restore();
        super.draw(ctx);
    }
}

class SpearOrc extends Mob {
    constructor(x, y, vx, vy, character, terrain, snowParticles, deathEffect, camera) {
        super(x, y, vx, vy, 5, 15, 25, 'black', character, deathEffect);
        this.spearDamage = 15;
        this.pokeDistance = 30;
        this.pokeDelay = 0.5;
        this.pokeAnimationStart = 0.1;

        this.terrain = terrain;
        this.snowParticles = snowParticles;
        this.colors = ["#252422", "#83BCA9","#252422", "#83BCA9","#CC444B"];
        this.skiPhysics = new SkiPhysics(x, y, vx, vy, snowParticles, 45, terrain, this.mass, camera);
        this.skiPhysics.calculateParams();

        if (x < character.x) {
            this.targetAngle = -Math.PI / 2;
        } else {
            this.targetAngle = Math.PI / 2;
        }
        this.model = new OrkModel();
        this.spearPokeTimer = 0;
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
        if (dot > 2) {
            character.damage(Math.min(20 + dot / 10, 40));
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

        let angleToTarget = Math.atan2(dx, -dy);
        const distanceToTarget = Math.sqrt(dx * dx + dy * dy);
        if (distanceToTarget < this.pokeDistance && Math.abs(angleToTarget - this.skiPhysics.skiAngle) < Math.PI / 4) {
            this.spearPokeTimer += dt;
            if (this.spearPokeTimer > this.pokeDelay) {
                console.log("Poking spear");
                this.spearPokeTimer = 0;
                this.character.damage(this.spearDamage);
                const impulseVec = {
                    x: Math.cos(angleToTarget) * 800 * this.spearDamage,
                    y: Math.sin(angleToTarget) * 800 * this.spearDamage
                }
                this.character.skiPhysics.impulse(impulseVec);
                this.skiPhysics.impulse({x: -impulseVec.x, y: -impulseVec.y});
            }
        } else {
            this.spearPokeTimer = 0;
        }

       
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
            this.targetAngle = angleToTarget;

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
        let spearDownAmount = Math.max(
            Math.min(Math.abs(this.skiPhysics.velocity.y) / 400, 1),
            Math.min(Math.max((150 - distanceToTarget) / (150 - this.pokeDistance), 0), 1)
        );

        // periodic crouch
        let randomCrouchAmount = Math.max((Math.sin(this.timeSinceDamagedCharacter * 3) - 0.5), 0) * 1.6;
        let crouchAmount = Math.max(spearDownAmount, randomCrouchAmount);
        let torsoTurn = angleToTarget - this.skiPhysics.skiAngle;
        while (torsoTurn > Math.PI) {
            torsoTurn -= Math.PI * 2;
        }
        while (torsoTurn < -Math.PI) {
            torsoTurn += Math.PI * 2;
        }

        let poking = this.spearPokeTimer > this.pokeDelay - this.pokeAnimationStart;

        this.model.update(dt, this.skiPhysics.skiAngle, crouchAmount, spearDownAmount, torsoTurn, poking);
    }

    drawShadow(ctx) {
        this.skiPhysics.drawShadow(ctx);
    }

    drawTrail(ctx) {
        this.skiPhysics.drawTrail(ctx);
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y -this.skiPhysics.z * 70);

        this.model.draw(ctx);
        ctx.restore();
        super.draw(ctx);
    }
}

class Snowmobile extends Mob {
    constructor(x, y, vx, vy, character, terrain, snowParticles, deathEffect, camera) {
        super(x, y, vx, vy, 10, 8, 15, 'green', character, deathEffect);
        this.type = "snowmobile";
        this.maxHealth = 10;
        this.health = 10;
        this.camera = camera;
        this.colors = ["#222222", "#1C5D99", "#E54B4B", "#83BCA9"]

        this.terrain = terrain;
        this.snowParticles = snowParticles;
        this.damageCooldown = 0.25;
        this.treeCollisionCooldown = 1.5;
        this.timeSinceTreeCollision = 0;

        this.snowmobileInteractionDistanceSquared = 30*30;

        this.tracks = new SnowmobileTracks(camera);
        

        this.angle = 0; // Down the mountain
        this.steeringAngle = 0; //straight ahead
        this.steeringAngleFilter = new LowPassFilter(0, 0.1);
        
        this.maxSteeringAngle = Math.PI / 4;
        this.maxDriveVel = 150 + randomCentered(10);
        this.driveVel = this.maxDriveVel;
        this.gameTime = 0;
        this.model = new SnowmobileModel();
        
    }


    onCollideWithTerrain(terrainCollisions) {
        for (let entity of terrainCollisions) {
            if (entity.type == "tree") {

                if (this.timeSinceTreeCollision > this.treeCollisionCooldown) {
                    this.health -= 1;
                    this.driveVel = -50;
                    this.timeSinceTreeCollision = 0;
                }
            }
        }
    }

    onCollideWithCharacter(character) {

        character.collideWithMob(this);        
        if (this.timeSinceDamagedCharacter < this.damageCooldown) return;
        this.timeSinceDamagedCharacter = 0;
        const angleToTarget = Math.atan2(this.character.y - this.y, this.character.x - this.x) + Math.PI / 2;
        const deltaAngle = -normalizeAngle(angleToTarget - this.angle + Math.PI);
        if (Math.abs(deltaAngle) > Math.PI / 4) {
            return;
        }

        character.damage(10);
        character.skiPhysics.impulse({
            y: -Math.cos(angleToTarget) * 40000,
            x: Math.sin(angleToTarget) * 40000
        });
        character.skiPhysics.jump(6);
    }

    update(dt) {
        this.gameTime += dt;
        this.timeSinceDamagedCharacter += dt;
        this.timeSinceTreeCollision += dt;

        if (!this.shouldBackOff) {
            this.cheatBackCloseToCharacter();
            const angleToTarget = Math.atan2(this.character.y - this.y, this.character.x - this.x) + Math.PI / 2;
            const deltaAngle = -normalizeAngle(angleToTarget - this.angle + Math.PI);
            this.steeringAngle = Math.max(Math.min(deltaAngle, this.maxSteeringAngle), -this.maxSteeringAngle);
        } else {
            this.steeringAngle = 0;
        }

        for (let mob of this.manager.getSnowmobiles()) {
            if (mob != this) {
                const dx = this.x - mob.x;
                const dy = this.y - mob.y;
                const distanceSquared = dx * dx + dy * dy;
                if (distanceSquared < this.snowmobileInteractionDistanceSquared) {
                    // Get angle to other snowmobile relative to this snowmobile's heading
                    const angleToOther = Math.atan2(dy, dx) - this.angle;
                    // Normalize angle to -PI to PI range
                    const normalizedAngle = normalizeAngle(angleToOther);
                    // If angle is positive, other snowmobile is on the left
                    const isOnLeft = normalizedAngle > 0;
                    // Steer away from other snowmobile
                    this.steeringAngle = isOnLeft ? -this.maxSteeringAngle : this.maxSteeringAngle;
                }
            }
        }

        this.steeringAngle = this.steeringAngleFilter.runFilter(dt, this.steeringAngle);

        if (this.driveVel < this.maxDriveVel) {
            this.driveVel += 150 * dt;
        }
        if (this.driveVel > this.maxDriveVel) {
            this.driveVel = this.maxDriveVel;
        }
        const rotVel = - this.steeringAngle * 2.0 / 50 * this.driveVel;

        this.angle += rotVel * dt;
        this.velocity = {
            y: Math.cos(this.angle) * this.driveVel,
            x: -Math.sin(this.angle) * this.driveVel,
        }
        this.x += this.velocity.x * dt;
        this.y += this.velocity.y * dt;

        if (this.camera.isOnScreen(this.x, this.y)) {
            this.model.update(dt, this.angle, this.steeringAngle, 1);
        }

        this.tracks.update(dt, {x: this.x, y: this.y}, this.driveVel, this.velocity);

        super.update(dt);
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(0.4, 0.4);
        this.model.draw(ctx);
        ctx.restore();
        super.draw(ctx);
    }

    drawTrail(ctx) {
        this.tracks.draw(ctx);
    }

    
}

class Goblin extends Mob {
    constructor(x, y, vx, vy, character, terrain, snowParticles, deathEffect, camera) {
        super(x, y, vx, vy, 3, 8, 15, 'green', character, deathEffect);
        this.type = "goblin";
        this.maxHealth = 3;
        this.health = 3;
        this.camera = camera;
        this.colors = ["#D7FFAB", "#9FC2CC", "#9FC2CC", "#1B5299"]

        this.terrain = terrain;
        this.snowParticles = snowParticles;
        this.skiPhysics = new SkiPhysics(x, y, vx, vy, snowParticles, 25, terrain, this.mass, camera);
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
        this.skiPhysics.calculateParams();

        this.skiSplay = 0.2;

        this.gameTime = 0;
        this.model = new GoblinModel();
        this.leftArmAngle = 0;
        this.rightArmAngle = 0;
        this.leftArmSpeed = 0.1;
        this.rightArmSpeed = 0.1;
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

        this.leftArmSpeed += randomCentered(100) * dt;
        this.rightArmSpeed += randomCentered(100) * dt;

        this.leftArmSpeed *= 0.999;
        this.rightArmSpeed *= 0.999;

        this.leftArmAngle += this.leftArmSpeed * dt;
        this.rightArmAngle += this.rightArmSpeed * dt;

        if (this.camera.isOnScreen(this.x, this.y)) {
            this.model.update(dt, 
                this.skiPhysics.skiAngle,
                0.2,
                this.leftArmAngle,
                this.rightArmAngle
            );
        }


    }


    onCollideWithCharacter(character) {
        character.collideWithMob(this);
    }

    drawTrail(ctx) {
        this.skiPhysics.drawTrail(ctx);
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        this.model.draw(ctx);
        ctx.restore();
        super.draw(ctx);
    }
}

export default MobManager;