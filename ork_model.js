import { KinematicRenderer } from './kinematic_renderer.js';
import { LowPassFilter } from './utils.js';

const STANCE_WIDTH = 0.45;
const SKI_LENGTH = 3.0;
const SKI_WIDTH = 0.12;
const HILL_SLOPE = 15; // degrees
const LEG_SEGMENT_LENGTH = 0.55;
const LEG_WIDTH = 0.25;
const HIP_RADIUS = 0.25;
const HIP_WIDTH = 0.40;
const BELLY_RADIUS = 0.5;
const SHOULDER_RADIUS = 0.4;
const SHOULDER_WIDTH = 0.4;
const HEAD_RADIUS = 0.3;
const HELMET_RADIUS = 0.4;
const HELMET_HEIGHT = 0.8;

const BICEP_WIDTH = 0.3;

const ARM_SEGMENT_LENGTH = 0.6;
const WING_ANGLE = 15 * Math.PI / 180;

const SPEAR_LENGTH = 4.5;
const SPEAR_BELOW = 0.25;
const SPEAR_WIDTH = 0.2;
const TIP_LENGTH = 0.6;
const TIP_WIDTH = 0.3;

export default class OrkModel {

    update(dt, skiAngle, crouchAngle, spearAngle, torsoTurn, pokingSpear) {
        
        let handAngle = 0;
        torsoTurn = this.torsoFilter.runFilter(dt, torsoTurn);
        spearAngle = this.spearFilter.runFilter(dt, spearAngle);
        if (pokingSpear) {
            this.poking = true;
        }
        if (this.poking) {
            this.timeSincePokeStart += dt;
            if (this.timeSincePokeStart > this.pokeTime) {
                this.poking = false;
            }
        } else {
            this.timeSincePokeStart = 0;
        }
        let pokingAmount = this.pokeFilter.runFilter(dt, this.poking ? 1.0 : 0.0);

        
        const pokeAngle = -pokingAmount * Math.PI * 0.7;
        

        spearAngle = spearAngle * Math.PI * 0.6 + pokeAngle;
        handAngle = -pokeAngle;

        this.model.update(dt, {
            neg_ski_angle: -skiAngle,
            crouch_angle: crouchAngle,
            spear_angle: spearAngle,
            neg_torso_turn: -torsoTurn,
            neg_2_crouch_angle: -2 * crouchAngle,
            hill_angle: HILL_SLOPE * Math.PI / 180 * Math.cos(skiAngle),
            hand_angle: handAngle,
        });
    }

