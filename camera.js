

export class Camera {
    constructor(canvas, character) {
        this.canvas = canvas;
        this.character = character;
        this.CameraDamping = 15;
        this.cameraStiffness = 150;
        this.velocity = { x: 0, y: 0 };
        this.x = 0;
        this.y = 0;
        this.scale = 1;
        this.targetScale = 1;
    }

    update(dt) {
        let cameraForce = {
            x: (this.character.x + 0.15 * this.character.velocity.x - this.x) * this.cameraStiffness - this.velocity.x * this.CameraDamping,
            y: (this.character.y - this.y) * this.cameraStiffness - this.velocity.y * this.CameraDamping
        };
        this.velocity.x += cameraForce.x * dt;
        this.velocity.y += cameraForce.y * dt;
        
        this.x += this.velocity.x * dt;
        this.y += this.velocity.y * dt;

        this.targetScale = 0.8 + 0.5 * Math.abs(this.character.velocity.y) / 500;
        this.scale += (this.targetScale - this.scale) * 1.3 * dt;
    }

    applyTransform(ctx) {
        ctx.translate(this.canvas.width / 2, this.canvas.height / 3);
        ctx.scale(1/this.scale, 1/this.scale);        
        ctx.translate(-this.x, -this.y);
    }
    

}