class Renderer {
    constructor(ctx, character, treeManager, particleEngine, mobManager) {
        this.ctx = ctx;
        this.character = character;
        this.treeManager = treeManager;
        this.particleEngine = particleEngine;
        this.mobManager = mobManager;
    }

    render() {
        // Draw ground effects first
        this.character.drawTrail(this.ctx);
        this.character.drawShadow(this.ctx);
        this.mobManager.drawUnderMob(this.ctx);
        this.mobManager.drawUnderProjectile(this.ctx);
    
        let i = 0; // Index for trees
        let j = 0; // Index for mobs
        let k = 0; // Index for projectiles

        let trees = this.treeManager.entities;
        let mobs = this.mobManager.mobs;
        let projectiles = this.mobManager.projectiles;
        let characterInserted = false;
        const entitiesToDraw = [];
    
        while (i < trees.length || j < mobs.length || k < projectiles.length || !characterInserted) {
            let treeY = (i < trees.length) ? trees[i].y : Infinity;
            let mobY = (j < mobs.length) ? mobs[j].y : Infinity;
            let projectileY = (k < projectiles.length) ? projectiles[k].y : Infinity;
            let characterY = (!characterInserted) ? this.character.y : Infinity;
    
            // Determine the smallest y-value
            let minY = Math.min(treeY, mobY, projectileY, characterY);
    
            if (minY === treeY) {
                entitiesToDraw.push(trees[i]);
                i++;
            } else if (minY === mobY) {
                entitiesToDraw.push(mobs[j]);
                j++;
            } else if (minY === projectileY) {
                entitiesToDraw.push(projectiles[k]);
                k++;
            } else if (minY === characterY) {
                entitiesToDraw.push(this.character);
                characterInserted = true;
            } else {
                // Prevent infinite loop by breaking if no condition is met
                console.error("No matching condition found. Breaking the loop to prevent infinite iteration.");
                break;
            }
        }
    
        // Draw all entities in the merged array
        for (let entity of entitiesToDraw) {
            entity.draw(this.ctx);
        }
    
        // Draw particle effects last
        this.particleEngine.draw(this.ctx);
    }
    
}
export default Renderer;