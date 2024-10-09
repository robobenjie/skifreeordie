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
export class Sword extends Weapon {
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
                mob.damage(this.damage);
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
                mob.damage(this.damage);
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

export default Weapon