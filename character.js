function sumForces(...forces) {
    let result = { x: 0, y: 0 };
    for (let force of forces) {
        result.x += force.x;
        result.y += force.y;
    }
    return result;
}
class Character {
    constructor(x, y, particleEngine) {
        this.x = x;
        this.y = y;
        this.particleEngine = particleEngine;
        this.width = 10;
        this.height = 25;
        this.color = "red";
        this.skiLength = 30;

        this.accelleration = 400;
        this.drag = 0.5;
        this.edgeDrag = 1.5;
        this.steering = 0.95;
        this.maxUphillAngle = 25 * Math.PI / 180;
        this.maxTurnRate = 3.5;
        this.sprayFactor = 1;

        // set up state vars
        this.skiAngle = Math.PI / 2;
        this.velocity = { x: 0, y: 0 };
        this.skiUnitVector = { x: 1, y: 0 };
        this.edgeForce = { x: 0, y: 0 };
        this.leftFrontTrail = [];
        this.rightFrontTrail = [];
        this.leftRearTrail = [];
        this.rightRearTrail = [];

    }

    update(dt, joystick, ctx) {
        let prevSkiAngle = this.skiAngle;
        if (joystick.isActive) {
            this.skiAngle = Math.atan2(joystick.currVals.y, joystick.currVals.x) + Math.PI / 2;
        }

        this.skiAngle = Math.min(
            Math.max(Math.PI / 2 - this.maxUphillAngle, (this.skiAngle + 2 * Math.PI) % (2 * Math.PI)),
            Math.PI * 1.5 + this.maxUphillAngle
        );

        let angleChangeRate = Math.abs(this.skiAngle - prevSkiAngle) / dt;
        if (angleChangeRate > this.maxTurnRate) {
            this.skiAngle = prevSkiAngle + Math.sign(this.skiAngle - prevSkiAngle) * this.maxTurnRate * dt;
        }

        // Apply the self.steering constant to determine how much momentum is retained
        let steeringEffect = Math.max(0, 1 - angleChangeRate * (1- this.steering));

        // Steer velocity towards the new ski angle
        const prevVForward = this.velocity.x * this.skiUnitVector.x + this.velocity.y * this.skiUnitVector.y;
        const prevVSide = this.velocity.x * -this.skiUnitVector.y + this.velocity.y * this.skiUnitVector.x;

        this.skiUnitVector = { x: Math.cos(this.skiAngle + Math.PI / 2), y: Math.sin(this.skiAngle + Math.PI / 2) };
     
        this.velocity.x = steeringEffect * (prevVForward * this.skiUnitVector.x + prevVSide * -this.skiUnitVector.y) + (1 - steeringEffect) * this.velocity.x;
        this.velocity.y = steeringEffect * (prevVForward * this.skiUnitVector.y + prevVSide * this.skiUnitVector.x) + (1 - steeringEffect) * this.velocity.y;
        
        const gravity = { x: 0, y: this.accelleration };
        const gravity_dot_ski = gravity.y * this.skiUnitVector.y;

        // Now scale the ski direction vector by the dot product to get the effective force in the ski direction
        const gravityForceInSkiDirection = {
            x: this.skiUnitVector.x * gravity_dot_ski,
            y: this.skiUnitVector.y * gravity_dot_ski
        };
        const dragForce = {
            x: -this.velocity.x * this.drag,
            y: -this.velocity.y * this.drag
        };


        const leftSkiCenter = this.leftSkiCenter();
        const rightSkiCenter = this.rightSkiCenter();
        const newFrontLeft = { x: leftSkiCenter.x + this.skiLength/2 * this.skiUnitVector.x, y: leftSkiCenter.y + this.skiLength/2 * this.skiUnitVector.y };
        if (this.leftFrontTrail.length == 0 || newFrontLeft.y - this.leftFrontTrail[this.leftFrontTrail.length - 1].y > 3) {
            this.leftFrontTrail.push(newFrontLeft);
            this.rightFrontTrail.push({ x: rightSkiCenter.x + this.skiLength/2 * this.skiUnitVector.x, y: rightSkiCenter.y + this.skiLength/2 * this.skiUnitVector.y });
            this.leftRearTrail.push({ x: leftSkiCenter.x - this.skiLength/2 * this.skiUnitVector.x, y: leftSkiCenter.y - this.skiLength/2 * this.skiUnitVector.y });
            this.rightRearTrail.push({ x: rightSkiCenter.x - this.skiLength/2 * this.skiUnitVector.x, y: rightSkiCenter.y - this.skiLength/2 * this.skiUnitVector.y });

            // limit to 100 points
            if (this.leftFrontTrail.length > 100) {
                this.leftFrontTrail.shift();
                this.rightFrontTrail.shift();
                this.leftRearTrail.shift();
                this.rightRearTrail.shift();
            }
        }
   

        const perpendicularVector = { x: -this.skiUnitVector.y, y: this.skiUnitVector.x };
        const velDotPerpendicular = this.velocity.x * perpendicularVector.x + this.velocity.y * perpendicularVector.y;
        this.edgeForce = {
            x: -perpendicularVector.x * velDotPerpendicular * this.edgeDrag,
            y: -perpendicularVector.y * velDotPerpendicular * this.edgeDrag
        };
        var num_paricles = Math.floor(Math.abs(this.edgeDrag * velDotPerpendicular * this.sprayFactor) * dt);
        for (let i = 0; i < num_paricles; i++) {
            var emitAngle = this.skiAngle - Math.PI / 2 + (velDotPerpendicular > 0 ? -Math.PI / 2 : + Math.PI / 2) + Math.random() * Math.PI / 2 - Math.PI / 4;
            var edgeForceMagnitude = (
                Math.sqrt(this.edgeForce.x * this.edgeForce.x + this.edgeForce.y * this.edgeForce.y))
                * (Math.random() * 0.5 + 0.5);
            const skiAlpha = Math.random() - 0.5;

            this.particleEngine.emit(
                this.x + this.width / 2 + this.skiUnitVector.x * this.skiLength * skiAlpha,
                this.y + this.height + this.skiUnitVector.y * this.skiLength * skiAlpha,

                { 
                    x: Math.cos(emitAngle) * edgeForceMagnitude,
                    y: Math.sin(emitAngle) * edgeForceMagnitude + this.velocity.y
                },
                0.25);
        }


        this.particleEngine

        let force = sumForces(gravityForceInSkiDirection, dragForce, this.edgeForce);


        // Update skier's velocity or position based on the projected gravity force
        this.velocity.x += force.x * dt;
        this.velocity.y += force.y * dt;

        // Now you can update the skier's position or handle other logic
        this.x += this.velocity.x * dt;
        this.y += this.velocity.y * dt;
        /*
        // loop to top of screen
        if (this.y > ctx.canvas.height) {
            this.y = 0;
        }
        if (this.x > ctx.canvas.width) {
            this.x = 0;
        }
        if (this.x < 0) {
            this.x = ctx.canvas.width;
        }
        */

    }

