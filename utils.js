export function randomCentered(size) {
    return Math.random() * size * 2 - size;
}

export class Clickable {
    constructor(xmin, xmax, ymin, ymax, canvas) {
        this.x = (xmin + xmax) / 2;
        this.y = (ymin + ymax) / 2;
        this.width = xmax - xmin;
        this.height = ymax - ymin;
        this.canvas = canvas;
        this.onTap = null;
        this.onDragStart = null;
        this.onDragMove = null;
        this.onDragEnd = null;
        this.transform = null;
        this.isActive = false;
        this.touchStartTimestamp = 0;

        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), false);
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), false);
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), false);
        this.canvas.addEventListener('touchcancel', this.handleTouchEnd.bind(this), false);
    }

    setCtxTransform(ctx) {
        this.transform = ctx.getTransform();
    }

    isPointInside(x, y) {
        if (this.transform) {
            const inverted = this.transform.invertSelf();
            const point = new DOMPoint(x, y).matrixTransform(inverted);
            x = point.x;
            y = point.y;
        }
        return (
            x >= this.x - this.width / 2 &&
            x <= this.x + this.width / 2 &&
            y >= this.y - this.height / 2 &&
            y <= this.y + this.height / 2
        );
    }

    handleTouchStart(event) {
        console.log("touch start");
        event.preventDefault();
        if (event.touches.length > 0) {
            let touch = event.touches[0];
            let x = touch.clientX - this.canvas.getBoundingClientRect().left;
            let y = touch.clientY - this.canvas.getBoundingClientRect().top;
            
            if (this.isPointInside(x, y)) {
                this.isActive = true;
                this.touchStartTimestamp = event.timeStamp;
                if (this.onDragStart) this.onDragStart(x, y);
            }
        }
    }

    handleTouchMove(event) {
        if (this.isActive && event.touches.length > 0) {
            let touch = event.touches[0];
            let x = touch.clientX - this.canvas.getBoundingClientRect().left;
            let y = touch.clientY - this.canvas.getBoundingClientRect().top;
            if (this.onDragMove) this.onDragMove(x, y);
        }
    }

    handleTouchEnd(event) {
        if (this.isActive) {
            this.isActive = false;
            if (event.timeStamp - this.touchStartTimestamp < 200) {
                if (this.onTap) this.onTap();
            } else if (this.onDragEnd) {
                let x, y;
                if (event.changedTouches.length > 0) {
                    let touch = event.changedTouches[0];
                    x = touch.clientX - this.canvas.getBoundingClientRect().left;
                    y = touch.clientY - this.canvas.getBoundingClientRect().top;
                }
                this.onDragEnd(x, y);
            }
        }
    }
}

export function rotateInImageFrame(ctx, pivot, amount) {
    ctx.translate(pivot.x, pivot.y);
    ctx.rotate(amount);
    ctx.translate(-pivot.x, -pivot.y);
  }

export default randomCentered;
