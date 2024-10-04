export const LevelDifficulty  = {
    GREEN_CIRCLE: 0,
    BLUE_SQUARE: 1,
    BLACK_DIAMOND: 2,
    DOUBLE_BLACK_DIAMOND: 3,
    TRIPLE_BLACK_DIAMOND: 4,
    SKULL: 5,
}



// Arrays for first and second halves based on difficulty
const firstHalves = [
  ["Bunny’s", "Goblin’s", "Snowbloom", "Baby’s", "Meadow", "Whispering", "Frosty", "Bright", "Glimmer", "Sunlit"],  // Easy
  ["Icefall", "Wyvern’s", "Elven", "Crystal", "Valkyrie’s", "Blizzard", "Phantom", "Shadowspire", "Glacier", "Serpent’s"], // Medium
  ["Frostfang", "Hydra’s", "Titan’s", "Stormcaller", "Howling Wind", "Sorcerer’s", "Thunderpeak", "Direwolf’s", "Chimera’s", "Draugr’s"], // black
  ["Death’s", "Doomcaller’s", "Hellfire", "Dragon’s", "Wraith’s", "Frostbite", "Abyss", "Bloodfrost", "Vortex", "Voidcaller’s"], // double black
  ["Glorkak's", "Grimhorn's", "Dreadmaw's", "Nightshade's", "Fenris's", "Frostgiant's", "Certain Death", "Dragonlord's", "Run Ender", "Doomlord's"] // triple black
];

const secondHalves = [
  ["Slope", "Run", "Hills", "Trail", "Valley", "Loop", "Path", "Bend", "Slide", "Glade"],  // green
  ["Ridge", "Slalom", "Pass", "Hollow", "Traverse", "Way", "Cavern", "Glade", "Crest", "Chute"], // blue
  ["Peak", "Drop", "Summit", "Gorge", "Ravine", "Descent", "Cliff", "Icefall", "Chasm", "Breaker"], // black
  ["Abyss", "Doom", "Chasm", "Plunge", "Oblivion", "Death", "Vortex", "Cliffside", "Doomfall", "Devour", "Grave"], // double black
  [
    "Nightmare", "Inferno", "Annihilation", "Cataclysm", "Apocalypse", 
    "Torment", "Decimation", "Obliteration", "Purgatory", "Damnation",
    "Hellscape", "Armageddon", "Catastrophe", "Devastation", "Reckoning", "Cairn"] // doubel black
];

// Function to generate ski run name based on difficulty
function generateSkiRunName(difficulty) {
  // Pick the difficulty range (include one level away)
  const minDiff = Math.max(difficulty - 1, 0);
  const maxDiff = Math.min(difficulty + 1, 3);
  
  // Randomly choose a difficulty within the allowed range
  const chosenFirstLevel = Math.floor(Math.random() * (maxDiff - minDiff + 1)) + minDiff;
  const chosenSecondLevel = Math.floor(Math.random() * (maxDiff - minDiff + 1)) + minDiff;
  
  // Pick a random first half and second half based on chosen difficulty
  const firstHalf = firstHalves[chosenFirstLevel][Math.floor(Math.random() * firstHalves[chosenFirstLevel].length)];
  const secondHalf = secondHalves[chosenSecondLevel][Math.floor(Math.random() * secondHalves[chosenSecondLevel].length)];
  
  return `${firstHalf} ${secondHalf}`;
}

export class Level {
    constructor(length, goalTime, terrainManager, MobManager, camera, character, difficulty) {
        this.terrainManager = terrainManager;
        this.mobManager = MobManager;
        this.camera = camera;
        this.character = character;
        this.length = length;
        this.goalTime = goalTime;
        this.LevelDifficulty = difficulty;
        this.yPerGoblin = 300;
        this.axeOrcs = [];
        this.spearOrcs = [];
        this.name = generateSkiRunName(difficulty);

        this.treePercentage = 1;
        this.jumpRampPercentage = 1;

        this.lastGoblinSpawn = 0;
        this.startY = 0;
        this.endingPlaced = false;

        this.endGuideHeight = 80;
        this.endGuideStart = this.length - this.endGuideHeight;
        this.signImages = {
            [LevelDifficulty.GREEN_CIRCLE]: new Image(),
            [LevelDifficulty.BLUE_SQUARE]: new Image(),
            [LevelDifficulty.BLACK_DIAMOND]: new Image(),
            [LevelDifficulty.DOUBLE_BLACK_DIAMOND]: new Image(),
            [LevelDifficulty.TRIPLE_BLACK_DIAMOND]: new Image(),
            [LevelDifficulty.SKULL]: new Image(),
        };
        this.signImages[LevelDifficulty.GREEN_CIRCLE].src = "images/sign_green_circle.svg";
        this.signImages[LevelDifficulty.BLUE_SQUARE].src = "images/sign_blue_square.svg";
        this.signImages[LevelDifficulty.BLACK_DIAMOND].src = "images/sign_black_diamond.svg";
        this.signImages[LevelDifficulty.DOUBLE_BLACK_DIAMOND].src = "images/sign_double_black_diamond.svg";
        this.signImages[LevelDifficulty.TRIPLE_BLACK_DIAMOND].src = "images/sign_triple_black_diamond.svg";
        this.signImages[LevelDifficulty.SKULL].src = "images/sign_skull.svg";
    }

