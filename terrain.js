export class Tree {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 5;
    this.height = 10;
    this.type = "tree";
  }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = "#8B4513";
        ctx.fillRect(this.x, this.y - this.height, this.width, this.height);
        ctx.fillStyle = "#228B22";
        ctx.beginPath();
        ctx.moveTo(this.x + this.width/2, this.y - 50 - this.height);
        ctx.lineTo(this.x + this.width/2 + 15, this.y - this.height);
        ctx.lineTo(this.x + this.width/2 - 15, this.y - this.height);
        ctx.fill();
        ctx.restore();
    }

    
}

export class SkiBoundary {
    constructor(x1, y1, x2, y2) {
        this.x1 = x1; // Starting x-coordinate
        this.y1 = y1; // Starting y-coordinate
        this.x2 = x2; // Ending x-coordinate
        this.y2 = y2; // Ending y-coordinate
        this.x = Math.min(x1, x2); // Left x-coordinate
        this.y = Math.min(y1, y2); // Top y-coordinate
        this.type = "skiBoundary";

        this.fenceHeight = 15; // Height of the vertical poles
        this.flagHeight = 7;   // Height the flags hang down
        this.flagWidth = 4;    // Width of each flag at the base

        let dx = this.x2 - this.x1;
        let dy = this.y2 - this.y1;
        this.length = Math.hypot(dx, dy);
        if (this.length === 0) {
            // Handle the case where the boundary is a point
            this.normalX = 0;
            this.normalY = 0;
        } else {
            this.normalX = -dy / this.length;
            this.normalY = dx / this.length;
        }
        console.log("Normal: ", this.normalX, this.normalY);
    }

    isUphillFrom(x, y) {
        // Calculate the cross product (determinant)
        let value = (this.x2 - this.x1) * (y - this.y1) - (this.y2 - this.y1) * (x - this.x1);
        return value < 0;
    }

    couldCollide(x, y) {
        let minX = Math.min(this.x1, this.x2);
        let maxX = Math.max(this.x1, this.x2);
        let minY = Math.min(this.y1, this.y2);
        let maxY = Math.max(this.y1, this.y2);

        return x >= minX && x <= maxX && y >= minY && y <= maxY;
    }

    draw(ctx) {
        // Draw the orange top line of the fence
        ctx.beginPath();
        ctx.moveTo(this.x1, this.y1 - this.fenceHeight);
        ctx.lineTo(this.x2, this.y2 - this.fenceHeight);
        ctx.lineWidth = 1;
        ctx.strokeStyle = "orange";
        ctx.stroke();

        // Calculate the total length of the fence line
        let dx = this.x2 - this.x1;
        let dy = this.y2 - this.y1;

        // Determine the number of segments (number of poles minus one)
        let maxSegmentLength = 50; // Maximum length between poles along the fence
        let numberOfSegments = Math.ceil(this.length / maxSegmentLength);

        // Calculate the actual segment length
        let segmentLength = this.length / numberOfSegments;

        // Calculate the unit vector along the fence line
        let unitDx = dx / this.length;
        let unitDy = dy / this.length;

        // Draw vertical poles at start, end, and evenly spaced positions
        for (let i = 0; i <= numberOfSegments; i++) {
            // Position of the current pole
            let x = this.x1 + unitDx * segmentLength * i;
            let y = this.y1 + unitDy * segmentLength * i;

            // Draw vertical pole at (x, y)
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y - this.fenceHeight);
            ctx.strokeStyle = "orange";
            ctx.stroke();
        }

        // Draw the continuous series of triangular flags along the top line
        // Determine the number of flags needed along the fence
        let flagCount = Math.ceil(this.length / this.flagWidth);
        let actualFlagWidth = this.length / flagCount; // Adjust flag width to fit exactly along the fence

        // Starting point for the flags (top left corner)
        let startX = this.x1;
        let startY = this.y1 - this.fenceHeight;

        ctx.fillStyle = "orange";
        ctx.beginPath();

        // Move to the starting point
        ctx.moveTo(startX, startY);

