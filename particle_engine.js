import { setFillColor } from "./utils.js";

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
        setFillColor(ctx, 'rgba(255, 255, 255, 0.7)');
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

class SkiSnowParticle extends Particle {
    constructor(x, y, velocity, lifetime) {
        super(x, y, velocity, lifetime);
        this.color = 'rgba(255, 255, 255, 0.7)';
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.moveTo(this.position.x, this.position.y + 3);
        ctx.arc(this.position.x, this.position.y, 3, 0, Math.PI * 2);
    }


}

export class SkiSnowParticleEffect extends ParticleEngineBase {
    constructor(maxParticles) {
        super(maxParticles, SkiSnowParticle);
    }

    // Draw all active particles
    draw(ctx) {
        setFillColor(ctx, 'rgba(255, 255, 255, 0.7)');
        ctx.beginPath();
        for (let particle of this.particles) {
            if (particle.active) {
                particle.draw(ctx);
            }
        }
        ctx.fill();
    }
}

export class ParticleEngine extends ParticleEngineBase {
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
        setFillColor(ctx, this.color);
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
    constructor(maxParticles, camera) {
        super(maxParticles, FallingSnowParticle);
        this.camera = camera;
    }


    // Update all active particles
    update(dt, windSpeed, ctx) {
        for (let particle of this.particles) {
            if (particle.active) {
                particle.update(dt, windSpeed, ctx);
            }
        }
    }

    warmUp(ctx, duration, wind, emissionRate) {
        const warmUpSteps = 100;  // Number of update steps to simulate
        const dt = duration / warmUpSteps;

        for (let i = 0; i < warmUpSteps; i++) {
            this.update(dt, wind, ctx);
            
            // Emit particles throughout the warm-up period
            const particlesToEmit = Math.floor(emissionRate * dt);
            for (let j = 0; j < particlesToEmit; j++) {
                const x = Math.random() * this.camera.getCanvasWidth() * 6;
                const y = Math.random() * this.camera.getCanvasHeight() * 2;
                this.emit(x, y, {x: 0, y: 80}, 10);
            }
        }
    }
}

export class SparkParticleEffect extends ParticleEngineBase {
    constructor(maxParticles) {
        super(maxParticles, ColoredParticle);
    }

    emit(x, y, velocity, lifetime, color) {
        let particle = super.emit(x, y, velocity, lifetime);
        particle.color = color;
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
