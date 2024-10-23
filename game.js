import { fetchSVG, interpolateSVG, svgToImage } from './svg_interpolation.js';
import VirtualJoystick from './joystick.js';
import Character from './character.js';
import { Camera } from './camera.js';
import ParticleEngine from './particle_engine.js';
import TerrainManager from './terrain.js';
import Renderer from './renderer.js';
import MobManager from './mob.js';
import Shop from './shop.js';
import { GreenCircle, BlueSquareSnowBoarder, JumpLand, DoubleBlackDiamondSnowBoarder, getThreeLevels, LevelDifficulty, BlueSquareSpearOrks } from './level.js';
import { Sword, Gun, LaserGun, miniGun, Pistol } from './weapons.js';
import { getItemsForSale } from './equipment.js';

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
    let ctx = canvas.getContext('2d');
    let lastTime = 0; // For delta time calculation
    let gameTime = 0; // Total time elapsed since start

    let joystick = new VirtualJoystick(canvas);
    let particleEngine = new ParticleEngine(1000);
    let treeManager = new TerrainManager(canvas);
    let character = new Character(100, 100, particleEngine, treeManager, joystick);
    let camera = new Camera(canvas, character);
    treeManager.setCamera(camera);
    let mobManager = new MobManager(character, treeManager, particleEngine, camera);
    let renderer = new Renderer(ctx, character, treeManager, particleEngine, mobManager, camera);

    let sword = new Sword(character, mobManager);
    let gun = new Gun(character, mobManager);
    let laserGun = new LaserGun(character, mobManager);
    let pistol = new Pistol(character, mobManager);

    let shop = new Shop(character, ctx, canvas);
    const svgObject = document.getElementById('shopSvg');
    svgObject.contentDocument.documentElement.style.display = 'none';


    character.equipRightHand(sword);

    let svgText;
    let characterImg;

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
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        character.x = canvas.width / 2;
        character.y = canvas.height / 4;
    }

    // resetOnFocus
    window.onfocus = function() {
        lastTime = performance.now();
    }

    let level1 = new BlueSquareSpearOrks(treeManager, mobManager, camera, character);
    let level2 = new BlueSquareSnowBoarder(treeManager, mobManager, camera, character);
    let level3 = new DoubleBlackDiamondSnowBoarder(treeManager, mobManager, camera, character);
    character.update(0.01, ctx);
    camera.update(0.01);
    //treeManager.addLevelSelect(level1, level2, level3);
    //level1.start();
    //level1.length = 40;

    //character.level = level1;
    //character.level.start();

    treeManager.setGetLevelsCallback(() => {
        let randomLevels = getThreeLevels(LevelDifficulty.BLUE_SQUARE);
        return [
            new randomLevels[0](treeManager, mobManager, camera, character),
            new randomLevels[1](treeManager, mobManager, camera, character),
            new randomLevels[2](treeManager, mobManager, camera, character)
        ]
    });

    let level = undefined;


    function update(time) {
        let dt = (time - lastTime) / 1000.0;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#F4F4F8"
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        //level1.renderScoreCard(ctx);

        // Game Not Paused:
        gameTime += dt;

        if (false){
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
