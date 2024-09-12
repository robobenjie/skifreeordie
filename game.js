import VirtualJoystick from './joystick.js';
import Character from './character.js';
import ParticleEngine from './particle_engine.js';
import TreeManager from './terrain.js';
import Renderer from './renderer.js';

window.addEventListener('load', function () {
    var canvas = document.getElementById('gameCanvas');
    var ctx = canvas.getContext('2d');
    var lastTime = 0; // For delta time calculation
    var gameTime = 0; // Total time elapsed since start

    var joystick = new VirtualJoystick(canvas);
    var particleEngine = new ParticleEngine(1000);
    var treeManager = new TreeManager();
    var character = new Character(100, 100, particleEngine, treeManager, joystick);
    var renderer = new Renderer(ctx, character, treeManager, particleEngine);


    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        character.x = canvas.width / 2;
        character.y = canvas.height / 4;
        treeManager.onCanvasResize(canvas);
    }

    function update(time) {
        var dt = (time - lastTime) / 1000.0;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#F4F4F8"
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        requestAnimationFrame(update); // Request the next frame
        

        // Game Not Paused:
        gameTime += dt;

        joystick.draw(ctx);

        character.update(dt, ctx);
        particleEngine.update(dt);
        treeManager.update(dt, character, ctx);

        ctx.save();
        ctx.translate(
            canvas.width / 2 - character.x, 
            canvas.height / 4 - character.y
        );
        character.drawTrail(ctx);
        renderer.render();
        ctx.restore();
        lastTime = time;


    }
     // Resize the canvas to fill browser window dynamically
     window.addEventListener('resize', resizeCanvas, false);

     // Initial call to set the canvas size correctly and start the update loop
     resizeCanvas();
     requestAnimationFrame(update);
});