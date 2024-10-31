import { Frame, BodySegment, Ball, Polygon, KinematicRenderer } from './kinematic_renderer.js';

const STANCE_WIDTH = 0.45;
const STANCE_LEAD = 0.3;
const SKI_LENGTH = 3.0;
const SKI_WIDTH = 0.12;
const SKI_REAR_FRACTION = 0.4;
const HILL_SLOPE = 15; // degrees

const BOOT_LENGTH = 0.27;
const TOE_RADIUS = 0.07;
const HEEL_RADIUS = 0.09;
const BOOT_HEIGHT = 0.20;

const PANT_CUFF_RADIUS = 0.12;
const HIP_WIDTH = STANCE_WIDTH;
const HIP_RADIUS = 0.17; 
const HIP_HEIGHT = 1.0;
const KNEES_RADIUS = 0.10;
const SHIN_LENGTH = 0.45;
const THIGH_LENGTH = 0.5;

const JACKET_BOTTOM_WIDTH = 0.35;
const JACKET_BOTTOM_RADIUS = 0.12;
const JACKET_HEIGHT = 0.25;
const SHOULDER_WIDTH = 0.40;
const SHOULDER_RADIUS = 0.20;
const BIG_STRIPE_WIDTH = 0.2;
const BIG_STRIPE_HEIGHT = 0.2;

const UPPER_ARM_RADIUS = 0.18;
const BICEP_LENGTH = 0.45;
const ELBOW_RADIUS = 0.10;
const FOREARM_LENGTH = 0.35;
const WRIST_RADIUS = 0.10;
const GLOVE_RADIUS = 0.12;

const TORSO_HEIGHT = 0.45;
const NECK_LENGTH = 0.22;
const HELMET_RADIUS = 0.24;
const FACE_RADIUS = 0.2;
const FACE_HEIGHT = 0.3;

const GOGGLE_RADIUS = 0.23;
const GOGGLE_HEIGHT = 0.2;


export default class CharacterModel {
    constructor(character) {
        this.character = character;
        this.previousValues = {
            skiAngle: 0,
            hipRotation: 0,
        };
    }

    getColor(part) {
        if (part == "left_ski") {
            return "#333333";
        }
        if (part == "right_ski") {
            return "#333333";
        }
        if (part == "left_boot") {
            return "#666666";
        }
        if (part == "right_boot") {
            return "#666666";
        }
        if (part == "pants") {
            return "#ff0000";
        }
        if (part == "jacket") {
            return "#ff6600";
        }
        if (part == "jacket_big_stripe") {
            return "#28a8ff";
        }
        if (part == "helmet") {
            return "#008080";
        }
        if (part == "face") {
            return "#f1dcb1";
        }
        if (part == "gloves") {
            return "#333332";
        }
        if (part == "goggles") {
            return "#2c7ea0";
        }
    }

