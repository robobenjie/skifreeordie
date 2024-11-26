import { KinematicRenderer } from './kinematic_renderer.js';

const LEFT_HANG = 0.4;
const HANG_DROP = 0.3;
const HANG_POLE_LENGTH = 1.5;
const BRACKET_Z = -2 * HANG_DROP - HANG_POLE_LENGTH

const HALF_WIDTH = 1.4
const LOOP_CHAMFER = 0.2;
const LOOP_HEIGHT = 1.8;

const SEAT_WIDTH = 1.0;
const SEAT_OFFSET = 0.2;
const BOTTOM_Z = BRACKET_Z - LOOP_HEIGHT;

const SEAT_BACK_Y = 0.5;
const SEAT_BACK_FROM_BOTTOM = 0.5;
const SEAT_BACK_HEIGHT = 0.5;
const SEAT_BACK_TILT = 0.1;
const SEAT_BACK_SHRINK = 0.2;

const CABLE_DROOP = 70; // pixels


function getBezierPoint(p1, control, p2, t) {
    const x = Math.pow(1 - t, 2) * p1.x 
            + 2 * (1 - t) * t * control.x 
            + Math.pow(t, 2) * p2.x;
    const y = Math.pow(1 - t, 2) * p1.y 
            + 2 * (1 - t) * t * control.y 
            + Math.pow(t, 2) * p2.y;
    return { x, y };
}

const CHAIRS_PER_SEGMENT = 4;
const MOVE_SPEED = .1;
const TOWER_HEIGHT = 100;
const LINE_SPACING = 50;
export default class SkiLift {
    constructor(p1, p2) {
        this.type = "skiLift";
        this.time = 0;
        this.x = (p1.x + p2.x) / 2;
        this.y = Math.max(p1.y, p2.y);
        this.width = 0;
        this.height = 0;
        this.chairModel = new ChairModel();
        this.heading = Math.atan2((p2.y - p1.y) / 2, p2.x - p1.x);

        this.p1 = p1;
        this.p2 = p2;
        this.calculateLines(p1, p2);
    }

    calculateLines(p1, p2) {
        // Calculate perpendicular offset vector
        const perpX = -Math.cos(this.heading) * LINE_SPACING;
        const perpY = Math.sin(this.heading) * LINE_SPACING / 2;

        // Create up and down line points
        const p1Up = {
            x: p1.x + perpX,
            y: p1.y + perpY - TOWER_HEIGHT
        };
        const p2Up = {
            x: p2.x + perpX, 
            y: p2.y + perpY - TOWER_HEIGHT
        };
        const p1Down = {
            x: p2.x - perpX,
            y: p2.y - perpY - TOWER_HEIGHT
        };
        const p2Down = {
            x: p1.x - perpX,
            y: p1.y - perpY - TOWER_HEIGHT
        };

        this.upLine = {
            p1: p1Up,
            p2: p2Up,
            control: {
                x: (p1Up.x + p2Up.x) / 2,
                y: (p1Up.y + p2Up.y) / 2 + CABLE_DROOP
            }
        };

        this.downLine = {
            p1: p1Down,
            p2: p2Down,
            control: {
                x: (p1Down.x + p2Down.x) / 2,
                y: (p1Down.y + p2Down.y) / 2 + CABLE_DROOP
            }
        };
    }

    rotateAbout(x, y, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        this.p1.x = x + (this.p1.x - x) * cos - (this.p1.y - y) * sin;
        this.p1.y = y + (this.p1.x - x) * sin + (this.p1.y - y) * cos;
        this.p2.x = x + (this.p2.x - x) * cos - (this.p2.y - y) * sin;
        this.p2.y = y + (this.p2.x - x) * sin + (this.p2.y - y) * cos;
        this.heading -= angle;
        this.calculateLines(this.p1, this.p2);
    }

    update(dt) {
        this.time += dt;
    }

    drawUpLine(ctx) {
        for (let i = 0; i < CHAIRS_PER_SEGMENT; i++) {
            let t = (i / CHAIRS_PER_SEGMENT + (this.time * MOVE_SPEED)) % 1.0;
            let pt = getBezierPoint(this.upLine.p1, this.upLine.control, this.upLine.p2, t);
            this.chairModel.update(0, this.heading + Math.PI / 2, Math.sin(2 * this.time + t * 2 * Math.PI) * 0.2);
            ctx.save();
            ctx.translate(pt.x, pt.y);
            this.chairModel.draw(ctx);
            ctx.restore();
        }
    }
    drawDownLine(ctx) {
        for (let i = 0; i < CHAIRS_PER_SEGMENT; i++) {
            let t = (i / CHAIRS_PER_SEGMENT + (this.time * MOVE_SPEED)) % 1.0;
            let pt = getBezierPoint(this.downLine.p1, this.downLine.control, this.downLine.p2, t);
            this.chairModel.update(0, this.heading - Math.PI / 2, Math.sin(2 * this.time + t * 2 * Math.PI) * 0.2);
            ctx.save();
            ctx.translate(pt.x, pt.y);
            this.chairModel.draw(ctx);
            ctx.restore();
        }
    }

    drawTower(ctx) {
        ctx.beginPath();
        ctx.strokeStyle = "#333333";
        ctx.lineWidth = 7;
        ctx.moveTo(this.p1.x, this.p1.y);
        ctx.lineTo(this.p1.x, this.p1.y - TOWER_HEIGHT);
        ctx.moveTo(this.upLine.p1.x, this.upLine.p1.y);
        ctx.lineTo(this.downLine.p2.x, this.downLine.p2.y);
        ctx.stroke();
    }