    constructor() {

        this.torsoFilter = new LowPassFilter(0, 0.2, -1.4, 1.4);
        this.spearFilter = new LowPassFilter(0, 0.2);
        this.pokeFilter = new LowPassFilter(0, 0.04);

        this.pokeTime = 0.2;
        this.timeSincePokeStart = 0;
        this.poking = false;

        this.skiColor = "#252422"; // eerie black
        this.shirtColor = "#252422"; // eerie black
        this.legColor = "#bc6c25"; // brown
        //this.skinColor = "#6a994e"; // green
        this.skinColor = "#83BCA9"
        this.accessoryColor = "#fefae0"; // Cornsilk
        this.lightBrown = "#dda15e"; // light brown
        this.red = "#CC444B"; // red
        this.stanceWidth = 0.45;
        let skiAngle = 0;
        let crouchAngle = 0;
        let spearAngle = 0;
        let torsoTurn = 0;
        this.model = new KinematicRenderer(4);
        let worldFrame = this.model.frame();
        let baseFrame = worldFrame.rotate_about_z(-skiAngle, "neg_ski_angle", true);
        const hillAngle = HILL_SLOPE * Math.PI / 180 * Math.cos(skiAngle);
        const skiFrame = baseFrame.rotate_about_y(hillAngle, "hill_angle", true);
        
        this.model.lineSegment(
            [{x: -SKI_LENGTH / 2, y: -STANCE_WIDTH / 2, z: 0}, {x: SKI_LENGTH / 2, y: -STANCE_WIDTH / 2, z: 0}],
            skiFrame,
            this.skiColor,
            SKI_WIDTH,
            0,
        );

        this.model.lineSegment(
            [{x: -SKI_LENGTH / 2, y: STANCE_WIDTH / 2, z: 0}, {x: SKI_LENGTH / 2, y: STANCE_WIDTH / 2, z: 0}],
            skiFrame,
            this.skiColor,
            SKI_WIDTH,
            0,
        );
        const shinFrame = skiFrame.rotate_about_y(crouchAngle, "crouch_angle", true);
        this.model.lineSegment(
            [{x: 0, y: STANCE_WIDTH / 2, z: 0}, {x: 0, y: STANCE_WIDTH / 2, z: LEG_SEGMENT_LENGTH}],
            shinFrame,
            this.legColor,
            LEG_WIDTH,
            1,
        );
        this.model.lineSegment(
            [{x: 0, y: -STANCE_WIDTH / 2, z: 0}, {x: 0, y: -STANCE_WIDTH / 2, z: LEG_SEGMENT_LENGTH}],
            shinFrame,
            this.legColor,
            LEG_WIDTH,
            1,
        );

        const thighFrame = shinFrame.translate(0, 0, LEG_SEGMENT_LENGTH).rotate_about_y(-2*crouchAngle, "neg_2_crouch_angle", true);
        this.model.lineSegment(
            [{x: 0, y: STANCE_WIDTH / 2, z: 0}, {x: 0, y: STANCE_WIDTH / 2, z: LEG_SEGMENT_LENGTH}],
            thighFrame,
            this.legColor,
            LEG_WIDTH,
            1,
        );
        this.model.lineSegment(
            [{x: 0, y: -STANCE_WIDTH / 2, z: 0}, {x: 0, y: -STANCE_WIDTH / 2, z: LEG_SEGMENT_LENGTH}],
            thighFrame,
            this.legColor,
            LEG_WIDTH,
            1,
        );
        const hipFrame = thighFrame.translate(0, 0, LEG_SEGMENT_LENGTH).rotate_about_y(crouchAngle, "crouch_angle", true);
        this.model.bodySegment(
            {position: {x: 0, y: -HIP_WIDTH/2, z: 0}, radius: HIP_RADIUS},
            {position: {x: 0, y: HIP_WIDTH/2, z: 0}, radius: HIP_RADIUS},
            hipFrame,
            this.legColor,
            1,
        );
        const torsoFrame = hipFrame.rotate_about_z(-torsoTurn, "neg_torso_turn", true);
        this.model.ball(
            {x: 0.2, y: 0, z: BELLY_RADIUS},
            BELLY_RADIUS,
            torsoFrame,
            this.shirtColor,
            1,
        );
        this.model.bodySegment(
            {position: {x: 0.2, y: -SHOULDER_WIDTH / 2, z: 2 * BELLY_RADIUS}, radius: SHOULDER_RADIUS},
            {position: {x: 0.2, y: SHOULDER_WIDTH / 2, z: 2 * BELLY_RADIUS}, radius: SHOULDER_RADIUS},
            torsoFrame,
            this.shirtColor,
            1,
        );


        this.model.ball(
            {x: 0.7, y: 0.01, z: 2 * BELLY_RADIUS + SHOULDER_RADIUS + HEAD_RADIUS - 0.7},
            HEAD_RADIUS,
            torsoFrame,
            this.skinColor,
            1,
        );
        const helmetFrame = torsoFrame.translate(0.7, 0, 2 * BELLY_RADIUS + SHOULDER_RADIUS + 2 * HEAD_RADIUS - 0.9);
        this.model.hemisphere(
            HELMET_RADIUS,
            HELMET_HEIGHT,
            helmetFrame,
            this.red,
            this.red,
            1,
        );

        let leftShoulderFrame = torsoFrame.translate(0.2, -SHOULDER_WIDTH / 2 - SHOULDER_RADIUS, 2 * BELLY_RADIUS);
        leftShoulderFrame = leftShoulderFrame.rotate_about_x(-WING_ANGLE);
        this.model.lineSegment(
            [{x: 0, y: 0, z: 0},
             {x: 0, y: 0, z: -ARM_SEGMENT_LENGTH},
             {x: ARM_SEGMENT_LENGTH, y: 0, z: -ARM_SEGMENT_LENGTH - 0.1}
            ],
            leftShoulderFrame,
            this.skinColor,
            BICEP_WIDTH,
            1,
        );

        let rightShoulderFrame = torsoFrame.translate(0.2, SHOULDER_WIDTH / 2 + SHOULDER_RADIUS, 2 * BELLY_RADIUS);
        rightShoulderFrame = rightShoulderFrame.rotate_about_y(spearAngle, "spear_angle", true).rotate_about_x(WING_ANGLE); 
        this.model.lineSegment(
            [{x: 0, y: 0, z: 0},
             {x: 0, y: 0, z: -ARM_SEGMENT_LENGTH},
             {x: ARM_SEGMENT_LENGTH, y: 0, z: -ARM_SEGMENT_LENGTH - 0.1}
            ],
            rightShoulderFrame,
            this.skinColor,
            BICEP_WIDTH,
            1,
        );
        let handFrame = rightShoulderFrame.translate(ARM_SEGMENT_LENGTH, 0, -ARM_SEGMENT_LENGTH - 0.1);
        handFrame = handFrame.rotate_about_x(-WING_ANGLE).rotate_about_y(-hillAngle);
        let spearFrame = handFrame.rotate_about_y(0, "hand_angle", true);

        this.model.lineSegment(
            [{x: 0, y: 0, z: -SPEAR_LENGTH * SPEAR_BELOW},
             {x: 0, y: 0, z: SPEAR_LENGTH * (1 - SPEAR_BELOW)},
            ],
            spearFrame,
            this.red,
            SPEAR_WIDTH,
            1,
        );
        const tipFrame = spearFrame.translate(0, 0, SPEAR_LENGTH * (1 - SPEAR_BELOW));
        this.model.polygon(
            [{x: 0, y: -TIP_WIDTH, z: 0},
             {x: 0, y: TIP_WIDTH, z: 0},
             {x: 0, y: 0, z: TIP_LENGTH},
            ],
            tipFrame,
            this.red,
            1,
        );
        this.model.polygon(
            [{x: -TIP_WIDTH, y: 0, z: 0},
             {x: TIP_WIDTH, y: 0, z: 0},
             {x: 0, y: 0, z: TIP_LENGTH},
            ],
            tipFrame,
            this.red,
            1,
        );
        this.model.polygon(
            [{x: -TIP_WIDTH, y: 0, z: 0},
             {x: 0, y: -TIP_WIDTH, z: 0},
             {x: TIP_WIDTH, y: 0, z: 0},
             {x: 0, y: TIP_WIDTH, z: 0},
            ],
            tipFrame,
            this.red,
            1,
        );
    }

    draw(ctx) {
        this.model.draw(ctx);
    }
}