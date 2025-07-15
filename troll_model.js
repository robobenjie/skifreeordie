import { KinematicRenderer } from './kinematic_renderer.js';
import { LowPassFilter } from './utils.js';

const HILL_SLOPE = 15; // degrees
const HIP_HEIGHT = 1.5;
const HIP_WIDTH = 0.5;
const KNEE_FORWARD = 0.2;
const STANCE_WIDTH = 0.6;
const LEG_WIDTH = 0.4;
const BOARD_LENGTH = 2.3;
const BOARD_WIDTH = 0.7;
const BOARD_TIP_HEIGHT = 0.1;
const TORSO_BOTTOM_RADIUS = 0.25;
const TORSO_TOP_RADIUS = 0.35;
const TORSO_HEIGHT = 1.0;
const BICEP_LENGTH = 0.75;
const FOREARM_LENGTH = 0.75;
const ARM_WIDTH = 0.3;
const NOSE_LENGTH = 0.7;
const NOSE_RADIUS = 0.1;
const NIPPLE_RADIUS = 0.05;
const NIPPLE_OFFSET_WIDE = 0.2;

const MOHAWK_LENGTH = 0.5;
const HEAD_RADIUS = 0.4;

const AXE_HANDLE_LENGTH = 0.8;
const AXE_HEAD_LENGTH = 1.0;
const AXE_WIDTH = 0.3;

export default class TrollModel {

    pantsColor = "#07A0C3";
    skinColor = "#99EDCC";
    noseColor = "#74E7B9";
    boardColor = "#086788";
    hairColor = "#FF4CDE";
    black = "#00072D";

    getColors() {
        return [
            this.skinColor,
            this.hairColor,
            this.pantsColor,
            this.boardColor,
        ]
    }

