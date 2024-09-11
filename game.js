import VirtualJoystick from './joystick.js';
import Character from './character.js';

window.addEventListener('load', function () {
    var canvas = document.getElementById('gameCanvas');
    var ctx = canvas.getContext('2d');
    var lastTime = 0; // For delta time calculation
    var gameTime = 0; // Total time elapsed since start

    var joystick = new VirtualJoystick(canvas);
    var character = new Character(100, 100);

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        character.x = canvas.width / 2;
        character.y = canvas.height / 4;
    }

    function update(time) {
        var timeSec = time / 1000.0; // Convert time to seconds
        var dt = (time - lastTime) / 1000.0;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#F4F4F8"
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        requestAnimationFrame(update); // Request the next frame

        // Game Not Paused:
        gameTime += dt;

        joystick.draw(ctx);
        character.update(dt, joystick, ctx);


        character.draw(ctx);
        lastTime = time;


    }
     // Resize the canvas to fill browser window dynamically
     window.addEventListener('resize', resizeCanvas, false);

     // Initial call to set the canvas size correctly and start the update loop
     resizeCanvas();
     requestAnimationFrame(update);
});