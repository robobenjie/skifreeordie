class Character {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 10;
        this.height = 25;
        this.color = "red";
        this.velocity = { x: 0, y: 0 };
        this.skiAngle = 0;
    }

    update(dt, joystick) {
        if (joystick.isActive) {
            this.skiAngle = Math.atan2(joystick.currVals.y, joystick.currVals.x) + Math.PI / 2;
        }
        this.skiAngle = Math.min(Math.max(Math.PI / 2, this.skiAngle), Math.PI * 1.5);
   

        this.x += this.velocity.x;
        this.y += this.velocity.y;
    }

    draw(ctx) {

        // Draw the ski
        ctx.save();
        ctx.translate(this.x + this.width *     0.2, this.y + this.height);
        ctx.rotate(this.skiAngle);
        ctx.fillStyle = "blue";
        ctx.fillRect(0, -15, 1, 30);
        ctx.restore();
        ctx.save();
        ctx.translate(this.x + this.width * 0.8, this.y + this.height);
        ctx.rotate(this.skiAngle);
        ctx.fillStyle = "blue";
        ctx.fillRect(0, -15, 1, 30);
        ctx.restore();

        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

    }
}
export default Character;