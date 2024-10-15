export const LevelDifficulty  = {
    GREEN_CIRCLE: 0,
    BLUE_SQUARE: 1,
    BLACK_DIAMOND: 2,
    DOUBLE_BLACK_DIAMOND: 3,
    TRIPLE_BLACK_DIAMOND: 4,
    SKULL: 5,
}

export const LevelDifficultyNames = [
    "GREEN CIRCLE",
    "BLUE SQUARE",
    "BLACK DIAMOND",
    "DOUBLE BLACK DIAMOND",
    "TRIPLE BLACK DIAMOND",
    "SKULL",
]

export const GREEN = "#008c55";
export const BLUE = "#0069ac";
export const BLACK = "#000000";




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
    constructor(length, targetSpeed, terrainManager, MobManager, camera, character, difficulty) {
        this.terrainManager = terrainManager;
        this.mobManager = MobManager;
        this.camera = camera;
        this.character = character;
        this.length = length;
        this.goalTime = length / targetSpeed;
        this.LevelDifficulty = difficulty;
        this.yPerGoblin = 300;
        this.axeOrcs = [];
        this.spearOrcs = [];
        this.name = generateSkiRunName(difficulty);

        this.goblinsKilled = 0;
        this.enemiesKilled = 0;
        this.airTime = 0;

        this.cashPerGoblin = 1;
        this.cashPerEnemy = 15;
        this.timeMultiplier = 1;
        this.timeBonusMultiplier = 3;

        this.airMultiplier = 4;

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

        // Calculate animation progress
        this.animationDuration = 1; // ms
        this.timeSinceComplete = 0;
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

    goblinKilled() {
        if (!this.isComplete()) {
            this.goblinsKilled++;
        }
    }

    enemyKilled() {
        if (!this.isComplete()) {
            this.enemiesKilled++;
        }
    }

    update(dt) {
        if (!this.isComplete()) {
            this.time += dt;
        } else {
            this.timeSinceComplete += dt;
        }
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
            this.mobManager.notifyLevelComplete();
            this.terrainManager.setJumpRampPercentage(0);
            this.terrainManager.setTreePercentage(0.2)
            this.timeComplete = this.time;
        }
    }

    getCashForTime() {
        let timeUnderGoal = Math.max(0, this.goalTime - this.time);
        let timeOverGoal = Math.max(0, this.time - this.goalTime);
        let bonus = Math.max(0, Math.round(timeUnderGoal * timeUnderGoal) * this.timeBonusMultiplier);
        let value = Math.max(0, 20 - timeOverGoal) + this.timeMultiplier;
        return Math.max(0, Math.round(bonus + value));
    }

    getCashForAirTime() {
        return Math.max(0, Math.round(this.airTime) * this.airMultiplier);
    }
    getCashForLevelDifficulty() {
        switch (this.LevelDifficulty) {
            case LevelDifficulty.GREEN_CIRCLE:
                return 5;
            case LevelDifficulty.BLUE_SQUARE:
                return 20;
            case LevelDifficulty.BLACK_DIAMOND:
                return 50;
            case LevelDifficulty.DOUBLE_BLACK_DIAMOND:
                return 100;
            case LevelDifficulty.TRIPLE_BLACK_DIAMOND:
                return 200;
            case LevelDifficulty.SKULL:
                return 500;
        }
    }

    getScoreCardData() {
        return [
            { title: 'TIME', value: this.time.toFixed(2) + 's', cash: this.getCashForTime() },
            { title: LevelDifficultyNames[this.LevelDifficulty], value:  "", cash: this.getCashForLevelDifficulty() },
            { title: 'GOBLIN KILLS', value: this.goblinsKilled, cash: this.cashPerGoblin * this.goblinsKilled },
            { title: 'ENEMY KILLS', value: this.enemiesKilled, cash: this.cashPerEnemy * this.enemiesKilled },
            { title: 'AIRTIME', value: this.airTime.toFixed(2) + 's', cash: this.getCashForAirTime() },
        ];
    }

    renderScoreCard(ctx) {
        const cardWidth = 400;
        const cardHeight = 300;
        const rowHeight = 22;
        this.ScorePadding = 4;

        // Center the score card on the screen
        const startX = (ctx.canvas.width - cardWidth) / 2;
        const startY = 70;

        // Draw background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(startX, startY, cardWidth, cardHeight);

        // Draw title rectangle
        const titleHeight = 40;
        
        ctx.fillStyle = this.getDifficultyColor();
        ctx.fillRect(startX, startY, cardWidth, titleHeight);

        // Draw title text
        ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
        ctx.font = "26px 'Roboto'";
        ctx.textAlign = 'center';
        ctx.fillText(this.name, startX + cardWidth / 2, startY + titleHeight / 2 + 8);

        // Draw rows with animation
        let currentY = startY + 60;
        const scoreData = this.getScoreCardData();
        let totalCash = 0;

        const elapsedTime = this.timeSinceComplete;
        const progress = Math.min(elapsedTime / this.animationDuration, 1);

        scoreData.forEach((item, index) => {
            const rowProgress = Math.min((progress * (scoreData.length + 1) - index * 0.75), 1);
            const rowX = startX + cardWidth * (1 - rowProgress);
            this.renderRow(ctx, rowX, currentY, cardWidth, rowHeight, item.title, item.value, '$' + item.cash, false);
            currentY += rowHeight + this.ScorePadding;
            totalCash += item.cash;
        });

        // Render total row with animation
        currentY += rowHeight * 0.5;
        const totalRowProgress = Math.min((progress * (scoreData.length + 1) - scoreData.length), 1);
        const totalRowX = startX + cardWidth * (1 - totalRowProgress);
        this.renderRow(ctx, totalRowX, currentY, cardWidth, rowHeight, 'TOTAL', '', '$' + totalCash, true);
    }

    renderRow(ctx, x, y, width, height, topic, value, reward, bold) {
        // Draw row background
        ctx.fillStyle = 'rgba(240, 240, 240, 0.8)';
        ctx.fillRect(x + this.ScorePadding, y, width - 2 * this.ScorePadding, height);

        // Draw orange square for icon
        if (bold) {
            ctx.fillStyle = 'green';
        } else {
            ctx.fillStyle = 'orange';
        }
        ctx.fillRect(x + this.ScorePadding, y, height, height);

        // Draw topic and value
        ctx.fillStyle = 'black';
        if (bold) {
            ctx.font = "22px Roboto, sans-serif";
        } else {
            ctx.font = "normal 100 22px Roboto, sans-serif";
        }
        ctx.textAlign = 'left';
        let height_fudge = 8;
        ctx.fillText(topic + ': ' + value, x + height + this.ScorePadding * 2, y + height / 2 + height_fudge);

        // Draw reward
        ctx.textAlign = 'right';
        ctx.fillText(reward, x + width - this.ScorePadding * 2, y + height / 2 + height_fudge);
    }

    getDifficultyColor() {
        switch (this.LevelDifficulty) {
            case LevelDifficulty.GREEN_CIRCLE:
                return GREEN;
            case LevelDifficulty.BLUE_SQUARE:
                return BLUE;
            case LevelDifficulty.BLACK_DIAMOND:
            case LevelDifficulty.DOUBLE_BLACK_DIAMOND:
            case LevelDifficulty.TRIPLE_BLACK_DIAMOND:
            case LevelDifficulty.SKULL:
                return BLACK;
            default:
                return BLACK;
        }
    }
}