    leftSkiCenter() {
        return { x: this.x + this.width * 0.2, y: this.y + this.height };
    }

    rightSkiCenter() {
        return { x: this.x + this.width * 0.8, y: this.y + this.height };
    }

    draw(ctx) {

        // Draw the left trail:
        ctx.beginPath();
        ctx.moveTo(this.leftFrontTrail[0].x, this.leftFrontTrail[0].y);
        for (let i = 1; i < this.leftFrontTrail.length; i++) {
            ctx.lineTo(this.leftFrontTrail[i].x + 1, this.leftFrontTrail[i].y);
        }
        // backwards on leftBackTrail
        for (let i = this.leftRearTrail.length - 1; i >= 0; i--) {
            ctx.lineTo(this.leftRearTrail[i].x - 1, this.leftRearTrail[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = "#F0F0F4";
        ctx.fill();

        // Draw the right trail:
        ctx.beginPath();
        ctx.moveTo(this.rightFrontTrail[0].x, this.rightFrontTrail[0].y);
        for (let i = 1; i < this.rightFrontTrail.length; i++) {
            ctx.lineTo(this.rightFrontTrail[i].x + 1, this.rightFrontTrail[i].y);
        }
        // backwards on rightBackTrail
        for (let i = this.rightRearTrail.length - 2; i >= 0; i--) {
            ctx.lineTo(this.rightRearTrail[i].x -1, this.rightRearTrail[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = "#F0F0F4";
        ctx.fill();

        // Draw the ski
        ctx.save();
        const leftSkiCenter = this.leftSkiCenter();
        const rightSkiCenter = this.rightSkiCenter();
        ctx.translate(leftSkiCenter.x, leftSkiCenter.y);
        ctx.rotate(this.skiAngle);
        ctx.fillStyle = "blue";
        ctx.fillRect(0, -this.skiLength / 2, 1, this.skiLength);
        ctx.restore();
        ctx.save();
        ctx.translate(rightSkiCenter.x, rightSkiCenter.y);
        ctx.rotate(this.skiAngle);
        ctx.fillStyle = "blue";
        ctx.fillRect(0, -this.skiLength/2, 1, this.skiLength);
        ctx.restore();

        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = "black";
        // draw a line from the center of the skier to the edge force
        /*ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y + this.height / 2);
        const scale = -0.3;
        ctx.lineTo(this.x + this.width / 2 + this.edgeForce.x * scale, this.y + this.height / 2 + this.edgeForce.y * scale);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'black';
        ctx.stroke();*/

    }
}
export default Character;