import randomCentered from "./utils.js";

export const WeaponType = {
    HAND: "hand",
    TWO_HAND: "two_hand",
}

export class Weapon {
    constructor(type, character, mobManager) {
        this.character = character;
        this.mobManager = mobManager;
        this.type = type;
    }

    damageMob(mob, damage) {
        let killed = mob.damage(damage);
        if (killed) {
            this.character.scoreKill(mob);
        }
    }

    update(dt) {
    }

    draw(ctx) {
    }
}

const SwordState = {
    HELD: "held",
    SWING_LEFT: "swing_left",
    SWING_RIGHT: "swing_right"
}

export class Gun extends Weapon {
    constructor(character, mobManager) {
        super(WeaponType.HAND, character, mobManager);
        this.coolDown = 0.01;
        this.damage = 0.5;
        this.knockback = 10000;
        this.firingArc = 45;
        this.firingDistance = 300;
        this.hitPercentage = 0.3;

        this.lastAttackTime = 0;
        this.target = null;
    }

    update(dt) {
        super.update(dt);
        this.target = null;
        if (this.character.skiPhysics.isJumping()){
            return;
        }
        if (performance.now() - this.lastAttackTime < this.coolDown * 1000) {
            return;
        }

        let targets = this.mobManager.mobsInArc(
            this.character.skiPhysics.skiUnitVector.x,
            this.character.skiPhysics.skiUnitVector.y,
             this.firingArc, 
            this.firingDistance);
        if (targets.length > 0) {
            console.log("bang!");
            let target = targets[0];
            this.target = target;
            let unit_vec_x = target.x - this.character.x;
            let unit_vec_y = target.y - this.character.y;
            let distance = Math.sqrt(unit_vec_x * unit_vec_x + unit_vec_y * unit_vec_y);
            unit_vec_x /= distance;
            unit_vec_y /= distance;
            if (this.hitPercentage > Math.random()) {
                this.damageMob(target, this.damage);
                target.applyImpulse(unit_vec_x * this.knockback, unit_vec_y * this.knockback);
            } else {
                unit_vec_x += randomCentered(0.1);
                unit_vec_y += randomCentered(0.1);
                this.target = {x: this.character.x + unit_vec_x * this.firingDistance * 2, y: this.character.y + unit_vec_y * this.firingDistance * 2};
            }
            
            this.lastAttackTime = performance.now();
        }
        
    }

    draw(ctx) {
        super.draw(ctx);
        if (this.target) {
        // Draw a light blue line from character to target
        ctx.beginPath();
        ctx.moveTo(this.character.x, this.character.y);
        ctx.lineTo(this.target.x, this.target.y);
        ctx.strokeStyle = 'darkblue';
        ctx.lineWidth = 3;
        ctx.stroke();
        }
    }
}

export class miniGun extends Gun {
    constructor(character, mobManager) {
        super(character, mobManager);
        this.coolDown = 0.01;
        this.damage = 0.5;
        this.knockback = 10000;
        this.firingArc = 45;
        this.firingDistance = 300;
        this.hitPercentage = 0.3;
    }
}

export class Pistol extends Gun {
    constructor(character, mobManager) {
        super(character, mobManager);
        this.coolDown = 1.2;
        this.damage = 6;
        this.knockback = 60000;
        this.firingArc = 45;
        this.firingDistance = 300;
        this.hitPercentage = 1.0;
    }
}

export class RocketLauncher extends Gun {
    constructor(character, mobManager) {
        super(character, mobManager);
        this.coolDown = 1.2;
        this.damage = 6;
        this.knockback = 60000;
        this.firingArc = 45;
        this.firingDistance = 300;
        this.hitPercentage = 1.0;
    }
}
export class LaserGun extends Gun {
    constructor(character, mobManager) {
        super(character, mobManager);
        this.coolDown = 0.0;
        this.damage = 0.1;
        this.knockback = 0;
        this.firingArc = 90;
        this.firingDistance = 300;
        this.hitPercentage = 1.0;
    }
}
export class MeleeWeapon extends Weapon {
    constructor(character, mobManager) {
        super(WeaponType.HAND, character, mobManager);
        this.state = SwordState.HELD;
        this.coolDown = 0.3;
        this.hitAreaHeight = 5;
        this.hitAreaWidth = 45;
        this.damage = 3.5;
        this.knockback = 50000;

        this.lastAttackTime = 0;
    }
    
    update(dt) {
        super.update(dt);
        
        // Early return if last attack more recent than the cooldown
        if (performance.now() - this.lastAttackTime < this.coolDown * 1000) {
            return;
        }
        if (this.character.skiPhysics.isJumping()){
            return;
        }
        let mobsOnLeft = this.mobManager.mobsInRegion(
            this.character.x, this.character.y, -this.hitAreaWidth, 0, -this.hitAreaHeight, this.hitAreaHeight);
        if (mobsOnLeft.length > 0) {
            this.lastAttackTime = performance.now();
            this.state = SwordState.SWING_LEFT;
            for (let mob of mobsOnLeft) {
                mob.applyImpulse(-this.knockback, 0);
                this.damageMob(mob, this.damage);
            }
            return;
        }

        let mobsOnRight = this.mobManager.mobsInRegion(
            this.character.x, this.character.y, 0, this.hitAreaWidth, -this.hitAreaHeight, this.hitAreaHeight);
        if (mobsOnRight.length > 0) {
            this.lastAttackTime = performance.now();
            this.state = SwordState.SWING_RIGHT;
            for (let mob of mobsOnRight) {
                mob.applyImpulse(this.knockback, 0)
                this.damageMob(mob, this.damage);
            }
            return;
        }
        this.state = SwordState.HELD;

    }

    draw(ctx) {
        super.draw(ctx);
        if (this.state === SwordState.SWING_LEFT) {
            ctx.fillStyle = "orange";
            ctx.fillRect(this.character.x - this.hitAreaWidth, this.character.y - this.hitAreaHeight, this.hitAreaWidth, this.hitAreaHeight * 2);
        } else if (this.state === SwordState.SWING_RIGHT) {
            ctx.fillStyle = "orange";
            ctx.fillRect(this.character.x, this.character.y - this.hitAreaHeight, this.hitAreaWidth, this.hitAreaHeight * 2);
        }
    }
}

export class Sword extends MeleeWeapon {
    constructor(character, mobManager) {
        super(character, mobManager);
        this.stringName = "sword";
    }
}

export default Weapon