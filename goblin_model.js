import { KinematicRenderer } from './kinematic_renderer.js';

const HILL_SLOPE = 15; // degrees
const SKI_LENGTH = 2;
const SKI_WIDTH = 0.12;
const STANCE_WIDTH = 0.65;
const HIP_WIDTH = 0.3;
const LEG_LENGTH = 1.0;
const LEG_WIDTH = 0.3;
const ARM_WIDTH = 0.2;
const ARM_LENGTH = 0.5;
const TORSO_LENGTH = 0.5;
const BELLY_RADIUS = 0.35;
const SHOULDER_RADIUS = 0.3;
const HEAD_RADIUS = 0.6;
const FACE_RADIUS = 0.2;
const NOSE_LENGTH = 0.3;

export default class GoblinModel {

    constructor() {

        this.skiColor = "#1B5299"; // blue
        this.cloakDark = "#331832";
        this.cloakLight = "#694D75";
        this.tan = "#F1ECCE"
        this.lightBlue = "#9FC2CC";

        this.model = new KinematicRenderer(4);
        let worldFrame = this.model.frame();
        const hillFrame = worldFrame.rotate_about_y(HILL_SLOPE * Math.PI / 180);
        let baseFrame = hillFrame.rotate_about_z(0, "neg_ski_angle", true);

        const leftSkiFrame = baseFrame.translate(0, STANCE_WIDTH / 2, 0).rotate_about_z(0, "left_ski_angle", true);
        const rightSkiFrame = baseFrame.translate(0, -STANCE_WIDTH / 2, 0).rotate_about_z(0, "right_ski_angle", true);
        
        this.model.lineSegment(
            [{x: -SKI_LENGTH / 2, y: 0, z: 0}, {x: SKI_LENGTH / 2, y: 0, z: 0}],
            leftSkiFrame,
            this.skiColor,
            SKI_WIDTH,
            0,
        );

        this.model.lineSegment(
            [{x: -SKI_LENGTH / 2, y: 0, z: 0}, {x: SKI_LENGTH / 2, y:0, z: 0}],
            rightSkiFrame,
            this.skiColor,
            SKI_WIDTH,
            0,
        );

        this.model.lineSegment(
            [
                {x: 0, y: -STANCE_WIDTH / 2, z: 0},
                {x: 0, y: -HIP_WIDTH / 2, z: LEG_LENGTH},
                {x: 0, y: HIP_WIDTH / 2, z: LEG_LENGTH},
                {x: 0, y: STANCE_WIDTH / 2, z: 0}
            ],
            baseFrame,
            this.cloakDark,
            LEG_WIDTH,
            1,
        );
        this.model.bodySegment(
            {position: {x: 0, y: 0, z: LEG_LENGTH}, radius: BELLY_RADIUS},
            {position: {x: 0, y: 0, z: LEG_LENGTH + TORSO_LENGTH}, radius: SHOULDER_RADIUS},
            baseFrame,
            this.cloakLight,
            2
        );
        const leftShoulderFrame = baseFrame.translate(0, SHOULDER_RADIUS * 0.9, LEG_LENGTH + TORSO_LENGTH).rotate_about_y(0, "left_arm_angle", true);
        const rightShoulderFrame = baseFrame.translate(0, -SHOULDER_RADIUS * 0.9, LEG_LENGTH + TORSO_LENGTH).rotate_about_y(0, "right_arm_angle", true);
        this.model.lineSegment(
            [{x: 0, y: 0, z: 0}, {x: 0, y: ARM_LENGTH, z: -ARM_LENGTH}],
            leftShoulderFrame,
            this.cloakDark,
            ARM_WIDTH,
            2,
        );
        this.model.lineSegment(
            [{x: 0, y: 0, z: 0}, {x: 0, y: -ARM_LENGTH, z: -ARM_LENGTH}],
            rightShoulderFrame,
            this.cloakDark,
            ARM_WIDTH,
            2,
        );
        const headFrame = baseFrame.translate(.3, 0, LEG_LENGTH + TORSO_LENGTH + SHOULDER_RADIUS + HEAD_RADIUS * 0.2).rotate_about_y(-Math.PI / 2 - 0.2);
        this.model.hemisphere(
            HEAD_RADIUS,
            HEAD_RADIUS * 2,
            headFrame,
            this.cloakLight,
            this.cloakDark,
            2,
        );
        const faceFrame = headFrame.translate(-0.15, 0, -0.01).rotate_about_y(Math.PI);
        this.model.hemisphere(
            FACE_RADIUS,
            NOSE_LENGTH,
            faceFrame,
            this.lightBlue,
            this.lightBlue,
            2,
        );
    }

    update(dt, skiAngle, pizzaAngle, armPinwheelAngle) {
        this.model.update(dt, {
            neg_ski_angle: -skiAngle,
            left_ski_angle: -pizzaAngle,
            right_ski_angle: pizzaAngle,
            left_arm_angle: armPinwheelAngle,
            right_arm_angle: armPinwheelAngle,
        });
    }

    draw(ctx) {
        this.model.draw(ctx);
    }

}