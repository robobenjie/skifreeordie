
let lastColor = "";

export function setFillColor(ctx, color) {
    if (color !== lastColor) {
        lastColor = color;
        ctx.fillStyle = color;
    }
}

export function roundedParallelogram(ctx, x, y, width, height, skew, cornerRadius) {
    // Start path
    ctx.beginPath();
    ctx.moveTo(x + cornerRadius + skew, y);
    ctx.lineTo(x + width - cornerRadius + skew, y);
    ctx.arcTo(x + width + skew, y, x + width + skew, y + cornerRadius, cornerRadius);
    ctx.lineTo(x + width, y + height - cornerRadius);
    ctx.arcTo(x + width, y + height, x + width - cornerRadius, y + height, cornerRadius);
    ctx.lineTo(x + cornerRadius, y + height);
    ctx.arcTo(x, y + height, x, y + height - cornerRadius, cornerRadius);
    ctx.lineTo(x + skew, y + cornerRadius);
    ctx.arcTo(x + skew, y, x + cornerRadius + skew, y, cornerRadius);
}

export function randomCentered(size) {
    return Math.random() * size * 2 - size;
}

export function calculateFlyInOut(start, dwell, out, flyinTime, dwellTime, flyoutTime, currentTime) {
    let transitionFraction = 0;
    if (currentTime < flyinTime) {
        transitionFraction = currentTime / flyinTime;
        return start + (dwell - start) * easeInOutTransition(transitionFraction);
    } else if (currentTime < flyinTime + dwellTime) {
        return dwell;
    } else {
        transitionFraction = (currentTime - flyinTime - dwellTime) / flyoutTime;
        return dwell + (out - dwell) * easeInOutTransition(transitionFraction);
    }
}

function easeInOutTransition(t) {
    return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export class Clickable {
    constructor(xmin, xmax, ymin, ymax, canvas) {
        this.x = (xmin + xmax) / 2;
        this.y = (ymin + ymax) / 2;
        this.width = xmax - xmin;
        this.height = ymax - ymin;
        this.canvas = canvas;
        this.transform = null;
        this.isActive = false;
        this.touchStartTimestamp = 0;

        this.listeners = {
            tap: [],
            dragStart: [],
            dragMove: [],
            dragEnd: []
        };

        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), false);
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), false);
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), false);
        this.canvas.addEventListener('touchcancel', this.handleTouchEnd.bind(this), false);
    }

    addTapListener(callback) {
        this.listeners.tap.push(callback);
    }

    addDragStartListener(callback) {
        this.listeners.dragStart.push(callback);
    }

    addDragMoveListener(callback) {
        this.listeners.dragMove.push(callback);
    }

    addDragEndListener(callback) {
        this.listeners.dragEnd.push(callback);
    }

    setCtxTransform(ctx) {
        const newTransform = ctx.getTransform();
        if (JSON.stringify(newTransform) !== JSON.stringify(this.transform)) {
            //console.log('Transform updated:', newTransform);
            this.transform = newTransform;
        }
    }

    isPointInside(x, y) {
        return (
            x >= this.x - this.width / 2 &&
            x <= this.x + this.width / 2 &&
            y >= this.y - this.height / 2 &&
            y <= this.y + this.height / 2
        );
    }

    transformPoint(x, y) {
        return this._applyTransform(x, y, false);
    }

    untransformPoint(x, y) {
        return this._applyTransform(x, y, true);
    }

    _applyTransform(x, y, inverse) {
        if (this.transform) {
            try {
                const transform = new DOMMatrix(this.transform);
                const matrix = inverse ? transform : transform.inverse();
                const point = new DOMPoint(x, y).matrixTransform(matrix);
                
                if (isNaN(point.x) || isNaN(point.y) || !isFinite(point.x) || !isFinite(point.y)) {
                    console.warn('Invalid transformation result:', point);
                    return { x, y };
                }
                
                return { x: point.x, y: point.y };
            } catch (error) {
                console.error(`Error in ${inverse ? 'untransformPoint' : 'transformPoint'}:`, error);
                return { x, y };
            }
        }
        return { x, y };
    }

    getXY(touch) {

        let rect = touch.target.getBoundingClientRect();
        let canvasX = touch.clientX - rect.left;
        let canvasY = touch.clientY - rect.top;
        let target = touch.target;
        const x = Math.round((canvasX * target.width) / rect.width);
        const y = Math.round((canvasY * target.height) / rect.height);
        let ans = this.transformPoint(x, y);
        return ans;
    }

    handleTouchStart(event) {
        event.preventDefault();
        if (event.touches.length > 0) {
            let { x, y } = this.getXY(event.touches[0]);
            
            if (this.isPointInside(x, y)) {
                this.isActive = true;
                this.touchStartTimestamp = event.timeStamp;
                this.listeners.dragStart.forEach(listener => listener(x, y));
            }
        }
    }

    handleTouchMove(event) {
        if (this.isActive && event.touches.length > 0) {         
            let { x, y } = this.getXY(event.touches[0]);
            
            this.listeners.dragMove.forEach(listener => listener(x, y));
        }
    }

    handleTouchEnd(event) {
        if (this.isActive) {
            this.isActive = false;
            if (event.timeStamp - this.touchStartTimestamp < 200) {
                this.listeners.tap.forEach(listener => listener());
            } else {
                let x, y;
                if (event.changedTouches.length > 0) {
                    ({ x, y } = this.getXY(event.changedTouches[0]));
                }
                this.listeners.dragEnd.forEach(listener => listener(x, y));
            }
        }
    }
}



export default randomCentered;
