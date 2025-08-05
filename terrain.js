import { getThreeLevels, LevelDifficulty } from "./level.js";
import randomCentered, { throttledLog } from "./utils.js";
import { setFillColor } from "./utils.js";
import SkiLift from "./skilift.js";
import { Coin as CoinModel } from "./collectable_models.js";

const TREE_POOL_SIZE = 200;
const RESORT_ROTATION_THRESHOLD = 0.03;

export class TerrainManager {
    constructor(canvas) {
        this.entities = [];
        this.canvas = canvas;
        this.camera = null;

        // Entity spawn densities (pixels² per entity)
        this.treeDensityY = 64000;      // Trees per vertical exposed area
        this.treeDensityX = 64000;      // Trees per horizontal exposed area
        this.jumpRampDensityY = 600000; // Jump ramps per vertical exposed area
        this.firstAidDensityY = 4220000; // First aid per vertical exposed area

        // Accumulated exposed area
        this.accumulatedExposedAreaY = 0;
        this.accumulatedExposedAreaX = 0;
        this.accumulatedExposedAreaJumpRampY = 0;
        this.accumulatedExposedAreaFirstAidY = 0;

        this.lastPlacedLevelSelect = 0;

        // Initialize tree pool
        this.treePool = Array(TREE_POOL_SIZE).fill(null).map(() => new Tree(0, 0));
        this.nextTreeIndex = 0;

        this.rotationSinceResort = 0;
    }

    rotateAbout(x, y, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        for (let i = 0; i < this.entities.length; i++) {
            let entity = this.entities[i];
            let dx = entity.x - x;
            let dy = entity.y - y;
            entity.x = x + dx * cos - dy * sin;
            entity.y = y + dx * sin + dy * cos;
            if (entity.type === 'skiRunSign') {
                entity.angle += angle;
            }
            if (entity.type === 'skiLift') {
                entity.rotateAbout(x, y, angle);
            }
        }

        this.rotationSinceResort += angle;
        if (this.rotationSinceResort > RESORT_ROTATION_THRESHOLD) {
            this.rotationSinceResort = 0;
            console.log("Resorting");
            this.entities.sort((a, b) => a.y - b.y);
        }

    }

    setTreePercentage(percentage) {
        this.accumulatedExposedAreaX = 0;
        this.accumulatedExposedAreaY = 0;
        this.treeDensityY = 64000 / percentage;
        this.treeDensityX = 64000 / percentage;
    }

