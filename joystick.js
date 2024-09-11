class VirtualJoystick {
    constructor(canvas) {
        this.canvas = canvas;
        this.isActive = false;
        this.startPos = { x: 0, y: 0 };
        this.currVals = { x: 0, y: 0 };
        this.maxRadius = 50;
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), false);
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), false);
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), false);
        this.canvas.addEventListener('touchcancel', this.handleTouchEnd.bind(this), false);
    }

    draw(ctx) {
        if (this.isActive) {
            ctx.beginPath();
            ctx.arc(this.startPos.x, this.startPos.y, this.maxRadius, 0, 2 * Math.PI, false);
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'red';
            ctx.stroke();

            // Draw a line from the center of the joystick to the current touch position
            ctx.beginPath();
            ctx.moveTo(this.startPos.x, this.startPos.y);
            ctx.lineTo(this.startPos.x + this.currVals.x, this.startPos.y + this.currVals.y);
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'red';
            ctx.stroke();
        }
    }

    handleTouchStart(event) {
        event.preventDefault();
        if (event.touches.length > 0) {
            let touch = event.touches[0];
            this.startPos.x = touch.clientX - this.currVals.x;
            this.startPos.y = touch.clientY - this.currVals.y;
            this.isActive = true;
        }
    }

    handleTouchMove(event) {
        if (!this.isActive) return;

        if (event.touches.length > 0) {
            let touch = event.touches[0];
            let dx = touch.clientX - this.startPos.x;
            let dy = touch.clientY - this.startPos.y;

            let distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > this.maxRadius) {
                let factor = this.maxRadius / distance;
                dx *= factor;
                dy *= factor;
            }

            this.currVals.x = dx;
            this.currVals.y = dy;
        }
    }

    handleTouchEnd(event) {
        this.isActive = false;
    }
};

export default VirtualJoystick;