    start() {
        console.log("Level Started", this.name);
        this.startY = this.character.y;
        this.time = 0;
        this.terrainManager.setTreePercentage(this.treePercentage);
        this.terrainManager.setJumpRampPercentage(this.jumpRampPercentage);
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
            this.mobManager.notifyLevelComplete();
        }
    }
}

export class GreenCircle extends Level {
    constructor(terrainManager, MobManager, camera, character) {
        super(1200, 25, terrainManager, MobManager, camera, character, LevelDifficulty.GREEN_CIRCLE);
        this.treePercentage = 0.5;
        this.jumpRampPercentage = 0.5;
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

export class JumpLand extends Level {
    constructor(terrainManager, MobManager, camera, character) {
        super(1200, 25, terrainManager, MobManager, camera, character, LevelDifficulty.GREEN_CIRCLE);
        this.treePercentage = 0.2;
        this.jumpRampPercentage = 1.2;
        this.yPerGoblin = 50;

    }
}

export class BabyGoblins extends Level {
    constructor(terrainManager, MobManager, camera, character) {
        super(1200, 25, terrainManager, MobManager, camera, character, LevelDifficulty.GREEN_CIRCLE);
        this.treePercentage = 0.2;
        this.jumpRampPercentage = 0.3;
        this.yPerGoblin = 150;
    }
}


export class BlueSquare extends Level {
    constructor(terrainManager, MobManager, camera, character) {
        super(1200, 25, terrainManager, MobManager, camera, character, LevelDifficulty.BLUE_SQUARE);
        this.treePercentage = 0.5;
        this.jumpRampPercentage = 0.5;
        this.yPerGoblin = 50;

        const spawnYs = [100,120, 300, 400,440,445, 600];
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
        super(2000, 30, terrainManager, MobManager, camera, character, LevelDifficulty.BLUE_SQUARE);

        this.treePercentage = 1.0;
        this.jumpRampPercentage = 1.0;
        this.yPerGoblin = 20;

        const spawnYs = [100, 120, 125, 137, 500, 520];
        for (let y of spawnYs) {
            this.axeOrcs.push(y);
        }
    }
}


export class BlueSquareSpearOrks extends Level {
    constructor(terrainManager, MobManager, camera, character) {
        super(2000, 30, terrainManager, MobManager, camera, character, LevelDifficulty.BLUE_SQUARE);

        this.treePercentage = 1.0;
        this.jumpRampPercentage = 1.0;
        this.yPerGoblin = 20;

        const spawnYs = [100, 110, 500, 520];
        for (let y of spawnYs) {
            this.spearOrcs.push(y);
        }
    }
}


export class BlackDiamond extends Level {
    constructor(terrainManager, MobManager, camera, character) {
        super(1200, 25, terrainManager, MobManager, camera, character, LevelDifficulty.BLACK_DIAMOND);
        this.treePercentage = 1;
        this.jumpRampPercentage = 0.5;
        this.yPerGoblin = 20;

        const spawnYs = [100,110,111, 300,320,330, 400, 450, 600];
        for (let y of spawnYs) {
            if (Math.random() < 0.5) {
                this.axeOrcs.push(y);
            } else {
                this.spearOrcs.push(y);
            }
        }
    }
}

export class DoubleBlackDiamondSnowBoarder extends Level {
    constructor(terrainManager, MobManager, camera, character) {
        super(2000, 30, terrainManager, MobManager, camera, character, LevelDifficulty.DOUBLE_BLACK_DIAMOND);

        this.treePercentage = 2.0;
        this.jumpRampPercentage = 0.4;
        this.yPerGoblin = 20;

        const spawnYs = [100,100, 120,120, 125,135, 137,137, 500,500, 520, 520];
        for (let y of spawnYs) {
            this.axeOrcs.push(y);
        }
    }
}

const LevelsByDifficulty = new Map([
    [LevelDifficulty.GREEN_CIRCLE, [GreenCircle, BabyGoblins, JumpLand]],
    [LevelDifficulty.BLUE_SQUARE, [BlueSquare, BlueSquareSnowBoarder, BlueSquareSpearOrks]],
    [LevelDifficulty.BLACK_DIAMOND, [BlackDiamond]],
    [LevelDifficulty.DOUBLE_BLACK_DIAMOND, [DoubleBlackDiamondSnowBoarder]],
    [LevelDifficulty.TRIPLE_BLACK_DIAMOND, [DoubleBlackDiamondSnowBoarder]]
]);

export function getRandomLevel(difficulty) {
    const levels = LevelsByDifficulty.get(difficulty);
    return new levels[Math.floor(Math.random() * levels.length)](terrainManager, MobManager, camera, character);
}

export function getThreeLevels(difficulty) {
    const levels = [];
    const difficulties = Array.from(LevelsByDifficulty.keys());
    const currentIndex = difficulties.indexOf(difficulty);

    for (let i = 0; i < 3; i++) {
        let selectedDifficulty;
        const rand = Math.random();

        if (rand < 0.7) {
            selectedDifficulty = difficulty;
        } else if (rand < 0.85 && currentIndex > 0) {
            selectedDifficulty = difficulties[currentIndex - 1];
        } else if (currentIndex < difficulties.length - 1) {
            selectedDifficulty = difficulties[currentIndex + 1];
        } else {
            selectedDifficulty = difficulty;
        }

        const availableLevels = LevelsByDifficulty.get(selectedDifficulty);
        const RandomLevel = availableLevels[Math.floor(Math.random() * availableLevels.length)];
        levels.push(RandomLevel);
    }

    return levels;
}

export default Level;