    constructor() {
        this.model = new KinematicRenderer(4);

        this.hipFilter = new LowPassFilter(0, 0.2   , Infinity, Infinity, true);
        this.neckFilter = new LowPassFilter(0, 0.2, Infinity, Infinity, true);

        let worldFrame = this.model.frame();
        const hillFrame = worldFrame.rotate_about_y(HILL_SLOPE * Math.PI / 180);
        let baseFrame = hillFrame.rotate_about_z(0, "neg_ski_angle", true);
        let hipFrame = baseFrame.translate(0, 0, HIP_HEIGHT);
        let legFrame = hipFrame.rotate_about_x(0, "leg_angle", true);

        this.model.lineSegment(
            [
                {x: -STANCE_WIDTH / 2, y: 0, z: -HIP_HEIGHT},
                {x: -STANCE_WIDTH / 2, y: KNEE_FORWARD, z: -HIP_HEIGHT/2},
                {x: -HIP_WIDTH / 2, y: 0, z: 0},
                {x: HIP_WIDTH / 2, y: 0, z: 0},
                {x: STANCE_WIDTH / 2, y: KNEE_FORWARD, z: -HIP_HEIGHT/2},
                {x: STANCE_WIDTH / 2, y: 0, z: -HIP_HEIGHT},
            ],
            legFrame,
            this.pantsColor,
            LEG_WIDTH,
            1,
        );

        // Board
        const boardFrame = legFrame.translate(0, 0, -HIP_HEIGHT);
        const numPointsPerRoundedTip = 5; // Adjust this value as needed
        let points = [];
        const backCenterX = -BOARD_LENGTH / 2;
        const centerY = 0; // Since the board is centered along the Y-axis
        for (let i = 0; i <= numPointsPerRoundedTip; i++) {
            // Angle θ varies from 90 degrees (π/2) to 270 degrees (3π/2)
            let theta = (Math.PI / 2) + (Math.PI * i) / numPointsPerRoundedTip;
            let x = backCenterX + (BOARD_WIDTH / 2) * Math.cos(theta);
            let y = centerY + (BOARD_WIDTH / 2) * Math.sin(theta);
            points.push({ x: x, y: y, z: -BOARD_TIP_HEIGHT * Math.cos(theta) });
        }
        const frontCenterX = BOARD_LENGTH / 2;
        for (let i = 0; i <= numPointsPerRoundedTip; i++) {
            // Angle θ varies from 270 degrees (3π/2) to 450 degrees (5π/2)
            let theta = (3 * Math.PI / 2) + (Math.PI * i) / numPointsPerRoundedTip;
            let x = frontCenterX + (BOARD_WIDTH / 2) * Math.cos(theta);
            let y = centerY + (BOARD_WIDTH / 2) * Math.sin(theta);
            points.push({ x: x, y: y, z: BOARD_TIP_HEIGHT * Math.cos(theta) });
        }
        this.model.polygon(
            points,
            boardFrame,
            this.boardColor,
            0,
        );

        // Torso
        const torsoFrame = hipFrame.translate(0, 0, 0.2).rotate_about_x(0, "torso_pitch", true).rotate_about_z(0, "torso_angle", true);
        this.model.bodySegment(
            {position: {x: -TORSO_BOTTOM_RADIUS / 2, y: 0, z: 0}, radius: TORSO_BOTTOM_RADIUS},
            {position: {x: -TORSO_TOP_RADIUS / 2, y: 0, z: TORSO_HEIGHT}, radius: TORSO_TOP_RADIUS, use_for_sort: true},
            torsoFrame,
            this.skinColor,
            1,
        );
        this.model.bodySegment(
            {position: {x: TORSO_BOTTOM_RADIUS / 2, y: 0, z: 0}, radius: TORSO_BOTTOM_RADIUS},
            {position: {x: TORSO_TOP_RADIUS / 2, y: 0, z: TORSO_HEIGHT}, radius: TORSO_TOP_RADIUS, use_for_sort: true},
            torsoFrame,
            this.skinColor,
            1,
        );

        // Nipples
        this.model.ball(
            {x: -TORSO_TOP_RADIUS / 2 - NIPPLE_OFFSET_WIDE, y: TORSO_TOP_RADIUS - 0.1, z: TORSO_HEIGHT - 0.2},
            NIPPLE_RADIUS,
            torsoFrame,
            this.hairColor,
            1,
        );
        this.model.ball(
            {x: TORSO_TOP_RADIUS / 2 + NIPPLE_OFFSET_WIDE, y: TORSO_TOP_RADIUS - 0.1, z: TORSO_HEIGHT - 0.2},
            NIPPLE_RADIUS,
            torsoFrame,
            this.hairColor,
            1,
        );

        // Left arm
        const leftArmFrame = torsoFrame.translate(TORSO_TOP_RADIUS, 0, TORSO_HEIGHT + TORSO_TOP_RADIUS).rotate_about_y(2.5);
        this.model.lineSegment(
            [
                {x: 0, y: 0, z: 0}, 
                {x: 0, y: 0, z: BICEP_LENGTH},
                {x: FOREARM_LENGTH * .2, y: FOREARM_LENGTH * .9, z: BICEP_LENGTH},
            ],
            leftArmFrame,
            this.noseColor,
            ARM_WIDTH,
            1,
        );

        // Right arm
        const rightArmFrame = torsoFrame.translate(-TORSO_TOP_RADIUS, 0, TORSO_HEIGHT + TORSO_TOP_RADIUS).rotate_about_y(-0.3).rotate_about_y(-0.3, "right_shoulder_angle", true);
        this.model.lineSegment(
            [
                {x: 0, y: 0, z: 0}, 
                {x: 0, y: 0, z: BICEP_LENGTH},
            ],
            rightArmFrame,
            this.noseColor,
            ARM_WIDTH,
            1
        );
        const rightForearmFrame = rightArmFrame.translate(0, 0, BICEP_LENGTH);
        this.model.lineSegment(
            [
                {x: 0, y: 0, z: 0}, 
                {x: 0, y: 0, z: FOREARM_LENGTH},
            ],
            rightForearmFrame,
            this.noseColor,
            ARM_WIDTH,
            1
        );
        const rightHandFrame = rightForearmFrame.translate(0, 0, FOREARM_LENGTH);
        this.model.lineSegment(
            [
                {x: -AXE_HANDLE_LENGTH / 2, y: 0, z: 0},
                {x: AXE_HANDLE_LENGTH / 2, y: 0, z: 0},
            ],
            rightHandFrame,
            "brown",
            AXE_WIDTH,
            1,
        );
        this.model.lineSegment(
            [
                {x: AXE_HANDLE_LENGTH / 2, y: 0, z: -AXE_HEAD_LENGTH / 2},
                {x: AXE_HANDLE_LENGTH / 2, y: 0, z: AXE_HEAD_LENGTH / 2},
            ],
            rightHandFrame,
            "silver",
            AXE_WIDTH,
            1,
        );



        const HEAD_FRAME = torsoFrame.translate(0, 0, TORSO_HEIGHT + 2 * HEAD_RADIUS).rotate_about_z(0, "neck_angle", true);


        // Head
        this.model.ball(
            {x: 0, y: 0, z: 0},
            HEAD_RADIUS,
            HEAD_FRAME,
            this.skinColor,
            1,
        );
        // Nose
        this.model.bodySegment(
            {position: {x: 0, y: HEAD_RADIUS, z: 0}, radius: NOSE_RADIUS * 1.5},
            {position: {x: 0, y: NOSE_LENGTH, z: 0}, radius: NOSE_RADIUS, color: this.hairColor},
            HEAD_FRAME,
            this.noseColor,
            1,
        );
        const numSpikes = 16;
        for (let i = 0; i < numSpikes; i++) {
            const hawkFrame = HEAD_FRAME.rotate_about_x(i * Math.PI / numSpikes * 1.0 - 0.7);
            this.model.lineSegment(
                [{x: 0, y: 0, z: HEAD_RADIUS}, {x: 0, y: 0, z: HEAD_RADIUS + MOHAWK_LENGTH}],
                hawkFrame,
                this.hairColor,
                0.15,
                1,
            );
        }


    }

