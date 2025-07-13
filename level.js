import { calculateFlyInOut, roundedParallelogram } from './utils.js';


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
const ROTATION_SPEED = 1.0;



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

const titleFlyInTime = 0.7;
const titleDwellTime = 1.5;
const titleFlyOutTime = 0.7;

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
        this.animationDuration = 0.5;
        this.timeSinceComplete = 0;

        this.scores = null;
        this._isComplete = false;
        this._cashTransferComplete = false;
        this.cashTransferEndTime = -1;
        this.totalTransferEndTime = -1;
        this.cashMoveRate = 200;

        this.goalAngle = 0;

        // Create offscreen canvas for title card
        this.titleCanvas = document.createElement('canvas');
        this.titleCanvas.width = this.camera.getCanvasWidth();
        this.titleCanvas.height = 150; // Height enough for title card
        this.titleCtx = this.titleCanvas.getContext('2d');
        this.preRenderTitleCard();
    }

    start() {
        console.log("Level Started", this.name);
        this.startY = this.character.y;
        this.time = 0;
        this.terrainManager.setTreePercentage(this.treePercentage);
        this.terrainManager.setJumpRampPercentage(this.jumpRampPercentage);
        this.numAxeOrcs = this.axeOrcs.length;
        this.numSpearOrcs = this.spearOrcs.length;
        this.preRenderTitleCard();
    }

    isComplete() {
        return this._isComplete;
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

    setGoalAngle(angle) {
        this.goalAngle = angle;
    }

    update(dt) {
        if (this.goalAngle != 0) {
            // Calculate progress through rotation (0 to 1)
            const progress = 1 - (Math.abs(this.goalAngle) / (30 * Math.PI / 180));
            
            // Ease in/out curve using sine
            const ease = Math.min(1, (1 - Math.cos(progress * Math.PI)) / 2);
            const easeInOut = Math.sin(ease * Math.PI / 2);
            
            // Max rotation speed of 0.2, scaled by ease factor
            let rotation = ROTATION_SPEED * dt * Math.sign(this.goalAngle) * (1 - easeInOut);
            
            this.terrainManager.rotateAbout(this.character.x, this.character.y, -rotation);
            this.mobManager.rotateAbout(this.character.x, this.character.y, -rotation);
            this.character.skiPhysics.rotateAbout(this.character.x, this.character.y, -rotation);
            
            if (Math.abs(rotation) + 0.2 > Math.abs(this.goalAngle)) {
                this.goalAngle = 0;
            } else {
                this.goalAngle -= rotation;
            }
        }
        if (!this.isComplete()) {
            this.time += dt;
        } else {
            this.timeSinceComplete += dt;
            if (this.scores && this.timeSinceComplete > 2.5) {
                // Find the top-most non-empty row
                let topRowIndex = this.scores.findIndex(row => row.cash > 0);
                
                if (topRowIndex !== -1 && topRowIndex < this.scores.length - 1) {
                    // Calculate the amount to move
                    let amountToMove = Math.min(this.cashMoveRate * dt, this.scores[topRowIndex].cash);
                    
                    // Move cash from top row to bottom row
                    this.scores[topRowIndex].cash -= amountToMove;
                    this.scores[this.scores.length - 1].cash += amountToMove;
                }
                if (topRowIndex == this.scores.length - 1) {
                    if (this.totalTransferEndTime == -1) {
                        this.totalTransferEndTime = this.timeSinceComplete;
                    }
                    let timeSinceEnd = this.timeSinceComplete - this.totalTransferEndTime;
                    if (timeSinceEnd > 1.5) {
                        let amountToMove = Math.min(this.cashMoveRate * dt, this.scores[topRowIndex].cash);
                        this.scores[topRowIndex].cash -= amountToMove;
                        this.character.medals += amountToMove;
                        if (this.scores[topRowIndex].cash <= 0) {
                            this._cashTransferComplete = true;
                            if (this.cashTransferEndTime == -1) {
                                this.cashTransferEndTime = this.timeSinceComplete;
                            }
                        }
                    }
                }
                if (this._cashTransferComplete && this.timeSinceComplete - this.cashTransferEndTime > 3.0) {
                    this.character.completeLevel();
                }

            }
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

        if (y > this.length && !this.isComplete()) {
            this.mobManager.notifyLevelComplete();
            this.terrainManager.setJumpRampPercentage(0);
            this.terrainManager.setTreePercentage(0.2)
            this.scores = this.getScoreCardData();
            this._isComplete = true;
        }

    }

    getCashForTime() {
        let timeUnderGoal = Math.max(0, this.goalTime - this.time);
        let timeOverGoal = Math.max(0, this.time - this.goalTime);
        let bonus = Math.max(0, Math.round(timeUnderGoal * timeUnderGoal) * this.timeBonusMultiplier);
        let value = Math.max(0, 20 - timeOverGoal) + this.timeMultiplier;
        return Math.max(0, Math.round(bonus + value) * 3);
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
            { title: 'TOTAL', value: '', cash: 0 },
        ];
    }

    render(ctx) {
        if (this.isComplete()) {
            if (!this._cashTransferComplete || this.timeSinceComplete - this.cashTransferEndTime < 1.2) {
                this.renderScoreCard(ctx);
            }
        } else {
            this.renderStatChips(ctx);
        }
    }

    renderScoreCard(ctx) {
        const cardWidth = 400;
        const cardHeight = 300;
        const rowHeight = 22;
        this.ScorePadding = 4;

        // Center the score card on the screen
        const startX = (this.camera.getCanvasWidth() - cardWidth) / 2;
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
        ctx.font = "26px Roboto";
        ctx.textAlign = 'center';
        ctx.fillText(this.name, startX + cardWidth / 2, startY + titleHeight / 2 + 8);

        // Draw rows with animation
        let currentY = startY + 60;
        const scoreData = this.scores;

        scoreData.forEach((item, index) => {
            let rowX = 0;
            if (!this._cashTransferComplete) {
                rowX = calculateFlyInOut(
                    this.camera.getCanvasWidth(),  // start
                    startX,            // dwell
                    startX,        // same as dwell
                    this.animationDuration,
                    100,
                    10,
                    this.timeSinceComplete - 0.1 * index
                );
            } else {
                rowX = calculateFlyInOut(
                    startX,            // start
                    startX,            // dwell
                    -cardWidth,        // out (off-screen to the left)
                    0,
                    0.1 * index,
                    this.animationDuration,
                    this.timeSinceComplete - this.cashTransferEndTime
                );
            }
            let bold = false;
            if (item.title == "TOTAL") {
                currentY += rowHeight * 0.5;
                bold = true;
            }
            this.renderRow(ctx, rowX, currentY, cardWidth, rowHeight, item.title, item.value, '🥇' + Math.round(item.cash), bold);
            currentY += rowHeight + this.ScorePadding;
        });
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
        if (bold) {
            
            ctx.font = '300 22px Oswald';
        } else {
            ctx.font = '300 22px Oswald';
        }
        ctx.fillText(reward, x + width - this.ScorePadding * 2, y + height / 2 + height_fudge);
    }

    renderTitleFlyIn(ctx) {
        let titleX = calculateFlyInOut(
            this.camera.getCanvasWidth(),  // start
            0,                             // dwell
            -this.camera.getCanvasWidth(), // out
            titleFlyInTime,
            titleDwellTime,
            titleFlyOutTime,
            this.time
        );

        // Draw the pre-rendered title card
        ctx.drawImage(this.titleCanvas, titleX, 0);
    }

    renderStatChips(ctx) {

        if (this.time > titleFlyInTime + titleDwellTime + titleFlyOutTime / 2) {

            let x = 10;
            let y = 30;
            // Format time to MM:SS, capping at 59:59
            let minutes = Math.floor(this.time / 60);
            let seconds = Math.floor(this.time % 60);
            let millis = Math.floor((this.time - Math.floor(this.time)) * 100);
            
            if (minutes > 59) {
                minutes = 59;
                seconds = 59;
            }
            
            let formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${millis.toString().padStart(2, '0')}`;
            this.renderStatChip(ctx, x, y, 80, formattedTime);
            y += 30;
            let speed = Math.sqrt(this.character.velocity.x * this.character.velocity.x + this.character.velocity.y * this.character.velocity.y) / 8;
            this.renderStatChip(ctx, x, y, 70, speed.toFixed(0) + ' mph');
            y += 30;
            let distanceRemaining = (this.length - (this.character.y - this.startY) / 10);
            this.renderStatChip(ctx, x, y, 60, distanceRemaining.toFixed(0) + 'ft');
        }

        if (this.time < titleFlyInTime + titleDwellTime + titleFlyOutTime ) {
            this.renderTitleFlyIn(ctx);
        }
    }

    renderStatChip(ctx, x, y, width, str) {
        // Calculate dimensions
        const height = 20;
        const skew = Math.tan(10 * Math.PI / 180) * height;
        const cornerRadius = 4;
        
        roundedParallelogram(ctx, x, y, width, height, skew, cornerRadius);

        // Set styles
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'darkblue';
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();

        // Add text
        ctx.fillStyle = 'darkblue';
        ctx.font = '14px Roboto';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(str, x + width / 2, y + height / 2 + 1);
        ctx.textBaseline = 'alphabetic';
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

    preRenderTitleCard() {
        const height = 100;
        const skew = Math.tan(10 * Math.PI / 180) * height;
        const cornerRadius = 7;
        const padding = 5;
        const width = this.camera.getCanvasWidth() - 3 * padding - skew;

        const ctx = this.titleCtx;
        ctx.save();
        ctx.translate(padding, 25);
        
        // Draw the parallelogram background
        roundedParallelogram(ctx, 0, 0, width, height, skew, cornerRadius);
        ctx.fillStyle = this.getDifficultyColor();
        ctx.fill();

        // Create gradient for the fade effect
        let gradient = ctx.createLinearGradient(padding + skew, 0, width, 0);
        gradient.addColorStop(0, this.getDifficultyColor());
        gradient.addColorStop(1, 'white');

        // Draw the fading rectangle
        ctx.fillStyle = gradient;
        ctx.fillRect(padding + skew, 36, width - padding - 5, 3);
        
        // Draw text elements
        ctx.font = "30px Roboto";
        ctx.fillStyle = "white";
        ctx.textAlign = "left";
        ctx.fillText(this.name, padding + skew + 16, 32);

        const goalTimeString = `Time to Beat: ${Math.floor(this.goalTime)}:${(this.goalTime % 1).toFixed(2).slice(2)}s`;
        const distanceString = 'Run Length: ' + this.length.toFixed(0) + 'ft';
        ctx.font = "16px Roboto";
        const y_start = 58;
        const y_gap = 20;
        ctx.fillText(goalTimeString, padding + skew + 16, y_start);
        ctx.fillText(distanceString, padding + skew + 16, y_start + y_gap);

        // Draw mob boxes
        const mobBoxSize = 20;
        const mobBoxSmallSize = 10;
        const mobBoxPadding = 3;
        const mobBoxStartX = width - 30;
        const mobBoxStartY = 47;
        let i = 0;
        
        for (let j = 0; j < this.numAxeOrcs; j++) {
            ctx.fillStyle = 'white';
            ctx.fillRect(mobBoxStartX - (mobBoxSize + mobBoxPadding) * i, mobBoxStartY, mobBoxSize, mobBoxSize);
            ctx.fillStyle = 'orange';
            ctx.fillRect(mobBoxStartX - (mobBoxSize + mobBoxPadding) * i, mobBoxStartY, mobBoxSmallSize, mobBoxSmallSize);
            i++;
        }
        
        for (let j = 0; j < this.numSpearOrcs; j++) {
            ctx.fillStyle = 'white';
            ctx.fillRect(mobBoxStartX - (mobBoxSize + mobBoxPadding) * i, mobBoxStartY, mobBoxSize, mobBoxSize);
            ctx.fillStyle = 'black';
            ctx.fillRect(mobBoxStartX - (mobBoxSize + mobBoxPadding) * i, mobBoxStartY, mobBoxSmallSize, mobBoxSmallSize);
            i++;
        }

        ctx.restore();
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
