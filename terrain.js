class Tree {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 5;
    this.height = 10;
  }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = "#8B4513";
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = "#228B22";
        ctx.beginPath();
        ctx.moveTo(this.x + this.width/2, this.y - 50);
        ctx.lineTo(this.x + this.width/2 + 15, this.y);
        ctx.lineTo(this.x + this.width/2 - 15, this.y);
        ctx.fill();
        ctx.restore();
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

export class TreeManager {
  constructor() {
    this.trees = [];
  }

    // Binary search to find the correct index for insertion
    _findInsertIndex(y) {
        let low = 0;
        let high = this.trees.length;

        while (low < high) {
            let mid = Math.floor((low + high) / 2);
            if (this.trees[mid].y < y) {
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
        this.trees.splice(index, 0, tree);
    }

    removeTreesByPosition(threshold) {
        let i = 0;
        // Iterate from the beginning and remove trees with position.y less than the threshold
        while (i < this.trees.length && this.trees[i].y < threshold) {
            i++;
        }

        // Remove all trees up to index i
        this.trees = this.trees.slice(i);
    }

    collidesWith(x, y, size) {
        let collidingTrees = [];
        
        // Find the starting index for the given y position
        const index = this._findInsertIndex(y);
        
        // Define the bounding box for the object to check collision with
        const box = {
            left: x - size / 2,
            right: x + size / 2,
            top: y - size / 2,
            bottom: y + size / 2
        };
    
        // Check backward from the found index
        for (let i = index - 1; i >= 0; i--) {
            let tree = this.trees[i];
    
            // Stop if this tree's position is out of collision bounds in the Y direction
            if (tree.y + tree.height / 2 < box.top) break;
    
            // Check if the tree collides with the box
            if (_isColliding(tree, box)) {
                collidingTrees.push(tree);
            }
        }
    
        // Check forward from the found index
        for (let i = index; i < this.trees.length; i++) {
            let tree = this.trees[i];
    
            // Stop if this tree's position is out of collision bounds in the Y direction
            if (tree.y - tree.height / 2 > box.bottom) break;
    
            // Check if the tree collides with the box
            if (_isColliding(tree, box)) {
                collidingTrees.push(tree);
            }
        }
    
        return collidingTrees;
    }

    update(dt, character, ctx) {
        this.removeTreesByPosition(character.y - ctx.canvas.height / 2);
    }

    draw(ctx) {
        for (let tree of this.trees) {
        tree.draw(ctx);
        }
    }
}

export default TreeManager;