    update(dt, skiAngle, legAngle, angleToTarget, armDown) {
        const filteredSkiAngle = this.hipFilter.runFilter(dt, skiAngle);
        const neckAngleToTarget = angleToTarget - filteredSkiAngle - Math.PI/2;
        const neckAngle = this.neckFilter.runFilter(dt, neckAngleToTarget);
        this.model.update(
            dt, 
            {
                neg_ski_angle: -skiAngle,
                leg_angle: legAngle,
                torso_angle: skiAngle - filteredSkiAngle,
                torso_pitch: -legAngle/3,
                right_shoulder_angle: -armDown * 2.5,
                neck_angle: -neckAngle,
            }
        );
    }

    draw(ctx) {
        this.model.draw(ctx);
    }
}

export class AxeModel {

    constructor(heading) {
        this.model = new KinematicRenderer(4);
        let worldFrame = this.model.frame();
        let baseFrame = worldFrame.rotate_about_z(heading + Math.PI/2);
        let handleFrame = baseFrame.rotate_about_y(0, "spin", true);

        this.model.lineSegment(
            [
                {x: -AXE_HANDLE_LENGTH / 2, y: 0, z: 0},
                {x: AXE_HANDLE_LENGTH / 2, y: 0, z: 0},
            ],
            handleFrame,
            "brown",
            AXE_WIDTH,
            1,
        );
        this.model.lineSegment(
            [
                {x: AXE_HANDLE_LENGTH / 2, y: 0, z: -AXE_HEAD_LENGTH / 2},
                {x: AXE_HANDLE_LENGTH / 2, y: 0, z: AXE_HEAD_LENGTH / 2},
            ],
            handleFrame,
            "silver",
            AXE_WIDTH,
            1,
        );
        this.time = 0;
    }

    update(dt) {
        this.time += dt;
        this.model.update(dt, {
            spin: this.time * 25 // Constant spin rate
        });
    }

    draw(ctx) {
        this.model.draw(ctx);
    }

}