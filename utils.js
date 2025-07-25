
let lastColor = {};
let ctxStackDepth = 0;

export function setFillColor(ctx, color) {
    ctx.fillStyle = color;
    //if (lastColor[ctxStackDepth] !== color) {
    //    lastColor[ctxStackDepth] = color;
    //    
    // }
}


export function augmentCtx(ctx) {
        // Initialize a counter
    // Override the save and restore methods
    const originalSave = ctx.save.bind(ctx);
    const originalRestore = ctx.restore.bind(ctx);

    ctx.save = function() {
        ctxStackDepth++;
        originalSave();
    };

    ctx.restore = function() {
        if (ctxStackDepth > 0) {
            ctxStackDepth--;
        } else {
            console.warn("ctx.restore() called more times than ctx.save()");
        }
        originalRestore();
    };
}

export function normalizeAngle(angle) {
    angle = angle % (2 * Math.PI);
    if (angle > Math.PI) {
        angle -= 2 * Math.PI;
    } else if (angle < -Math.PI) {
        angle += 2 * Math.PI;
    }
    return angle;
}

export class LowPassFilter {
    constructor(initialVal, timeConstant, minVal = -Infinity, maxVal = Infinity, angle = false) {
        this.value = initialVal;
        this.timeConstant = timeConstant;
        this.minVal = minVal;
        this.maxVal = maxVal;
        this.angle = angle;
    }



    runFilter(dt, newVal) {
        const alpha = dt / (this.timeConstant + dt);

        if (this.angle) {
            // Compute wrapped difference
            const diff = normalizeAngle(newVal - this.value);
            this.value += alpha * diff;
            // Wrap result back to [-π, π]
            this.value = normalizeAngle(this.value);
        } else {
            this.value += alpha * (newVal - this.value);
            this.value = Math.min(Math.max(this.value, this.minVal), this.maxVal);
        }

        return this.value;
    }
}

export function throttled(func, delay) {
    let lastCall = 0;
    return function(...args) {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            func.apply(this, args);
        }
    }
}

export const throttledLog = throttled(console.log, 100);



export function clipPath(path, xmin, xmax) {
    let clippedPath = clipAgainstBoundary(path, xmin, 'xmin');
    clippedPath = clipAgainstBoundary(clippedPath, xmax, 'xmax');
    return clippedPath;
}

function clipAgainstBoundary(path, xbound, boundType) {
    if (path.length == 0) {
        return [];
    }
    const outputList = [];
    const len = path.length;
    let S = path[len - 1]; // Start with the last point for closed path
    let insideS = isInside(S.x, xbound, boundType);

    for (let i = 0; i < len; i++) {
        const E = path[i];
        const insideE = isInside(E.x, xbound, boundType);

        if (insideE) {
            if (insideS) {
                // Case 1: Both S and E are inside; output E
                outputList.push(E);
            } else {
                // Case 2: S is outside, E is inside; output intersection and E
                const intersection = getIntersection(S, E, xbound);
                if (intersection) outputList.push(intersection);
                outputList.push(E);
            }
        } else {
            if (insideS) {
                // Case 3: S is inside, E is outside; output intersection
                const intersection = getIntersection(S, E, xbound);
                if (intersection) outputList.push(intersection);
            }
            // Case 4: Both S and E are outside; do nothing
        }

        S = E;
        insideS = insideE;
    }

    return outputList;
}

function isInside(x, xbound, boundType) {
    if (boundType === 'xmin') {
        return x >= xbound;
    } else { // 'xmax'
        return x <= xbound;
    }
}

function getIntersection(S, E, xbound) {
    const x1 = S.x, y1 = S.y;
    const x2 = E.x, y2 = E.y;

    if (x1 === x2) {
        // Line is vertical; no intersection with vertical boundary unless on the boundary
        return null;
    }

    const t = (xbound - x1) / (x2 - x1);
    if (t < 0 || t > 1) {
        // Intersection not within the segment
        return null;
    }

    const y = y1 + t * (y2 - y1);
    return { x: xbound, y: y };
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
