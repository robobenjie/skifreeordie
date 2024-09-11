import VirtualJoystick from './joystick.js';
import Character from './character.js';
import ParticleEngine from './particle_engine.js';
import TreeManager from './terrain.js';

window.addEventListener('load', function () {
    var canvas = document.getElementById('gameCanvas');
    var ctx = canvas.getContext('2d');
    var lastTime = 0; // For delta time calculation
    var gameTime = 0; // Total time elapsed since start

    var joystick = new VirtualJoystick(canvas);
    var particleEngine = new ParticleEngine(1000);
    var treeManager = new TreeManager();
    var character = new Character(100, 100, particleEngine, treeManager);

    var lastTreeXpos = 0;
    var lastTreeYpos = 0;
    var yDistPerTree = 30;
    var xDistPerTree = 30;

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        character.x = canvas.width / 2;
        character.y = canvas.height / 4;
        xDistPerTree = yDistPerTree / canvas.height * canvas.width;
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

        ctx.save();
        ctx.translate(
            canvas.width / 2 - character.x, 
            canvas.height / 4 - character.y
        );

        character.update(dt, joystick, ctx);
        particleEngine.update(dt);

        if (character.y - lastTreeYpos > yDistPerTree) {
            treeManager.addTree(
                (Math.random() - 0.5) * canvas.width * 2 + character.x ,
                canvas.height * 1 + character.y
            );
            lastTreeYpos = character.y;
        }
        if (character.x - lastTreeXpos > xDistPerTree) {
            var xpos = 0
            if (character.velocity.x > 0) {
                xpos = canvas.width * 1.5 + character.x;
            } else {
                xpos = -canvas.width * -1.5 + character.x;
            }
            treeManager.addTree(
                xpos,
                (Math.random() - 0.5) * canvas.height * 2 + character.y
            );
            lastTreeXpos = character.x;
        }
        character.drawTrail(ctx);
        treeManager.update(dt, character, ctx);
        treeManager.draw(ctx);
    
        // Draw the particles
        particleEngine.draw(ctx);
        character.draw(ctx);
        ctx.restore();
        lastTime = time;


    }
     // Resize the canvas to fill browser window dynamically
     window.addEventListener('resize', resizeCanvas, false);

     // Initial call to set the canvas size correctly and start the update loop
     resizeCanvas();
     requestAnimationFrame(update);
});