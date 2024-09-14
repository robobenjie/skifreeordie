import VirtualJoystick from './joystick.js';
import Character from './character.js';
import ParticleEngine from './particle_engine.js';
import TerrainManager from './terrain.js';
import Renderer from './renderer.js';
import MobManager from './mob.js';

window.addEventListener('load', function () {
    var canvas = document.getElementById('gameCanvas');
    var ctx = canvas.getContext('2d');
    var lastTime = 0; // For delta time calculation
    var gameTime = 0; // Total time elapsed since start

    var joystick = new VirtualJoystick(canvas);
    var particleEngine = new ParticleEngine(1000);
    var treeManager = new TerrainManager(canvas);
    var character = new Character(100, 100, particleEngine, treeManager, joystick);
    var mobManager = new MobManager(character, treeManager);
    var renderer = new Renderer(ctx, character, treeManager, particleEngine, mobManager);



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

    var lastGoblinSpawn = 0;

    function update(time) {
        var dt = (time - lastTime) / 1000.0;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#F4F4F8"
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        requestAnimationFrame(update); // Request the next frame
        

        // Game Not Paused:
        gameTime += dt;

        if (gameTime - lastGoblinSpawn > 0.25) {
            mobManager.spawnGoblin();
            lastGoblinSpawn = gameTime;
        }

        character.update(dt, ctx);
        particleEngine.update(dt);
        treeManager.update(dt, character, ctx);
        mobManager.update(dt);

        ctx.save();
        ctx.translate(
            canvas.width / 2 - character.x, 
            canvas.height / 4 - character.y
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