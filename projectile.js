export class Projectile {
    constructor(x, y, velocity, camera) {
        this.x = x;
        this.y = y;
        this.z = 15;
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
        console.log(this.z.toFixed(4));

        if (this.z < 0) {
            this.active = false;
        }
    }

    drawShadow(ctx) {

        const shadowColor = "#E0E0E4";
        ctx.beginPath();
        ctx.fillStyle = shadowColor;
        ctx.ellipse(this.x, this.y + 2, this.shadowSize, this.shadowSize / 2, 0, 0, 2 * Math.PI);
        ctx.fill();
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y - this.z, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(50,50, 50)';
        ctx.fill();
        ctx.closePath();
    }
}

export default Projectile;
