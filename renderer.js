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
    
        // Prepare arrays and indices for merging
        let mobs = this.mobManager.mobs;            // Sorted by y
        let trees = this.treeManager.entities;      // Sorted by y
        let character = this.character;             // The character entity
    
        let i = 0; // Index for trees
        let j = 0; // Index for mobs
    
        let entitiesToDraw = []; // Merged array of entities
        let characterInserted = false; // Flag to check if character has been inserted
    
        // Merge the arrays while maintaining the sort order
        while (i < trees.length || j < mobs.length || !characterInserted) {
            let treeY = (i < trees.length) ? trees[i].y : Infinity;
            let mobY = (j < mobs.length) ? mobs[j].y : Infinity;
            let characterY = (!characterInserted) ? character.y : Infinity;
    
            // Compare y-values and push the entity with the smallest y-value
            if (treeY <= mobY && treeY <= characterY) {
                entitiesToDraw.push(trees[i]);
                i++;
            } else if (mobY <= treeY && mobY <= characterY) {
                entitiesToDraw.push(mobs[j]);
                j++;
            } else {
                entitiesToDraw.push(character);
                characterInserted = true;
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