    draw(ctx) {
        // Draw chairs on up line
        this.drawUpLine(ctx);
        this.drawDownLine(ctx);
        this.drawTower(ctx);


        // Draw the cables
        ctx.strokeStyle = "#333333";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.upLine.p1.x, this.upLine.p1.y);
        ctx.quadraticCurveTo(this.upLine.control.x, this.upLine.control.y, this.upLine.p2.x, this.upLine.p2.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(this.downLine.p1.x, this.downLine.p1.y);
        ctx.quadraticCurveTo(this.downLine.control.x, this.downLine.control.y, this.downLine.p2.x, this.downLine.p2.y);
        ctx.stroke();
    }
}


export class ChairModel {

    constructor() {
        this.model = new KinematicRenderer(4);
        let worldFrame = this.model.frame();
        let hangFrame = worldFrame.rotate_about_z(0, "heading", true).rotate_about_y(0, "pitch", true);
        this.model.lineSegment([
            {x: 0, y: 0, z: 0},
            {x: -LEFT_HANG, y: 0, z: -HANG_DROP},
            {x: -LEFT_HANG, y: 0, z: -HANG_DROP - HANG_POLE_LENGTH},
            {x: 0, y: 0, z: BRACKET_Z},
        ], hangFrame, "black", 0.1, 0);
        this.model.lineSegment([
            {x: 0, y: 0, z: BRACKET_Z},
            {x: HALF_WIDTH - LOOP_CHAMFER, y: 0, z: BRACKET_Z},
            {x: HALF_WIDTH, y: 0, z: BRACKET_Z - LOOP_CHAMFER},
            {x: HALF_WIDTH, y: 0, z: BRACKET_Z - LOOP_HEIGHT},
        ], hangFrame, "black", 0.1, 0);
        this.model.lineSegment([
            {x: 0, y: 0, z: BRACKET_Z},
            {x: -HALF_WIDTH + LOOP_CHAMFER, y: 0, z: BRACKET_Z},
            {x: -HALF_WIDTH, y: 0, z: BRACKET_Z - LOOP_CHAMFER},
            {x: -HALF_WIDTH, y: 0, z: BRACKET_Z - LOOP_HEIGHT},
            ], hangFrame, "black", 0.1, 0);

        // Seat Bottom
        this.model.polygon([
            {x: HALF_WIDTH, y: SEAT_WIDTH / 2 - SEAT_OFFSET, z: BOTTOM_Z},
            {x: -HALF_WIDTH, y: SEAT_WIDTH / 2 - SEAT_OFFSET, z: BOTTOM_Z},
            {x: -HALF_WIDTH, y: -SEAT_WIDTH / 2 - SEAT_OFFSET, z: BOTTOM_Z},
            {x: HALF_WIDTH, y: -SEAT_WIDTH / 2 - SEAT_OFFSET, z: BOTTOM_Z},
            ], hangFrame, "#545e75", 0);

        // Seat Back
        this.model.polygon([
            {x: HALF_WIDTH - SEAT_BACK_SHRINK, y: SEAT_BACK_Y + SEAT_BACK_TILT, z: BOTTOM_Z + SEAT_BACK_FROM_BOTTOM + SEAT_BACK_HEIGHT},
            {x: -HALF_WIDTH + SEAT_BACK_SHRINK, y: SEAT_BACK_Y + SEAT_BACK_TILT, z: BOTTOM_Z + SEAT_BACK_FROM_BOTTOM + SEAT_BACK_HEIGHT},
            {x: -HALF_WIDTH + SEAT_BACK_SHRINK, y: SEAT_BACK_Y, z: BOTTOM_Z + SEAT_BACK_FROM_BOTTOM},
            {x: HALF_WIDTH - SEAT_BACK_SHRINK, y: SEAT_BACK_Y, z: BOTTOM_Z + SEAT_BACK_FROM_BOTTOM},
            ], hangFrame, "#545e75", 0);

        // Connectors from loop to seat back
        this.model.lineSegment([
            {x: -HALF_WIDTH + SEAT_BACK_SHRINK, y: SEAT_BACK_Y + SEAT_BACK_TILT, z: BOTTOM_Z + SEAT_BACK_FROM_BOTTOM + SEAT_BACK_HEIGHT / 2},
            {x: -HALF_WIDTH, y: 0, z: BOTTOM_Z + SEAT_BACK_FROM_BOTTOM + SEAT_BACK_HEIGHT /2},
            ], hangFrame, "black", 0.1, 0);

        this.model.lineSegment([
            {x: HALF_WIDTH - SEAT_BACK_SHRINK, y: SEAT_BACK_Y + SEAT_BACK_TILT, z: BOTTOM_Z + SEAT_BACK_FROM_BOTTOM + SEAT_BACK_HEIGHT / 2},
            {x: HALF_WIDTH, y: 0, z: BOTTOM_Z + SEAT_BACK_FROM_BOTTOM + SEAT_BACK_HEIGHT /2},
            ], hangFrame, "black", 0.1, 0);

        //this.model.ball({x: 0, y: 0, z: BOTTOM_Z + SEAT_BACK_FROM_BOTTOM}, SEAT_BACK_FROM_BOTTOM, hangFrame, "red", 0);


    }

    update(dt, heading, pitch) {
        this.model.update(dt, 
            {heading: heading,
             pitch: pitch});
    }
0
    draw(ctx) {
        this.model.draw(ctx);
    }

}