        let xTop = 0;
        let yTop = 0;
        for (let i = 0; i <= flagCount; i++) {
            // Calculate the position along the top line
            let t = (i * actualFlagWidth) / this.length; // Parameter from 0 to 1
            xTop = this.x1 + t * dx - unitDy * (0); // No offset perpendicular to the line
            yTop = this.y1 + t * dy - unitDx * (0) - this.fenceHeight;

            // Calculate the bottom point of the flag (hanging down)
            let xBottom = xTop + unitDx;
            let yBottom = yTop + this.flagHeight;

            // Alternate between moving to top point and bottom point to create triangles
            if (i % 2 === 0) {
                // Even index: move to bottom point
                ctx.lineTo(xBottom, yBottom);
            } else {
                // Odd index: move back to top point
                ctx.lineTo(xTop, yTop);
            }
        }
        ctx.lineTo(xTop, yTop);

        // Close the path and fill
        ctx.closePath();
        ctx.fill();
    }
}



export class FirstAid {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 110;
        this.image_uri = "images/first_aid.svg";
        this.type = "firstAid";
        this.image = new Image();
        this.image.src = this.image_uri;
        this.image.onload = () => {
            this.loaded = true;
        }
        this.claimed = false;
    }

    draw(ctx) {
        if (!this.loaded) {
            return;
        }
        const imageRatio = this.image.width / this.image.height;
        const imageHeight = this.width / imageRatio;
        ctx.drawImage(this.image, this.x - this.width / 2, this.y - imageHeight, this.width, imageHeight);
    }

    claim() {
        this.claimed = true;
    }
}

export class JumpRamp {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.type = "jumpRamp";
        this.width = 50;
        this.height = 7;
        this.rainbowColors = [
            "#FF0000", "#FFA500", "#FFFF00", "#008000", "#0000FF", "#4B0082", "#8B008B"
        ];
    }

  
    draw(ctx) {
        // draw a rainbow colored jump ramp
        const stripeHeight = this.height / this.rainbowColors.length;
        for (let i = 0; i < this.rainbowColors.length; i++) {
            ctx.fillStyle = this.rainbowColors[i];
            ctx.fillRect(this.x - this.width / 2, this.y + i * stripeHeight, this.width, stripeHeight);
        }
    }
}

function _isColliding(tree, box) {
    const treeBox = {
        left: tree.x - tree.width / 2,
        right: tree.x + tree.width / 2,
        top: tree.y - tree.height / 2,
        bottom: tree.y + tree.height / 2
    };

    // Check if the boxes overlap in both X and Y directions
    return !(treeBox.left > box.right || 
             treeBox.right < box.left || 
             treeBox.top > box.bottom || 
             treeBox.bottom < box.top);
}

export class TerrainManager {
    constructor(canvas) {
        this.entities = [];
        this.canvas = canvas;
        this.camera = null;

        // Entity spawn densities (pixels² per entity)
        this.treeDensityY = 64000;      // Trees per vertical exposed area
        this.treeDensityX = 64000;      // Trees per horizontal exposed area
        this.jumpRampDensityY = 120000; // Jump ramps per vertical exposed area
        this.firstAidDensityY = 4220000; // First aid per vertical exposed area

        // Accumulated exposed area
        this.accumulatedExposedAreaY = 0;
        this.accumulatedExposedAreaX = 0;
        this.accumulatedExposedAreaJumpRampY = 0;
        this.accumulatedExposedAreaFirstAidY = 0;
    }

    /**
     * Associates the TerrainManager with a Camera instance.
     * @param {Camera} camera - The Camera instance.
     */
    setCamera(camera) {
        this.camera = camera;
    }