    calculate(dt, skiAngle, bendDown, sideLean, overrideAngles = {}) {
        this.kinematicRenderer = new KinematicRenderer(6);
        const worldFrame = this.kinematicRenderer.frame();
        const baseFrame = worldFrame.rotate_about_z(skiAngle, "baseFrame");

        const skiFrame = baseFrame.rotate_about_y(HILL_SLOPE * Math.PI / 180 * Math.cos(skiAngle));
        const sinSkiAngle = Math.sin(skiAngle);

        const leftSkiHeight = -STANCE_WIDTH / 2 * sinSkiAngle * HILL_SLOPE * Math.PI / 180;
        const rightSkiHeight = STANCE_WIDTH / 2 * sinSkiAngle * HILL_SLOPE * Math.PI / 180;

        const leanAngle = bendDown;
        const hipHeight = HIP_HEIGHT - bendDown * 0.3;
        
        const leftSkiFrame = skiFrame.translate(-sinSkiAngle * STANCE_LEAD, -STANCE_WIDTH / 2, leftSkiHeight).rotate_about_x(sideLean);
        const rightSkiFrame = skiFrame.translate(sinSkiAngle * STANCE_LEAD, STANCE_WIDTH / 2, rightSkiHeight).rotate_about_x(sideLean);

        const getAngleWithDefault = (key, defaultValue, speed = 20) => {
            let newVal = overrideAngles[key] !== undefined ? overrideAngles[key] : defaultValue;
            if (this.previousValues[key] !== undefined) {
                newVal = this.previousValues[key] + (newVal - this.previousValues[key]) * dt * speed;
            }
            this.previousValues[key] = newVal;
            return newVal;
        };

        const angleDelta = skiAngle - this.previousValues.skiAngle;
        this.previousValues.hipRotation -= angleDelta;
        this.previousValues.skiAngle = skiAngle;

        const hipRotation = getAngleWithDefault('hipRotation', 0, 5.0);

        const leftArmWing = getAngleWithDefault('leftArmWing', 0.7 - bendDown / 2);
        const leftArmSwing = getAngleWithDefault('leftArmSwing', -leanAngle + bendDown * 0.5);
        const leftElbowAngle = getAngleWithDefault('leftElbowAngle', Math.PI / 2 + Math.min(sideLean * 4, 0));
        const leftWeaponX = getAngleWithDefault('leftWeaponX', 0);

        const rightArmWing = getAngleWithDefault('rightArmWing', 0.7 - bendDown / 2);
        const rightArmSwing = getAngleWithDefault('rightArmSwing', -leanAngle + bendDown * 0.5);
        const rightElbowAngle = getAngleWithDefault('rightElbowAngle', Math.PI / 2 + Math.min(-sideLean * 4, 0));
        const rightWeaponX = getAngleWithDefault('rightWeaponX', 0);
        

        // left ski
        this.kinematicRenderer.bodySegment(
            {position: { x: SKI_LENGTH * (1 - SKI_REAR_FRACTION), y: 0, z: 0 }, radius: SKI_WIDTH / 2},
            {position: { x: -SKI_LENGTH * SKI_REAR_FRACTION, y: 0, z: 0 }, radius: SKI_WIDTH / 2},
            leftSkiFrame,
            this.getColor("left_ski"),
            0,
        );
        // right ski
        this.kinematicRenderer.bodySegment(
            {position: { x: SKI_LENGTH * (1 - SKI_REAR_FRACTION), y: 0, z: 0 }, radius: SKI_WIDTH / 2},
            {position: { x: -SKI_LENGTH * SKI_REAR_FRACTION, y: 0, z: 0 }, radius: SKI_WIDTH / 2},
            rightSkiFrame,
            this.getColor("right_ski"),
            0,
        );

        // left boot
        this.kinematicRenderer.bodySegment(
            {position: { x: BOOT_LENGTH, y: 0, z: TOE_RADIUS }, radius: TOE_RADIUS},
            {position: { x: 0, y: 0, z: HEEL_RADIUS }, radius: HEEL_RADIUS},
            leftSkiFrame,
            this.getColor("left_boot"),
            1,
        );
        this.kinematicRenderer.bodySegment(
            {position: { x: 0, y: 0, z: BOOT_HEIGHT }, radius: HEEL_RADIUS},
            {position: { x: 0, y: 0, z: HEEL_RADIUS }, radius: HEEL_RADIUS},
            leftSkiFrame,
            this.getColor("left_boot"),
            1,
        );

        // right boot
        this.kinematicRenderer.bodySegment(
            {position: { x: BOOT_LENGTH, y: 0, z: TOE_RADIUS }, radius: TOE_RADIUS},
            {position: { x: 0, y: 0, z: HEEL_RADIUS }, radius: HEEL_RADIUS},
            rightSkiFrame,
            this.getColor("right_boot"),
            1,
        );
        this.kinematicRenderer.bodySegment(
            {position: { x: 0, y: 0, z: BOOT_HEIGHT }, radius: HEEL_RADIUS},
            {position: { x: 0, y: 0, z: HEEL_RADIUS }, radius: HEEL_RADIUS},
            rightSkiFrame,
            this.getColor("right_boot"),
            1,
        );
        
        const hipFrame = baseFrame.rotate_about_x(sideLean).translate(0, 0, hipHeight).rotate_about_z(hipRotation);

        // hips
        this.kinematicRenderer.bodySegment(
            {position: { x: 0, y: HIP_WIDTH / 2, z: 0 }, radius: HIP_RADIUS},
            {position: { x: 0, y: -HIP_WIDTH / 2, z: 0 }, radius: HIP_RADIUS},
            hipFrame,
            this.getColor("pants"),
            2,
        );

        const leftBootTop = rightSkiFrame.toWorld({x: 0, y: 0, z: BOOT_HEIGHT}, "baseFrame");
        const rightBootTop = leftSkiFrame.toWorld({x: 0, y: 0, z: BOOT_HEIGHT}, "baseFrame");
        const leftHip = hipFrame.toWorld({x: 0, y: HIP_WIDTH / 2, z: 0}, "baseFrame");
        const rightHip = hipFrame.toWorld({x: 0, y: -HIP_WIDTH / 2, z: 0}, "baseFrame");

        const calculateLegAngles = (bootTop, hip, shinLength, thighLength) => {
            const dx = hip.x - bootTop.x;
            const dy = hip.y - bootTop.y;
            const dz = hip.z - bootTop.z;
            
            const legLength = Math.sqrt(dx*dx + dy*dy + dz*dz);

            let kneeAngle = 0;
            let thighAngle = 0;
            if (legLength > shinLength + thighLength) {
                kneeAngle = 0;
                thighAngle = 0;
            } else {
                // Use law of cosines to find knee angle
                kneeAngle = Math.acos((shinLength*shinLength + thighLength*thighLength - legLength*legLength) / (2 * shinLength * thighLength));
                
                // Calculate thigh angle (angle from vertical)
                thighAngle = Math.asin((shinLength * Math.sin(Math.PI - kneeAngle)) / legLength);
            }
            
            // Calculate forward/back angle based on x and z differences
            const forwardAngle = Math.PI / 2 - Math.atan2(dz, dx);
            
            return {
                kneeAngle: Math.PI - kneeAngle,  // Convert to exterior angle
                thighAngle: thighAngle - forwardAngle // Add forward/back angle to vertical angle
            };
        };
        

        // Calculate angles for left leg
        const leftLegAngles = calculateLegAngles(leftBootTop, leftHip, SHIN_LENGTH, THIGH_LENGTH);

        // Calculate angles for right leg
        const rightLegAngles = calculateLegAngles(rightBootTop, rightHip, SHIN_LENGTH, THIGH_LENGTH);

        const leftLegFrame = hipFrame.translate(0, HIP_WIDTH / 2, 0).rotate_about_y(-leftLegAngles.thighAngle);
        const leftKneeFrame = leftLegFrame.translate(0, 0, -THIGH_LENGTH).rotate_about_y(leftLegAngles.kneeAngle);
        const rightLegFrame = hipFrame.translate(0, -HIP_WIDTH / 2, 0).rotate_about_y(-rightLegAngles.thighAngle);
        const rightKneeFrame = rightLegFrame.translate(0, 0, -THIGH_LENGTH).rotate_about_y(rightLegAngles.kneeAngle);

        this.kinematicRenderer.bodySegment(
            {position: { x: 0, y: 0, z: 0 }, radius: HIP_RADIUS},
            {position: { x: 0, y: 0, z: -THIGH_LENGTH }, radius: KNEES_RADIUS},
            leftLegFrame,
            this.getColor("pants"),
            2,
        );
        this.kinematicRenderer.bodySegment(
            {position: { x: 0, y: 0, z: 0 }, radius: HIP_RADIUS},
            {position: { x: 0, y: 0, z: -THIGH_LENGTH }, radius: KNEES_RADIUS},
            rightLegFrame,
            this.getColor("pants"),
            2,
        );
        this.kinematicRenderer.bodySegment(
            {position: { x: 0, y: 0, z: 0 }, radius: KNEES_RADIUS},
            {position: { x: 0, y: 0, z: -SHIN_LENGTH }, radius: PANT_CUFF_RADIUS},
            leftKneeFrame,
            this.getColor("pants"),
            2,
        );

        this.kinematicRenderer.bodySegment(
            {position: { x: 0, y: 0, z: 0 }, radius: KNEES_RADIUS},
            {position: { x: 0, y: 0, z: -SHIN_LENGTH }, radius: PANT_CUFF_RADIUS},
            rightKneeFrame,
            this.getColor("pants"),
            2,
        );

        let torsoFrame = hipFrame.rotate_about_y(leanAngle);

        // bottom of jacket
        this.kinematicRenderer.bodySegment(
            {position: { x: 0, y: -JACKET_BOTTOM_WIDTH / 2, z: JACKET_HEIGHT }, radius: JACKET_BOTTOM_RADIUS},
            {position: { x: 0, y: JACKET_BOTTOM_WIDTH / 2, z: JACKET_HEIGHT }, radius: JACKET_BOTTOM_RADIUS},
            torsoFrame,
            this.getColor("jacket"),
            2,
        );
        // top of jacket
        this.kinematicRenderer.bodySegment(
            {position: { x: 0, y: -SHOULDER_WIDTH / 2, z: JACKET_HEIGHT + TORSO_HEIGHT }, radius: SHOULDER_RADIUS},
            {position: { x: 0, y: SHOULDER_WIDTH / 2, z: JACKET_HEIGHT + TORSO_HEIGHT }, radius: SHOULDER_RADIUS},
            torsoFrame,
            this.getColor("jacket"),
            2,
        );
        // sides of jacket
        this.kinematicRenderer.bodySegment(
            {position: { x: 0, y: -SHOULDER_WIDTH / 2, z: JACKET_HEIGHT }, radius: JACKET_BOTTOM_RADIUS},
            {position: { x: 0, y: -SHOULDER_WIDTH / 2, z: JACKET_HEIGHT + TORSO_HEIGHT }, radius: SHOULDER_RADIUS},
            torsoFrame,
            this.getColor("jacket"),
            2,
        );
        this.kinematicRenderer.bodySegment(
            {position: { x: 0, y: SHOULDER_WIDTH / 2, z: JACKET_HEIGHT }, radius: JACKET_BOTTOM_RADIUS},
            {position: { x: 0, y: SHOULDER_WIDTH / 2, z: JACKET_HEIGHT + TORSO_HEIGHT }, radius: SHOULDER_RADIUS},
            torsoFrame,
            this.getColor("jacket"),
            2,
        );
        // big stripe
       /*  this.kinematicRenderer.polygon(
            [
                {x: SHOULDER_RADIUS, y: -SHOULDER_WIDTH / 2 - SHOULDER_RADIUS, z: JACKET_HEIGHT + TORSO_HEIGHT + SHOULDER_RADIUS / 2},
                {x: JACKET_BOTTOM_RADIUS, y: SHOULDER_WIDTH / 2 + SHOULDER_RADIUS, z: JACKET_HEIGHT + BIG_STRIPE_HEIGHT + SHOULDER_RADIUS / 2},
                {x: JACKET_BOTTOM_RADIUS, y: SHOULDER_WIDTH / 2 + SHOULDER_RADIUS, z: JACKET_HEIGHT},
                {x: JACKET_BOTTOM_RADIUS, y: SHOULDER_WIDTH / 2 - SHOULDER_RADIUS - BIG_STRIPE_WIDTH, z: JACKET_HEIGHT},
                {x: SHOULDER_RADIUS, y: -SHOULDER_WIDTH / 2 - SHOULDER_RADIUS, z: JACKET_HEIGHT + TORSO_HEIGHT - BIG_STRIPE_HEIGHT + SHOULDER_RADIUS / 2},
            ],
            torsoFrame,
            this.getColor("jacket_big_stripe"),
            2,
        ); */
        // center fill:
        this.kinematicRenderer.polygon(
            [
                {x: 0, y: -SHOULDER_WIDTH / 2, z: JACKET_HEIGHT},
                {x: 0, y: SHOULDER_WIDTH / 2, z: JACKET_HEIGHT},
                {x: 0, y: SHOULDER_WIDTH / 2, z: JACKET_HEIGHT + TORSO_HEIGHT},
                {x: 0, y: -SHOULDER_WIDTH / 2, z: JACKET_HEIGHT + TORSO_HEIGHT},
            ],
            torsoFrame,
            this.getColor("jacket"),
            2,
        );

        // right arm
        let shoulderFrame = torsoFrame.translate(0, 0, JACKET_HEIGHT + TORSO_HEIGHT);
        let rightBicepFrame = shoulderFrame.translate(0, -SHOULDER_WIDTH / 2 - UPPER_ARM_RADIUS, 0).rotate_about_x(-rightArmWing).rotate_about_y(rightArmSwing);

        this.kinematicRenderer.bodySegment(
            {position: { x: 0, y: 0, z: 0 }, radius: UPPER_ARM_RADIUS},
            {position: { x: 0, y: 0, z: -BICEP_LENGTH }, radius: ELBOW_RADIUS},
            rightBicepFrame,
            this.getColor("jacket"),
            2,
        );

        let rightForearmFrame = rightBicepFrame.translate(0, 0, -BICEP_LENGTH).rotate_about_y(-rightElbowAngle);
        this.kinematicRenderer.bodySegment(
            {position: { x: 0, y: 0, z: 0 }, radius: ELBOW_RADIUS},
            {position: { x: 0, y: 0, z: -FOREARM_LENGTH }, radius: WRIST_RADIUS, skip: true},
            rightForearmFrame,
            this.getColor("jacket"),
            2,
        );
        this.kinematicRenderer.ball(
            { x: 0, y: 0, z: -FOREARM_LENGTH },
            GLOVE_RADIUS,
            rightForearmFrame,
            this.getColor("gloves"),
            2,
        );
        let rightHandFrame = rightForearmFrame.translate(0, 0, -FOREARM_LENGTH).rotate_about_y(Math.PI / 2).rotate_about_x(rightArmWing).rotate_about_y(rightWeaponX);

        if (this.character.rightHand && this.character.rightHand.data.model) {
            this.character.rightHand.data.model.frame = rightHandFrame;
            this.character.rightHand.data.model.components[0].forEach(component => {
                component.setFrame(rightHandFrame);
                this.kinematicRenderer.addComponent(component, 2);
            });
        }

        // left arm
        let leftShoulderFrame = torsoFrame.translate(0, 0, JACKET_HEIGHT + TORSO_HEIGHT);
        let leftBicepFrame = leftShoulderFrame.translate(0, SHOULDER_WIDTH / 2 + UPPER_ARM_RADIUS, 0).rotate_about_x(leftArmWing).rotate_about_y(leftArmSwing);

        this.kinematicRenderer.bodySegment(
            {position: { x: 0, y: 0, z: 0 }, radius: UPPER_ARM_RADIUS},
            {position: { x: 0, y: 0, z: -BICEP_LENGTH }, radius: ELBOW_RADIUS},
            leftBicepFrame,
            this.getColor("jacket"),
            2,
        );

        let leftForearmFrame = leftBicepFrame.translate(0, 0, -BICEP_LENGTH).rotate_about_y(-leftElbowAngle);
        this.kinematicRenderer.bodySegment(
            {position: { x: 0, y: 0, z: 0 }, radius: ELBOW_RADIUS},
            {position: { x: 0, y: 0, z: -FOREARM_LENGTH }, radius: WRIST_RADIUS, skip: true},
            leftForearmFrame,
            this.getColor("jacket"),
            2,
        );
        this.kinematicRenderer.ball(
            { x: 0, y: 0, z: -FOREARM_LENGTH },
            GLOVE_RADIUS,
            leftForearmFrame,
            this.getColor("gloves"),
            2,
        );

        let leftHandFrame = leftForearmFrame.translate(0, 0, -FOREARM_LENGTH).rotate_about_y(Math.PI / 2).rotate_about_x(-leftArmWing).rotate_about_y(leftWeaponX);
        if (this.character.leftHand && this.character.leftHand.data.model) {
            this.character.leftHand.data.model.frame = leftHandFrame;
            this.character.leftHand.data.model.components[0].forEach(component => {
                component.setFrame(leftHandFrame);
                this.kinematicRenderer.addComponent(component, 2);
            });
        }
        
        let headFrame = torsoFrame.translate(0, 0, TORSO_HEIGHT + SHOULDER_RADIUS + NECK_LENGTH).rotate_about_y(-leanAngle).translate(0, 0, HELMET_RADIUS);
        let helmetFrame = headFrame.rotate_about_y(-.2);
        this.kinematicRenderer.hemisphere(
            HELMET_RADIUS,
            HELMET_RADIUS,
            helmetFrame,
            this.getColor("helmet"),
            this.getColor("helmet"),
            2,
        );
        const num_steps = 7;
        const width = 5.0
        this.kinematicRenderer.cylinderProjection(
            HELMET_RADIUS - 0.07, HELMET_RADIUS - 0.07, HELMET_RADIUS + 0.04, HELMET_RADIUS + 0.04,
            -0.3,
            [
                ...Array(num_steps).fill(0).map((_, i) => ({
                    x: Math.PI - width / 2 + i * width / num_steps,
                    y: 0.1,
                })),
                ...Array(num_steps-1).fill(0).map((_, i) => ({
                    x: Math.PI + width / 2 - (i + 1) * width / num_steps,
                    y: 1.0,
                })),
            ],
            helmetFrame.rotate_about_z(Math.PI).translate(0, 0, 0.16),
            this.getColor("helmet"),
            2,
        );

        let faceFrame = helmetFrame.translate(0.02, 0, 0).rotate_about_y(Math.PI);
        this.kinematicRenderer.hemisphere(
            FACE_RADIUS,
            FACE_HEIGHT,
            faceFrame,
            this.getColor("face"),
            this.getColor("face"),
            2,
        );


        let headFrame2 = headFrame.translate(0, 0, 1);

        this.kinematicRenderer.cylinderProjection(
            GOGGLE_RADIUS,GOGGLE_RADIUS, GOGGLE_RADIUS, GOGGLE_RADIUS,
            GOGGLE_HEIGHT,
            [
                {'x': 2.356, 'y': 1.0},
                {'x': 2.553, 'y': 1.0},
                {'x': 2.749, 'y': 1.0},
                {'x': 2.945, 'y': 1.0},
                {'x': 3.142, 'y': 1.0},
                {'x': 3.338, 'y': 1.0},
                {'x': 3.534, 'y': 1.0},
                {'x': 3.731, 'y': 1.0},
                {'x': 3.927, 'y': 1.0},
                {'x': 3.927, 'y': 1.0},
                {'x': 3.731, 'y': 0.6},
                {'x': 3.534, 'y': 0.55},
                {'x': 3.338, 'y': 0.6},
                {'x': 3.142, 'y': 0.8},
                {'x': 2.945, 'y': 0.6},
                {'x': 2.749, 'y': 0.55},
                {'x': 2.553, 'y': 0.6},
                {'x': 2.356, 'y': 1.0},
            ],
            headFrame.translate(0, 0, -GOGGLE_HEIGHT),
            this.getColor("goggles"),
            3,
        );

      



        



        


    }

    draw(ctx) {
        this.kinematicRenderer.draw(ctx);
    }




}