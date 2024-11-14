class Renderer {
    constructor(ctx, character, treeManager, particleEngine, mobManager, camera) {
        this.ctx = ctx;
        this.character = character;
        this.treeManager = treeManager;
        this.particleEngine = particleEngine;
        this.mobManager = mobManager;
        this.camera = camera;
    }

    render() {
        // Draw ground effects first
        this.ctx.save();
        this.camera.applyTransform(this.ctx);
        this.treeManager.drawUnder(this.ctx);
        this.character.drawTrail(this.ctx);
        this.character.drawShadow(this.ctx);
        this.mobManager.drawUnderMob(this.ctx);
        this.mobManager.drawUnderProjectile(this.ctx);
    
        // Copy lists to manipulate them
        let trees = [...this.treeManager.entities].filter(entity => entity.active !== false);
        let mobs = [...this.mobManager.mobs];
        let projectiles = [...this.mobManager.projectiles];
        let characterInserted = false;
        const entitiesToDraw = [];
    
        while (trees.length > 0 || mobs.length > 0 || projectiles.length > 0 || !characterInserted) {
            // Determine the next entity to draw based on y-values
            let nextTree = trees[0];
            let nextMob = mobs[0];
            let nextProjectile = projectiles[0];
            let characterY = (!characterInserted) ? this.character.y : Infinity;
    
            let treeY = nextTree ? nextTree.y : Infinity;
            let mobY = nextMob ? nextMob.y : Infinity;
            let projectileY = nextProjectile ? nextProjectile.y : Infinity;
    
            // Find the smallest y-value
            let nextEntity = [
                { type: 'terrain', entity: nextTree, y: treeY },
                { type: 'mob', entity: nextMob, y: mobY },
                { type: 'projectile', entity: nextProjectile, y: projectileY },
                { type: 'character', entity: this.character, y: characterY }
            ].reduce((min, current) => current.y < min.y ? current : min);

            if (!nextEntity.y || nextEntity.y == Infinity) {
                break;
            }

            if (nextEntity.type === 'terrain') {
                let tree = trees.shift(); // Remove the tree from the list
                if (tree.type === "skiBoundary") {
                    // Handle the skiBoundary
                    this.processSkiBoundary(tree, mobs, projectiles, characterInserted, entitiesToDraw);
                    // Update the characterInserted flag if needed
                    if (this.characterInsertedDuringBoundary) {
                        characterInserted = true;
                    }
                } else {
                    // Regular tree
                    entitiesToDraw.push(tree);
                }
            } else if (nextEntity.type === 'mob') {
                entitiesToDraw.push(mobs.shift()); // Remove mob from list
            } else if (nextEntity.type === 'projectile') {
                entitiesToDraw.push(projectiles.shift()); // Remove projectile from list
            } else if (nextEntity.type === 'character') {
                entitiesToDraw.push(this.character);
                characterInserted = true;
            } else {
                console.error("No matching condition found for", nextEntity);
                break;
            }
        }
    
        // Draw all entities in the merged array
        for (let entity of entitiesToDraw) {
            if (this.camera.isOnScreen(entity.x, entity.y, 100)) {
                entity.draw(this.ctx);
            }
        }
    
        // Draw particle effects last
        this.particleEngine.draw(this.ctx);
        this.mobManager.drawEffects(this.ctx);

        this.ctx.restore();

        this.character.drawHealthBar(this.ctx);

        if (this.character.level ) {
            this.character.level.render(this.ctx)
        }
    }

    processSkiBoundary(skiBoundary, mobs, projectiles, characterInserted, entitiesToDraw) {
        // Arrays to hold colliding entities
        let collidingMobs = [];
        let collidingProjectiles = [];
        let collidingCharacter = null;
    
        // Use the couldCollide method of skiBoundary
        // Since sizeX, sizeY, deltaY are zero, we can pass zeros
    
        // Separate colliding mobs
        mobs = mobs.filter(mob => {
            if (skiBoundary.couldCollide(mob.x, mob.y)) {
                collidingMobs.push(mob);
                return false; // Remove from mobs list
            }
            return true;
        });
    
        // Separate colliding projectiles
        projectiles = projectiles.filter(projectile => {
            if (skiBoundary.couldCollide(projectile.x, projectile.y)) {
                collidingProjectiles.push(projectile);
                return false; // Remove from projectiles list
            }
            return true;
        });
    
        // Check if character collides with the skiBoundary
        let characterInsertedDuringBoundary = false;
        if (!characterInserted && skiBoundary.couldCollide(this.character.x, this.character.y)) {
            collidingCharacter = this.character;
            characterInsertedDuringBoundary = true;
        }
    
        // Combine all colliding entities
        let collidingEntities = [...collidingMobs, ...collidingProjectiles];
        if (collidingCharacter) {
            collidingEntities.push(collidingCharacter);
        }
    
        // Split entities into uphill and downhill
        let uphillEntities = [];
        let downhillEntities = [];
    
        for (let entity of collidingEntities) {
            if (skiBoundary.isUphillFrom(entity.x, entity.y)) {
                uphillEntities.push(entity);
            } else {
                downhillEntities.push(entity);
            }
        }
    
        // Sort uphill and downhill entities by y-coordinate
        uphillEntities.sort((a, b) => a.y - b.y);
        downhillEntities.sort((a, b) => a.y - b.y);
    
        // Add uphill entities to draw list
        entitiesToDraw.push(...uphillEntities);
    
        // Draw the skiBoundary
        entitiesToDraw.push(skiBoundary);
    
        // Add downhill entities to draw list
        entitiesToDraw.push(...downhillEntities);
    
        // Update the characterInserted flag
        this.characterInsertedDuringBoundary = characterInsertedDuringBoundary;
    }
    
    
    
}
export default Renderer;