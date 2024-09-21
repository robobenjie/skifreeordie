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