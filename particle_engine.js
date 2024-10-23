class Particle {
    constructor(x, y, velocity, lifetime) {
        this.position = { x, y };
        this.velocity = velocity;  // { x: velocityX, y: velocityY }
        this.lifetime = lifetime;  // in seconds
        this.age = 0;              // age in seconds
        this.active = true;
        this.drag = 4;        // whether the particle is still active
    }

    // Update the particle's position and age
    update(dt) {
        if (!this.active) return;

        this.velocity.x -= this.velocity.x * this.drag * dt;
        this.velocity.y -= this.velocity.y * this.drag * dt;

        // Update position based on velocity
        this.position.x += this.velocity.x * dt;
        this.position.y += this.velocity.y * dt;

        // Increment the age
        this.age += dt;

        // Check if particle has exceeded its lifetime
        if (this.age >= this.lifetime) {
            this.active = false;  // Mark as expired
        }
    }

    // Draw the particle on the canvas
    draw(ctx) {
        if (!this.active) return;

        // Example of drawing a simple circle for the particle
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fill();
        ctx.closePath();
    }
}

class ParticleEngineBase {
    constructor(maxParticles, particleClass) {
        this.maxParticles = maxParticles;      // Fixed pool of particles
        this.particles = [];                   // Array to hold the particles

        // Initialize the pool of particles with inactive particles
        for (let i = 0; i < maxParticles; i++) {
            this.particles.push(new particleClass(0, 0, { x: 0, y: 0 }, 0));
            this.particles[i].active = false;  // Set all particles to inactive initially
        }
    }

    // Emit a new particle at (x, y) with a specified velocity and lifetime
    emit(x, y, velocity, lifetime) {
        // Find an inactive particle in the pool
        let particle = this.particles.find(p => !p.active);
        if (particle) {
            // Activate the particle and set its properties
            particle.position = { x, y };
            particle.velocity = velocity;
            particle.lifetime = lifetime;
            particle.age = 0;
            particle.active = true;
            return particle;
        }
    }

    // Update all active particles
    update(dt) {
        for (let particle of this.particles) {
            if (particle.active) {
                particle.update(dt);
            }
        }
    }

    // Draw all active particles
    draw(ctx) {
        for (let particle of this.particles) {
            if (particle.active) {
                particle.draw(ctx);
            }
        }
    }
}

class ParticleEngine extends ParticleEngineBase {
    constructor(maxParticles) {
        super(maxParticles, Particle);
    }
}

class ColoredParticle extends Particle {
    constructor(x, y, velocity, lifetime) {
        super(x, y, velocity, lifetime)
        this.color = 'rgba(255, 255, 255, 0.7)';
    }

    draw(ctx) {
        if (!this.active) return;
        // Example of drawing a simple circle for the particle
        let size = 3 * (1 - this.age / this.lifetime);
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }
}

class FallingSnowParticle extends Particle {
    constructor(x, y, velocity, lifetime) {
        super(x, y, velocity, lifetime);
        this.color = 'rgba(255, 255, 255, 0.7)';
    }

    update(dt, windSpeed, ctx) {
        if (!this.active) return;

        // Add Brownian motion in the x direction
        const brownianForce = (Math.random() - 0.5) * 2; // Random value between -1 and 1
        const brownianStrength = 200; // Adjust this value to control the intensity of the motion
        this.velocity.x += brownianForce * brownianStrength * dt;

        // Add motion towards the center of the canvas
        const center = { x: ctx.canvas.width / 2, y: ctx.canvas.height / 2 };
        const direction = { x: center.x - this.position.x, y: center.y - this.position.y };
        const distance = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
        const attractionStrength = .00001; // Adjust this value to control the intensity of the attraction
        this.velocity.x += direction.x * attractionStrength * dt * distance;
        this.velocity.y += direction.y * attractionStrength * dt * distance;


        // Update position based on velocity
        this.position.x += this.velocity.x * dt + windSpeed * dt;
        this.position.y += this.velocity.y * dt;

        // Increment the age
        this.age += dt;

        // Check if particle has exceeded its lifetime
        if (this.age >= this.lifetime) {
            this.active = false;  // Mark as expired
        }
    }
}

export class FallingSnowParticleEffect extends ParticleEngineBase {
    constructor(maxParticles) {
        super(maxParticles, FallingSnowParticle);
    }


    // Update all active particles
    update(dt, windSpeed, ctx) {
        for (let particle of this.particles) {
            if (particle.active) {
                particle.update(dt, windSpeed, ctx);
            }
        }
    }
}

export class MobDeathParticleEffect extends ParticleEngineBase {
    constructor(maxParticles) {
        super(maxParticles, ColoredParticle);
    }

    emit(x, y, velocity, lifetime, color) {
        let particle = super.emit(x, y, velocity, lifetime);
        particle.color = color;
    }

}

export default ParticleEngine;