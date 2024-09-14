class Renderer {
    constructor(ctx, character, treeManager, particleEngine, mobManager) {
        this.ctx = ctx;
        this.character = character;
        this.treeManager = treeManager;
        this.particleEngine = particleEngine;
        this.mobManager = mobManager;
    }

    render() {
        const character_index = this.treeManager._findInsertIndex(this.character.y + this.character.height / 2);
        this.character.drawTrail(this.ctx);
        this.character.drawShadow(this.ctx);

        this.mobManager.draw(this.ctx);

        for (let i = 0; i < character_index; i++) {
            this.treeManager.entities[i].draw(this.ctx);
        }
        this.particleEngine.draw(this.ctx);
        this.character.draw(this.ctx);
        for (let i = character_index; i < this.treeManager.entities.length; i++) {
            this.treeManager.entities[i].draw(this.ctx);
        }

    }
}
export default Renderer;