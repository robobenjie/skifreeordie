export class Camera {
    constructor(canvas) {
        this.canvas = canvas;
        this.characterFraction = 0.33;
        this.CameraDamping = 15;
        this.cameraStiffness = 150;
        this.velocity = { x: 0, y: 0 };
        this.x = null;
        this.y = null;
        this.scale = 0.1;
        this.targetScale = 1;
        this.startOfGame = true;

        this.canvasWidth = 0;
        this.canvasHeight = 0;

    }

    setCharacter(character) {
        this.character = character;
    }

    setCanvasSize(width, height) {
        this.canvasWidth = width;
        this.canvasHeight = height;
    }

    getCanvasWidth() {
        return this.canvasWidth;
    }

    getCanvasHeight() {
        return this.canvasHeight;
    }

    update(dt) {
        let displayingScore = this.character.level && this.character.level.isComplete();
        let y_offset = displayingScore ? 200 : 0;
        if (this.x === null) {
            this.x = this.character.x;
        }
        if (this.y === null) {
            this.y = this.character.y;
        }
        
        let cameraForce = {
            x: (this.character.x + 0.15 * this.character.velocity.x - this.x) * this.cameraStiffness - this.velocity.x * this.CameraDamping,
            y: (this.character.y - this.y - y_offset) * this.cameraStiffness - this.velocity.y * this.CameraDamping
        };
        this.velocity.x += cameraForce.x * dt;
        this.velocity.y += cameraForce.y * dt;
        
        this.x += this.velocity.x * dt;
        this.y += this.velocity.y * dt;

        if (this.character.startedRun()) {
            this.targetScale = 0.8 + 0.5 * Math.abs(this.character.velocity.y) / 500;
        } else {
            if (!this.startOfGame || this.character.velocity.y > 1) {
                this.startOfGame = false;
                this.targetScale = 1.5;
                this.targetScale = 0.5;
            } else {
                this.targetScale = 0.5;

            }
        }
        this.scale += (this.targetScale - this.scale) * 1.3 * dt;
    }


    applyTransform(ctx) {
        ctx.translate(this.canvasWidth / 2, this.canvasHeight * this.characterFraction);
        ctx.scale(1 / this.scale, 1 / this.scale);        
        ctx.translate(-this.x, -this.y);
    }

    /**
     * Calculates the exposed area per second based on camera velocity and scale.
     * @returns {number} Exposed area in pixels squared per second.
     */
    getExposedAreaY() {
        const visibleWidth = this.canvasWidth * this.scale;
        return Math.abs(this.velocity.y) * visibleWidth;
    }

    getExposedAreaX() {
        const visibleHeight = this.canvasHeight * this.scale;
        return Math.abs(this.velocity.x) * visibleHeight;
    }


    /**
     * Calculates the vertical distance of a point from the screen's visible area.
     * @param {number} pointY - The Y-coordinate of the point in world coordinates.
     * @returns {number} Distance from the screen:
     *                   Negative if above the top,
     *                   Positive if below the bottom,
     *                   Zero if within the visible area.
     */
    distanceOffScreenY(pointY) {
        // Calculate the top and bottom bounds of the visible screen in world coordinates
        const topScreenY = (0 - this.canvasHeight * this.characterFraction) * this.scale + this.y;
        const bottomScreenY = (this.canvasHeight - this.canvasHeight * this.characterFraction) * this.scale + this.y;

        if (pointY < topScreenY) {
            return pointY - topScreenY; // Negative: above the top
        } else if (pointY > bottomScreenY) {
            return pointY - bottomScreenY; // Positive: below the bottom
        } else {
            return 0; // Within the visible area
        }
    }

    /**
     * Calculates the horizontal distance of a point from the screen's visible area.
     * @param {number} pointX - The X-coordinate of the point in world coordinates.
     * @returns {number} Distance from the screen:
     *                   Negative if to the left of the screen,
     *                   Positive if to the right of the screen,
     *                   Zero if within the visible area.
     */
    distanceOffScreenX(pointX) {
        // Calculate the left and right bounds of the visible screen in world coordinates
        const leftScreenX = (-this.canvasWidth / 2) * this.scale + this.x;
        const rightScreenX = (this.canvasWidth / 2) * this.scale + this.x;

        if (pointX < leftScreenX) {
            return pointX - leftScreenX; // Negative: to the left
        } else if (pointX > rightScreenX) {
            return pointX - rightScreenX; // Positive: to the right
        } else {
            return 0; // Within the visible area
        }
    }

    topOfScreen() {
        return (0 - this.canvasHeight * this.characterFraction) * this.scale + this.y;
    }

    bottomOfScreen() {
        return (this.canvasHeight - this.canvasHeight * this.characterFraction) * this.scale + this.y;
    }

    leftOfScreen() {
        return (-this.canvasWidth / 2) * this.scale + this.x;
    }

    rightOfScreen() {
        return (this.canvasWidth / 2) * this.scale + this.x;
    }

    isOnScreen(x, y, buffer = 0) {
        return x > this.leftOfScreen() - buffer && x < this.rightOfScreen() + buffer && y > this.topOfScreen() - buffer && y < this.bottomOfScreen() + buffer;
    }


    /**
     * Generates a random point 35 pixels to the left of the visible canvas.
     * @returns {{x: number, y: number}} The spawn point coordinates.
     */
    offLeftOfScreen() {
        const offset = 35 * this.scale; // Convert pixel offset to world coordinates
        const visibleWidth = this.canvasWidth * this.scale;
        const visibleHeight = this.canvasHeight * this.scale;

        const x = this.x - (visibleWidth / 2) - offset;
        const y = this.y + (Math.random() - 0.5) * visibleHeight;

        return { x, y };
    }

    /**
     * Generates a random point 35 pixels to the right of the visible canvas.
     * @returns {{x: number, y: number}} The spawn point coordinates.
     */
    offRightOfScreen() {
        const offset = 35 * this.scale; // Convert pixel offset to world coordinates
        const visibleWidth = this.canvasWidth * this.scale;
        const visibleHeight = this.canvasHeight * this.scale;

        const x = this.x + (visibleWidth / 2) + offset;
        const y = this.y + (Math.random() - 0.5) * visibleHeight;

        return { x, y };
    }

    /**
     * Generates a random point 35 pixels below the visible canvas.
     * @returns {{x: number, y: number}} The spawn point coordinates.
     */
    offBottomOfScreen() {
        const offset = 120 * this.scale; // Convert pixel offset to world coordinates
        const visibleWidth = this.canvasWidth * this.scale;
        const visibleHeight = this.canvasHeight * this.scale;

        const y = this.y + (visibleHeight * (1 - this.characterFraction)) + offset;
        const x = this.x + (Math.random() - 0.5) * visibleWidth;

        return { x, y };
    }

    /**
     * Generates a random point 35 pixels above the visible canvas.
     * @returns {{x: number, y: number}} The spawn point coordinates.
     */
    offTopOfScreen() {
        const offset = 35 * this.scale; // Convert pixel offset to world coordinates
        const visibleWidth = this.canvasWidth * this.scale;
        const visibleHeight = this.canvasHeight * this.scale;

        const y = this.y - (visibleHeight / 2) - offset;
        const x = this.x + (Math.random() - 0.5) * visibleWidth;

        return { x, y };
    }
}
