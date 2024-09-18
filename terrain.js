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
    this.lastTreeXpos = 0;
    this.lastTreeYpos = 0;
    this.yDistPerTree = 100;
    this.xDistPerTree = 30;
    this.yDistPerJumpRamp = 200;
    this.lastJumpRampYpos = 0;
    this.canvas = canvas;
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

    offBottomOfScreen(character) {
       return {
            x: (Math.random() - 0.5) * this.canvas.width * 2 + character.x ,
            y: this.canvas.height * 1 + character.y
       }
    }

    offLeftOfScreen(character) {
        return {
            x: -this.canvas.width * 0.65 + character.x,
            y: (Math.random() - 0.5) * this.canvas.height * 2 + character.y
        }
    }

    offRightOfScreen(character) {
        return {
            x: this.canvas.width * 0.65 + character.x,
            y: (Math.random() - 0.5) * this.canvas.height * 2 + character.y
        }
    }

    update(dt, character, ctx) {
        if (character.y - this.lastTreeYpos >this.yDistPerTree) {
            var loc = this.offBottomOfScreen(character);
            this.addTree(loc.x, loc.y);
            this.lastTreeYpos = character.y;
        }
        if (Math.abs(character.x - this.lastTreeXpos) > this.xDistPerTree) {
            var xpos = 0
            if (character.skiPhysics.velocity.x > 0) {
                var loc = this.offRightOfScreen(character);
            } else {
                var loc = this.offLeftOfScreen(character);
            }
            this.addTree(loc.x, loc.y);
            this.lastTreeXpos = character.x;
        }
        if (character.y - this.lastJumpRampYpos > this.yDistPerJumpRamp) {
            this.addJumpRamp(
                (Math.random() - 0.5) * ctx.canvas.width * 2 + character.x,
                ctx.canvas.height * 1 + character.y
            );
            this.lastJumpRampYpos = character.y;
        }
        this.removeEntitiesByPosition(character.y - ctx.canvas.height / 2);
    }

    draw(ctx) {
        for (let tree of this.entities) {
        tree.draw(ctx);
        }
    }
}

export default TerrainManager;