const LevelDifficulty  = {
    GREEN_CIRCLE: 0,
    BLUE_SQUARE: 1,
    BLACK_DIAMOND: 2,
    DOUBLE_BLACK_DIAMOND: 3,
    TRIPLE_BLACK_DIAMOND: 4,
    SKULL: 5,
}
export class Level {
    constructor(length, goalTime, terrainManager, MobManager, camera, character) {
        this.terrainManager = terrainManager;
        this.mobManager = MobManager;
        this.camera = camera;
        this.character = character;
        this.length = length;
        this.goalTime = goalTime;
        this.LevelDifficulty = LevelDifficulty.GREEN_CIRCLE;
        this.yPerGoblin = 300;
        this.axeOrcs = [];
        this.spearOrcs = [];

        this.lastGoblinSpawn = 0;
        this.startY = 0;
        this.endingPlaced = false;

        this.endGuideHeight = 80;
        this.endGuideStart = this.length - this.endGuideHeight;
    }

    start() {
        this.startY = this.character.y;
        this.time = 0;
    }

    isComplete() {
        return (this.character.y - this.startY) / 10 > this.length;
    }

    update(dt) {
        this.time += dt;
        let y = (this.character.y - this.startY) / 10;
        if (y - this.lastGoblinSpawn > this.yPerGoblin) {
            this.lastGoblinSpawn = y;
            this.mobManager.spawnGoblin();
        }
        if (this.axeOrcs.length > 0 && y > this.axeOrcs[0]) {
            this.mobManager.spawnAxeOrc();
            this.axeOrcs.shift();
        }
        if (this.spearOrcs.length > 0 && y > this.spearOrcs[0]) {
            this.mobManager.spawnSpearOrc();
            this.spearOrcs.shift();
        }
        if ((this.camera.bottomOfScreen() - this.startY) / 10 > this.endGuideStart && !this.endingPlaced) {
            let bottom = this.camera.bottomOfScreen()
            let left = this.camera.leftOfScreen()
            let right = this.camera.rightOfScreen()
            let center = (left + right) / 2;
            this.terrainManager.addSkierBoundary(left - 50, bottom, center - 100, this.startY + this.length * 10);
            this.terrainManager.addSkierBoundary(right + 50, bottom, center + 100, this.startY + this.length * 10);
            this.endingPlaced = true;
        }
        if (y > this.length) {
            console.log("Level Complete");
            console.log("time", this.time);
            
        }
    }
}

export class GreenCircle extends Level {
    constructor(terrainManager, MobManager, camera, character) {
        super(1200, 25, terrainManager, MobManager, camera, character);
        this.LevelDifficulty = LevelDifficulty.GREEN_CIRCLE;
        this.terrainManager.setTreePercentage(0.5);
        this.terrainManager.setJumpRampPercentage(0.5);
        this.yPerGoblin = 50;

        const spawnYs = [100, 300, 400, 600];
        for (let y of spawnYs) {
            if (Math.random() < 0.5) {
                this.axeOrcs.push(y);
            } else {
                this.spearOrcs.push(y);
            }
        }
    }
}

export class BlueSquareSnowBoarder extends Level {
    constructor(terrainManager, MobManager, camera, character) {
        super(2000, 30, terrainManager, MobManager, camera, character);
        this.LevelDifficulty = LevelDifficulty.BLUE_SQUARE;
        this.terrainManager.setTreePercentage(1.0);
        this.terrainManager.setJumpRampPercentage(1.0);
        this.yPerGoblin = 20;

        const spawnYs = [100, 120, 125, 137, 500, 520];
        for (let y of spawnYs) {
            this.axeOrcs.push(y);
        }
    }
}

export default Level;