    setJumpRampPercentage(percentage) {
        this.accumulatedExposedAreaJumpRampY = 0;
        this.jumpRampDensityY = 600000 / percentage;
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

        for (let entity of this.entities) {
            if (entity.update) {
                entity.update(dt);
            }
        }

        if (this.camera.character.startedRun()) {
            this.lastPlacedLevelSelect = this.camera.y;
        } else {
            if (this.camera.y - this.lastPlacedLevelSelect > 3000) {
                // Check if there are any skirun start signs below the top of the screen
                const topOfScreen = this.camera.topOfScreen();
                for (let i = 0; i < this.entities.length; i++) {
                    if (this.entities[i].type === 'skiRunSign' && this.entities[i].y > topOfScreen) {
                        return;
                    }
                }
                let nextLevels = this.getLevelsCallback();   
                this.addLevelSelect(
                    nextLevels[0],
                    nextLevels[1],
                    nextLevels[2]
                );
                this.lastPlacedLevelSelect = this.camera.y;
            }
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

    drawUnder(ctx) {
        ctx.save();
        ctx.scale(1, 0.5);
        ctx.fillStyle = "#E8E8F0";
        ctx.beginPath();

        for (let entity of this.entities) {
            if ((entity.type === 'tree' || entity.type === 'coin') && entity.active && this.camera.isOnScreen(entity.x, entity.y, 30)) {
                entity.drawUnder(ctx);
            }
        }
        ctx.fill();
        ctx.restore();

        for (let entity of this.entities) {
            if (entity.type !== 'tree' && entity.drawUnder && entity.active !== false && this.camera.isOnScreen(entity.x, entity.y, 100)) {
                entity.drawUnder(ctx);
            }
        }

    }

    setGetLevelsCallback(callback) {
        this.getLevelsCallback = callback;
    }

    addLevelSelect(level1, level2, level3) {
        const y = this.camera.offBottomOfScreen().y + 400;
        const centerX = this.camera.character.x;
        const spacing = 180; // Adjust this value to change the spacing between signs
        const angle1 = 30 * Math.PI / 180;
        const angle2 = 0;
        const angle3 = -30 * Math.PI / 180;

        this.addSkiRunSign(centerX - spacing, y - 50, level1, angle1);
        level1.setGoalAngle(angle1 * 1.5);
        this.addSkiRunSign(centerX, y, level2, angle2);
        level2.setGoalAngle(angle2);
        this.addSkiRunSign(centerX + spacing, y - 50, level3, angle3);
        level3.setGoalAngle(angle3 * 1.5);
        this.addTreeLine(centerX - spacing * 1.5, y - 150, centerX - spacing * 4.5, y + 400, 150, .03);
        this.addTreeLine(centerX + spacing * 1.5, y - 150, centerX + spacing * 4.5, y + 400, 150, .03);

        this.addTreeLine(centerX - spacing * 0.5, y, centerX - spacing * 1.5, y + 600, 120, .02);
        this.addTreeLine(centerX + spacing * 0.5, y, centerX + spacing * 1.5, y + 600, 120, .02);


    }

    addCoin(x, y) {
        let coin = new Coin(x, y, this.camera);
        const index = this._findInsertIndex(coin.y);
        this.entities.splice(index, 0, coin);
    }

    addSkiLift(p1, p2) {
        let skiLift = new SkiLift(p1, p2);
        const index = this._findInsertIndex(skiLift.y);
        this.entities.splice(index, 0, skiLift);
    }

    addSkierBoundary(x1, y1, x2, y2) {
        const len = Math.hypot(x2 - x1, y2 - y1);
        if (len > 50) {
            const numSegments = Math.ceil(len / 50);
            const dx = (x2 - x1) / numSegments;
            const dy = (y2 - y1) / numSegments;
            for (let i = 0; i < numSegments; i++) {
                const x = x1 + dx * i;
                const y = y1 + dy * i;
                this.addSkierBoundary(x, y, x + dx, y + dy);
            }
        }
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

    addTreeLine(x1, y1, x2, y2, maxWidth, density) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        const numTrees = Math.floor(length * maxWidth * density / 100); // Adjust this factor as needed
        
        for (let i = 0; i < numTrees; i++) {
            const t = i / (numTrees - 1);
            const distanceFromMidpoint = Math.abs(t - 0.5) * 2;
            const currentWidth = maxWidth * (1 - distanceFromMidpoint);
            
            const treeX = x1 + t * dx + (Math.random() - 0.5) * currentWidth;
            const treeY = y1 + t * dy + (Math.random() - 0.5) * currentWidth;
            
            // Only add the tree if it's within the diamond shape
            if (Math.abs(treeX - (x1 + t * dx)) <= currentWidth / 2) {
                this.addTree(treeX, treeY);
            }
        }
    }

    addSkiRunSign(x, y, level, angle) {
        var sign = new SkiRunSign(x, y, level, angle);
        const index = this._findInsertIndex(sign.y);
        this.entities.splice(index, 0, sign);
    }

    // Insert a tree in sorted order by position.y
    addTree(x, y) {
        // Find next available tree in pool
        let tree = null;
        let startIndex = this.nextTreeIndex;

        
        // Look for an inactive tree or wrap around to the beginning
        do {
            if (!this.treePool[this.nextTreeIndex].active) {
                tree = this.treePool[this.nextTreeIndex];
                break;
            }
            this.nextTreeIndex = (this.nextTreeIndex + 1) % TREE_POOL_SIZE;
        } while (this.nextTreeIndex !== startIndex);

        // If no inactive tree found, reuse the oldest one
        if (!tree) {
            console.log("Reusing tree (too many trees)");
            tree = this.treePool[this.nextTreeIndex];
            // Remove the old tree from entities array if it exists
            const oldIndex = this.entities.indexOf(tree);
            if (oldIndex !== -1) {
                this.entities.splice(oldIndex, 1);
            }
            this.nextTreeIndex = (this.nextTreeIndex + 1) % TREE_POOL_SIZE;
        }

        // Reset and position the tree
        tree.reset(x, y);
        
        // Insert into entities array
        const index = this._findInsertIndex(tree.y);
        this.entities.splice(index, 0, tree);
    }

    addCoinLine(x, y, angle, count, spacing = 50) {
        const dx = Math.sin(angle) * spacing;
        const dy = Math.cos(angle) * spacing;
        for (let i = 0; i < count; i++) {
            this.addCoin(x + i * dx, y + i * dy);
        }
    }

    addCoinSine(x, y, angle, count, spacing = 50) {
        const amplitude = 300;
        const frequency = 0.1;
        const dx = Math.sin(angle) * spacing;
        const dy = Math.cos(angle) * spacing;
        const tangent_x = Math.cos(angle);
        const tangent_y = Math.sin(angle);
        for (let i = 0; i < count; i++) {
            const ypos = y + dy * i + Math.sin(i * frequency) * amplitude * tangent_y;
            const xpos = x + dx * i + Math.sin(i * frequency) * amplitude * tangent_x;
            this.addCoin(xpos, ypos);
        }
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

    removeEntitiesByPosition(threshold) {
        let i = 0;
        while (i < this.entities.length && this.entities[i].y < threshold) {
            // Mark trees as inactive when removed
            if (this.entities[i].type === 'tree') {
                this.entities[i].active = false;
            }
            i++;
        }

        // Remove all entities up to index i
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
            if (tree.active !== false && _isColliding(tree, box)) {
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

    removeEntity(entity) {
        const index = this.entities.indexOf(entity);
        if (index !== -1) {
            this.entities.splice(index, 1);
        }
    }
}

export class Tree {
    constructor(x, y) {
        this.reset(x, y);
        this.type = "tree";
        // Pre-calculate these values once since they don't change
        this.trunkExtra = 7 + randomCentered(4);
        this.coneHeight = 50 + randomCentered(20);
        this.coneWidth = 30 + this.coneHeight / 5 + randomCentered(5);
        this.numCones = Math.floor(3 + randomCentered(1.0));
        this.active = false;
    }

    reset(x, y) {
        this.x = x;
        this.y = y;
        this.width = 5;
        this.height = 10;
        this.active = true;
    }

    // Who knows. AI did this for me.
    calculateTheta(r1, r2, h1, d) {
        // Calculate phi
        const phi = Math.atan(h1 / r1);
      
        // Compute the numerator and denominator for the arcsine argument
        const numerator = -(h1 - d) * r1;
        const denominator = r2 * Math.sqrt(r1 * r1 + h1 * h1);
      
        // Calculate the ratio for the arcsine function
        const ratio = numerator / denominator;
      
        // Ensure the ratio is within the valid domain of asin [-1, 1]
        if (ratio < -1 || ratio > 1) {
          throw new Error("Invalid input: The value inside arcsin is out of the valid range [-1, 1].");
        }
      
        // Calculate the arcsine part
        const arcsinPart = Math.asin(ratio);
      
        // Compute theta
        const theta = phi + arcsinPart;
      
        // Return theta in radians
        return theta;
      }

    draw(ctx) {

        setFillColor(ctx, "#8B4513");
        ctx.fillRect(this.x, this.y - this.height * 2, this.width, this.height * 2);
        function drawCone(ctx, color, x, y, height, ratio) {
            const width = height * ratio;
            setFillColor(ctx, color);
            ctx.beginPath();
            ctx.arc(x, (y + height - 1) * 2, width/2, 0, Math.PI);
            ctx.lineTo(x, (y - 1) * 2);  // still in the scaled context
            ctx.closePath();
            ctx.fill();
        }

        const ratio = this.coneWidth / this.coneHeight;
        let prevConeHeight = 0;
        let prevConeBottom = 0;
        ctx.save();
        ctx.scale(1, 0.5);
        for (let i = 0; i < this.numCones; i++) {
            const scale = 1 - (i * 0.25);
            const coneBottom = this.y - this.height - this.trunkExtra - this.coneHeight * i * 0.4;
            const coneHeight = this.coneHeight * scale;
            if (i > 0) {
                const SHADOW_SIZE = 5;
                const shadowBottom = coneBottom + SHADOW_SIZE;
                const prevTop = prevConeBottom - prevConeHeight;
                const shadowHeight = -(prevTop - coneBottom) + SHADOW_SIZE;

                drawCone(ctx,
                    "#267126", // Darker green for shadow
                    this.x + this.width/2,
                    shadowBottom - shadowHeight,
                    shadowHeight,
                    ratio
                );
            }
            
            prevConeHeight = coneHeight;
            prevConeBottom = coneBottom;
            drawCone(
                ctx,
                "#228B22",
                this.x + this.width/2,
                coneBottom - coneHeight,
                coneHeight,
                ratio
            );
        }
        ctx.restore();
    }

    drawUnder(ctx) {
        ctx.moveTo(this.x + this.width/2, this.y * 2);
        ctx.arc(this.x + this.width/2, this.y * 2, this.coneWidth * 0.6, 0, 2 * Math.PI);
    }
}

export class SkiRunSign {
    constructor(x, y, level, angle) {
        this.x = x;
        this.y = y;
        this.level = level;
        this.image = level.signImages[level.LevelDifficulty];
        this.width = 175;
        this.height = 20;
        this.type = "skiRunSign";
        this.angle = angle;

        // Fractional text to avoid anti-aliasing issues
        this.signTextX = 64.01;
        this.signTextY = 20.01;
        this.rightBuffer = 8;

        // Create offscreen canvas for prerendering
        this.offscreenCanvas = document.createElement('canvas');
        
        // Wait for image to load before rendering
        this.image.onload = () => {
            const scaleFactor = 175 / this.image.width;
            const scaledHeight = this.image.height * scaleFactor;
            
            this.offscreenCanvas.width = this.width;
            this.offscreenCanvas.height = scaledHeight;
            const offCtx = this.offscreenCanvas.getContext('2d');

            // Draw the scaled image
            offCtx.drawImage(this.image, 0, 0, this.width, scaledHeight);

            // Draw the level name
            offCtx.save();
            offCtx.translate(this.signTextX, this.signTextY);
            offCtx.font = "16px 'Roboto Condensed'";
            offCtx.fillStyle = "white";
            offCtx.textAlign = "left";

            // Measure and scale text
            const textWidth = offCtx.measureText(this.level.name).width;
            const maxWidth = this.width - this.signTextX - this.rightBuffer;
            const textScaleFactor = Math.min(1, maxWidth / textWidth);

            // Apply the scaling and draw text
            offCtx.scale(textScaleFactor, textScaleFactor);
            offCtx.fillText(this.level.name, 0, 0);
            offCtx.restore();
        };
    }

    draw(ctx) {
        const scaleFactor = 175 / this.image.width;
        const scaledHeight = this.image.height * scaleFactor;

        ctx.save();
        ctx.translate(this.x, this.y - scaledHeight + 18);
        ctx.transform(Math.cos(this.angle), this.angle, 0, 1, 0, 0);
        
        // Draw the prerendered canvas
        ctx.drawImage(this.offscreenCanvas, -this.width / 2, 0);
        
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

        this.fenceHeight = 18; // Height of the vertical poles
        this.flagHeight = 9;   // Height the flags hang down
        this.flagWidth = 5;    // Width of each flag at the base

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
        this.loaded = false;
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

export class Coin {
    constructor(x, y, camera) {
        this.x = x;
        this.y = y;
        this.type = "coin";
        this.model = new CoinModel(this.width);
        this.active = true;
        this.width = 25;
        this.height = 25;
        this.radius = 0.5
        this.camera = camera;
        this.onScreen = false;
    }

    update(dt) {
        if (!this.camera.isOnScreen(this.x, this.y, 30)) {
            this.onScreen = false;
            return;
        }
        this.onScreen = true;
        const time = Date.now() / 1000;
        const rot_val = (time * 100 + this.y * 30 + this.x) / 20;
        const height_val = time * 4 + (this.y * 3 + this.x) / 30;
        const rotation = rot_val % (2 * Math.PI);
        const height = Math.sin(height_val) * 0.5 + 1.3;
        this.model.update(dt, rotation, height);
    }

    draw(ctx) {
        if (!this.onScreen) {
            return;
        }
        ctx.save();
        ctx.translate(this.x, this.y);
        this.model.draw(ctx);
        ctx.restore();
    }

    drawUnder(ctx) {
        if (!this.onScreen) {
            return;
        }
        ctx.moveTo(this.x + this.radius/2, this.y * 2);
        ctx.arc(this.x + this.radius/2, this.y * 2, 5, 0, 2 * Math.PI);
    }
}

export class JumpRamp {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.type = "jumpRamp";
        this.image = new Image();
        this.image.src = "images/ramp_front.svg";
        this.snowImage = new Image();
        this.snowImage.src = "images/ramp_snow.svg";
        this.width = 80;
        this.height = 7;
        this.loaded = false;
        this.imageRatio = 1 
        this.imageWidth = 1;
        this.imageHeight = 1;
        this.image.onload = () => {
            this.loaded = true;
            this.imageRatio = this.image.width / this.image.height;
            this.imageWidth = this.width * 1.75;
            this.imageHeight = this.imageWidth / this.imageRatio;
        }
    }
  
    drawUnder(ctx) {
        // draw a rainbow colored jump ramp

        const rampLevel = 32;
        ctx.drawImage(this.snowImage, this.x - this.imageWidth / 2, this.y - this.imageHeight + rampLevel, this.imageWidth, this.imageHeight);
        
    }

    draw(ctx) {
        // draw a rainbow colored jump ramp
        const rampLevel = 37;
        ctx.drawImage(this.image, this.x - this.imageWidth / 2, this.y - this.imageHeight + rampLevel, this.imageWidth, this.imageHeight);
        
    }
}

function _isColliding(entity, box) {
    const entityBox = {
        left: entity.x - entity.width / 2,
        right: entity.x + entity.width / 2,
        top: entity.y - entity.height / 2,
        bottom: entity.y + entity.height / 2
    };

    // Check if the boxes overlap in both X and Y directions
    return !(entityBox.left > box.right || 
             entityBox.right < box.left || 
             entityBox.top > box.bottom || 
             entityBox.bottom < box.top);
}

export default TerrainManager;