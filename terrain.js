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

export class TreeManager {
  constructor(numTrees) {
    this.numTrees = numTrees;
    this.trees = [];
  }

  addTree(x, y) {
    this.trees.push(new Tree(x, y));
  }

  update(dt, character, ctx) {
    
  }

  draw(ctx) {
    for (let tree of this.trees) {
      tree.draw(ctx);
    }
  }
}

export default TreeManager;