import VirtualJoystick from './joystick.js';
import Character from './character.js';
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
    let cameraPoint = {x: character.x, y: character.y};
    let cameraVel = {x: 0, y: 0};
    let mobManager = new MobManager(character, treeManager, particleEngine);
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
    mobManager.spawnAxeOrc();

    function update(time) {
        let dt = (time - lastTime) / 1000.0;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#F4F4F8"
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        requestAnimationFrame(update); // Request the next frame
        

        // Game Not Paused:
        gameTime += dt;

        if (gameTime - lastGoblinSpawn > 2) {
            if (mobManager.mobs.length < 1) {
                mobManager.spawnAxeOrc();
            }   
            lastGoblinSpawn = gameTime;
        }

        character.update(dt, ctx);
        particleEngine.update(dt);
        treeManager.update(dt, character, ctx);
        mobManager.update(dt);

        let CameraDamping = 15;
        let camerStiffness = 150;
        let cameraForce = {
            x: (character.x + 0.15 * character.velocity.x - cameraPoint.x) * camerStiffness - cameraVel.x * CameraDamping,
            y: (character.y - cameraPoint.y) * camerStiffness - cameraVel.y * CameraDamping
        };
        cameraVel.x += cameraForce.x * dt;
        cameraVel.y += cameraForce.y * dt;
        
        cameraPoint.x += cameraVel.x * dt;
        cameraPoint.y += cameraVel.y * dt;

        ctx.save();
        ctx.translate(
            canvas.width / 2 - cameraPoint.x, 
            canvas.height / 4 - cameraPoint.y
        );
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