export class GreenCircle extends Level {
    constructor(terrainManager, MobManager, camera, character) {
        super(2000, 60, terrainManager, MobManager, camera, character, LevelDifficulty.GREEN_CIRCLE);
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
        super(2000, 60, terrainManager, MobManager, camera, character, LevelDifficulty.GREEN_CIRCLE);
        this.treePercentage = 0.2;
        this.jumpRampPercentage = 1.2;
        this.yPerGoblin = 50;

    }
}

export class BabyGoblins extends Level {
    constructor(terrainManager, MobManager, camera, character) {
        super(1200, 60, terrainManager, MobManager, camera, character, LevelDifficulty.GREEN_CIRCLE);
        this.treePercentage = 0.2;
        this.jumpRampPercentage = 0.3;
        this.yPerGoblin = 150;
    }
}


export class BlueSquare extends Level {
    constructor(terrainManager, MobManager, camera, character) {
        super(2000, 60, terrainManager, MobManager, camera, character, LevelDifficulty.BLUE_SQUARE);
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
        super(2000, 60, terrainManager, MobManager, camera, character, LevelDifficulty.BLUE_SQUARE);

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
        super(2000, 60, terrainManager, MobManager, camera, character, LevelDifficulty.BLUE_SQUARE);

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
        super(2000, 60, terrainManager, MobManager, camera, character, LevelDifficulty.BLACK_DIAMOND);
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
        super(2000, 60, terrainManager, MobManager, camera, character, LevelDifficulty.DOUBLE_BLACK_DIAMOND);

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