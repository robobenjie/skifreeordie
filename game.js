import VirtualJoystick from './joystick.js';
import Character from './character.js';
import { Camera } from './camera.js';
import ParticleEngine from './particle_engine.js';
import TerrainManager from './terrain.js';
import Renderer from './renderer.js';
import MobManager from './mob.js';

window.addEventListener('load', function () {
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
    let renderer = new Renderer(ctx, character, treeManager, particleEngine, mobManager);



    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        character.x = canvas.width / 2;
        character.y = canvas.height / 4;
        treeManager.onCanvasResize(canvas);
    }

    // resetOnFocus
    window.onfocus = function() {
        lastTime = performance.now();
    }

    let lastGoblinSpawn = 0;
    //mobManager.spawnAxeOrc();
    mobManager.spawnGoblin();


    function update(time) {
        let dt = (time - lastTime) / 1000.0;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#F4F4F8"
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        requestAnimationFrame(update); // Request the next frame
        

        // Game Not Paused:
        gameTime += dt;

        if (gameTime - lastGoblinSpawn > 0.1) {
            if (mobManager.numGoblins() < 15) {
                mobManager.spawnGoblin();
            }
            if (mobManager.numAxeOrcs() < 2) {
                mobManager.spawnAxeOrc();
            }
            if (mobManager.numSpearOrcs() < 1) {
                mobManager.spawnSpearOrc();
            }
            lastGoblinSpawn = gameTime;
        }   

        character.update(dt, ctx);
        camera.update(dt);
        particleEngine.update(dt);
        treeManager.update(dt, character, ctx);
        mobManager.update(dt);

        ctx.save();
        camera.applyTransform(ctx);
        character.drawTrail(ctx);
        renderer.render();
        ctx.restore();
        joystick.draw(ctx);
        character.drawHealthBar(ctx);
        lastTime = time;


    }
     // Resize the canvas to fill browser window dynamically
     window.addEventListener('resize', resizeCanvas, false);

     // Initial call to set the canvas size correctly and start the update loop
     resizeCanvas();
     requestAnimationFrame(update);
});