    /**
     * Updates the terrain by spawning trees and jump ramps based on exposed area.
     * @param {number} dt - Delta time since last update (in seconds).
     */
    update(dt) {
        if (!this.camera) {
            console.warn("Camera not set for TerrainManager.");
            return;
        }

        // Calculate exposed areas (pixels²) based on camera movement and scale
        const exposedAreaY = this.camera.getExposedAreaY() * dt; // Vertical exposed area per second
        const exposedAreaX = this.camera.getExposedAreaX() * dt; // Horizontal exposed area per second

        // Accumulate exposed areas
        this.accumulatedExposedAreaY += exposedAreaY;
        this.accumulatedExposedAreaX += exposedAreaX;
        this.accumulatedExposedAreaJumpRampY += exposedAreaY;
        this.accumulatedExposedAreaFirstAidY += exposedAreaY;

        // Spawn vertical trees based on accumulated vertical exposed area
        while (this.accumulatedExposedAreaY >= this.treeDensityY) {
            const loc = this.camera.offBottomOfScreen();
            this.addTree(loc.x, loc.y);
            this.accumulatedExposedAreaY -= this.treeDensityY;
        }

        // Spawn horizontal trees based on accumulated horizontal exposed area
        while (this.accumulatedExposedAreaX >= this.treeDensityX) {
            let loc;
            if (this.camera.velocity.x > 0) {
                loc = this.camera.offRightOfScreen();
            } else if (this.camera.velocity.x < 0) {
                loc = this.camera.offLeftOfScreen();
            } else {
                // If no horizontal movement, default to one side (e.g., right)
                loc = this.camera.offRightOfScreen();
            }
            this.addTree(loc.x, loc.y);
            this.accumulatedExposedAreaX -= this.treeDensityX;
        }

        // Jump Ramp
        while (this.accumulatedExposedAreaJumpRampY >= this.jumpRampDensityY) {
            const loc = this.camera.offBottomOfScreen();
            this.addJumpRamp(loc.x, loc.y);
            this.accumulatedExposedAreaJumpRampY -= this.jumpRampDensityY;
        }

        // First Aid
        while (this.accumulatedExposedAreaFirstAidY >= this.firstAidDensityY) {
            console.log("Adding first aid");
            const loc = this.camera.offBottomOfScreen();
            this.addFirstAid(loc.x, loc.y);
            this.accumulatedExposedAreaFirstAidY -= this.firstAidDensityY;
        }

        // Remove entities that are no longer relevant
        const removalThresholdY = this.camera.topOfScreen() - 50;;
        this.removeEntitiesByPosition(removalThresholdY);
    }

    addSkierBoundary(x1, y1, x2, y2) {
        let skiBoundary = new SkiBoundary(x1, y1, x2, y2);
        const index = this._findInsertIndex(skiBoundary.y1);
        this.entities.splice(index, 0, skiBoundary);
        return skiBoundary;
    }



    // Binary search to find the correct index for insertion
    _findInsertIndex(y) {
        let low = 0;
        let high = this.entities.length;

        while (low < high) {
            let mid = Math.floor((low + high) / 2);
            if (this.entities[mid].y < y) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }
        return low;
    }

    // Insert a tree in sorted order by position.y
    addTree(x, y) {
        var tree = new Tree(x, y)
        const index = this._findInsertIndex(tree.y);
        this.entities.splice(index, 0, tree);
    }

    addJumpRamp(x, y) {
        var jumpRamp = new JumpRamp(x, y);
        const index = this._findInsertIndex(jumpRamp.y);
        this.entities.splice(index, 0, jumpRamp);
    }

    addFirstAid(x, y) {
        var firstAid = new FirstAid(x, y);
        const index = this._findInsertIndex(firstAid.y);
        this.entities.splice(index, 0, firstAid);
    }

    onCanvasResize(ctx) {
        this.xDistPerTree = this.yDistPerTree / ctx.height * ctx.width;
    }

    removeEntitiesByPosition(threshold) {
        let i = 0;
        // Iterate from the beginning and remove trees with position.y less than the threshold
        while (i < this.entities.length && this.entities[i].y < threshold) {
            i++;
        }

        // Remove all trees up to index i
        this.entities = this.entities.slice(i);
    }

    collidesWith(x, y, sizeX, sizeY, deltaYSinceLastFrame) {
        let collidingTrees = [];
        
        // Find the starting index for the given y position
        const index = this._findInsertIndex(y);
        
        // Define the bounding box for the object to check collision with
        const box = {
            left: x - sizeX / 2,
            right: x + sizeX / 2,
            top: y - sizeY / 2 - deltaYSinceLastFrame,
            bottom: y + sizeY / 2
        };
    
        // Check backward from the found index
        for (let i = index - 1; i >= 0; i--) {
            let tree = this.entities[i];
    
            // Stop if this tree's position is out of collision bounds in the Y direction
            if (tree.y + tree.height / 2 < box.top) break;
    
            // Check if the tree collides with the box
            if (_isColliding(tree, box)) {
                collidingTrees.push(tree);
            }
        }
    
        // Check forward from the found index
        for (let i = index; i < this.entities.length; i++) {
            let tree = this.entities[i];
    
            // Stop if this tree's position is out of collision bounds in the Y direction
            if (tree.y - tree.height / 2 > box.bottom) break;
    
            // Check if the tree collides with the box
            if (_isColliding(tree, box)) {
                collidingTrees.push(tree);
            }
        }
    
        return collidingTrees;
    }

    draw(ctx) {
        for (let tree of this.entities) {
        tree.draw(ctx);
        }
    }
}

export default TerrainManager;