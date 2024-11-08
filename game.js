import { augmentCtx } from './utils.js';
import VirtualJoystick from './joystick.js';
import Character from './character.js';
import { Camera } from './camera.js';
import ParticleEngine from './particle_engine.js';
import TerrainManager from './terrain.js';
import Renderer from './renderer.js';
import MobManager from './mob.js';
import Shop from './shop.js';
import { GreenCircle, BlueSquareSnowBoarder, JumpLand, DoubleBlackDiamondSnowBoarder, getThreeLevels, LevelDifficulty, BlueSquareSpearOrks, BlackDiamond} from './level.js';
import { getItemsForSale } from './equipment.js';
import { Sword, Sword2, Pistol, SpeedJacket } from './equipment.js';
import OrkModel from './ork_model.js';
import GoblinModel from './goblin_model.js';
import TrollModel from './troll_model.js';

window.addEventListener('load', function () {
    // Wait for the #shopSvg to load before initializing the game
    const svgObject = document.getElementById('shopSvg');
    if (svgObject.contentDocument) {
        // If already loaded, initialize the shop
        console.log("already loaded");
        initializeGame();
    } else {
        console.log("not loaded yet");
        // Wait for the SVG to load and then initialize the shop
        svgObject.addEventListener('load', () => {
            console.log("loaded now: loaded");
            initializeGame();
        });
    }

});
    

async function initializeGame() {
    let canvas = document.getElementById('gameCanvas');
    let camera = new Camera(canvas);
    let ctx = canvas.getContext('2d');
    //augmentCtx(ctx);
    let lastTime = 0; // For delta time calculation
    let gameTime = 0; // Total time elapsed since start

    let joystick = new VirtualJoystick(canvas);
    let particleEngine = new ParticleEngine(1000);
    let treeManager = new TerrainManager(canvas);
    let character = new Character(100, 100, particleEngine, treeManager, joystick, camera);
    camera.setCharacter(character);
    let orkModel = new OrkModel();
    let goblinModel = new GoblinModel();
    let trollModel = new TrollModel();

    treeManager.setCamera(camera);
    let mobManager = new MobManager(character, treeManager, particleEngine, camera);
    character.mobManager = mobManager;
    let renderer = new Renderer(ctx, character, treeManager, particleEngine, mobManager, camera);


    let shop = new Shop(character, ctx, canvas, camera);
    const svgObject = document.getElementById('shopSvg');
    svgObject.contentDocument.documentElement.style.display = 'none';



    //character.equip(Sword, "left_hand");
    //character.equip(Pistol, "right_hand");

    // Fetch the SVG outside the update loop
    (async () => {
        try {
            //svgText = await fetchSVG('images/character.svg');
            //console.log('SVG loaded successfully');
        } catch (error) {
            console.error('Error loading SVG:', error.message);
        }
    })();

    function resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
    
        // Get the CSS size of the canvas (how it appears on the page)
        const rect = {
            width: window.innerWidth,
            height: window.innerHeight
        };
    
        // Adjust the canvas width and height to match the device pixel ratio
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
    
        console.log("dpr is ", dpr);
        // Scale the canvas context to match the device pixel ratio
        ctx.scale(dpr, dpr);
    
        // Set CSS dimensions to maintain the correct visual size (CSS pixels)
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;

        camera.setCanvasSize(rect.width, rect.height);
    
        // Adjust character's position based on the new canvas size
        character.x = rect.width / 2;
        character.y = rect.height / 4;
    }

    // resetOnFocus
    window.onfocus = function() {
        lastTime = performance.now();
    }

    let level1 = new BlueSquareSpearOrks(treeManager, mobManager, camera, character);
    let level2 = new BlueSquareSnowBoarder(treeManager, mobManager, camera, character);
    let level3 = new GreenCircle(treeManager, mobManager, camera, character);
    let level4 = new BlackDiamond(treeManager, mobManager, camera, character);
    character.update(0.01, ctx);
    camera.update(0.01);


    treeManager.setGetLevelsCallback(() => {
        let randomLevels = getThreeLevels(LevelDifficulty.BLUE_SQUARE);
        return [
            new randomLevels[0](treeManager, mobManager, camera, character),
            new randomLevels[1](treeManager, mobManager, camera, character),
            new randomLevels[2](treeManager, mobManager, camera, character)
        ]
    });

    let level = undefined;

    //character.level = level2;
    //character.level.start();

    treeManager.addLevelSelect(level1, level2, level3);

    


    function update(time) {


        let dt = (time - lastTime) / 1000.0;
        dt = Math.min(dt, 0.050);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#F4F4F8"
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Game Not Paused:
        gameTime += dt;

        if (character.completedLevels >= shop.levelsTillNextShop()) { 
            shop.update(dt);
            shop.draw(ctx);
        } else {

            character.update(dt, ctx);
            camera.update(dt);
            particleEngine.update(dt);
            treeManager.update(dt, character, ctx);
            mobManager.update(dt);

            renderer.render();
        
            joystick.draw(ctx);
        }
        lastTime = time;

        requestAnimationFrame(update);
    }

    // Resize the canvas to fill browser window dynamically
    window.addEventListener('resize', resizeCanvas, false);

    // Initial call to set the canvas size correctly and start the update loop
    resizeCanvas();

    const equipment = getItemsForSale(character);
    await Promise.all(equipment.map(item => item.loadImage()));

    // Start the game loop only after all images are loaded
    requestAnimationFrame(update);
}
