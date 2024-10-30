import { setFillColor } from "./utils.js";

export class Projectile {
    constructor(x, y, damage, velocity, camera) {
        this.x = x;
        this.y = y;
        this.z = 15;
        this.damage = damage;
        this.velocity = velocity;
        this.camera = camera;
        this.gravity = 50;
        this.shadowSize = 5;
        // if velocity.z is not set, set it to 0
        this.velocity.z = this.velocity.z || 0;

        this.active = true;
    }

    update(dt) {
        this.velocity.z -= this.gravity * dt;
        this.x += this.velocity.x * dt;
        this.y += this.velocity.y * dt;
        this.z += this.velocity.z * dt;

        if (this.z < 0) {
            this.active = false;
        }
    }

    onCollision(entity) {
        if (!entity.skiPhysics.isJumping()) {
            entity.damage(this.damage);
            entity.skiPhysics.bumpX(this.velocity, this.damage * 5);
            this.active = false;
        }
    }

    collides(entity) {
        if (this.x > entity.x - entity.width / 2 &&
            this.x < entity.x + entity.width / 2 &&
            this.y > entity.y - entity.height / 2 &&
            this.y < entity.y + entity.height / 2) {
            return true;
        }
        return false;
    }

    drawShadow(ctx) {

        const shadowColor = "#E0E0E4";
        ctx.beginPath();
        setFillColor(ctx, shadowColor);
        ctx.ellipse(this.x, this.y + 2, this.shadowSize, this.shadowSize / 2, 0, 0, 2 * Math.PI);
        ctx.fill();
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y - this.z, 3, 0, Math.PI * 2);
        setFillColor(ctx, 'rgba(50,50, 50)');
        ctx.fill();
        ctx.closePath();
    }
}

export default Projectile;
