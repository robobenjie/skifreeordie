import { KinematicRenderer } from './kinematic_renderer.js';
import { LowPassFilter, throttledLog } from './utils.js';

const HILL_SLOPE = 15; // degrees

const DARK = "#222222"
const GRAY = "#DAD7CD"
const BLUE = "#1C5D99"
const RED = "#E54B4B"
const CORAL = "#EB8A90"
const SKIN = "#83BCA9"

const FRONT_PANEL_BACK_WIDTH = 3.0;
const FRONT_PANEL_FRONT_WIDTH = 2.0;
const FRONT_PANEL_LENGTH = 3.5;
const FRONT_PANEL_BACK_HEIGHT = 3;
const FRONT_PANEL_FRONT_HEIGHT = 2;
const FRONT_PANEL_X_OFFSET = 1.0;
const NOSE_BOTTOM_HEIGHT = 1.0
const SKI_SPACING = 4.5;
const SKI_LENGTH = 4.0;
const SKI_WIDTH = 1;

const BASE_LENGTH = 5.0;
const BACK_HEIGHT = 1.0;

const SEAT_HEIGHT = NOSE_BOTTOM_HEIGHT + 2.0;

export class SnowmobileModel {
    constructor() {
        this.model = new KinematicRenderer(4);
        let worldFrame = this.model.frame();
        const hillFrame = worldFrame.rotate_about_y(HILL_SLOPE * Math.PI / 180);
        let baseFrame = hillFrame.rotate_about_z(0, "neg_ski_angle", true);
        let frontPanelFrame = baseFrame.translate(FRONT_PANEL_X_OFFSET, 0, 0).rotate_about_z(0, "steering_angle", true);

        // Front panel top
        this.model.polygon(
            [
                {x: 0, y: -FRONT_PANEL_BACK_WIDTH / 2, z: FRONT_PANEL_BACK_HEIGHT},
                {x: 0, y: FRONT_PANEL_BACK_WIDTH / 2, z: FRONT_PANEL_BACK_HEIGHT},
                {x: 0 + FRONT_PANEL_LENGTH, y: FRONT_PANEL_FRONT_WIDTH / 2, z: FRONT_PANEL_FRONT_HEIGHT},
                {x: 0 + FRONT_PANEL_LENGTH, y: -FRONT_PANEL_FRONT_WIDTH / 2, z: FRONT_PANEL_FRONT_HEIGHT},
            ],
            frontPanelFrame,
            DARK,
            1,
        );
        const stripe_width = 0.5;
        this.model.lineSegment(
            [
                {x: 0, y: -stripe_width / 2, z: FRONT_PANEL_BACK_HEIGHT},
                {x: 0 + FRONT_PANEL_LENGTH, y: -stripe_width / 2, z: FRONT_PANEL_FRONT_HEIGHT},
                {x: 0 + FRONT_PANEL_LENGTH, y: stripe_width / 2, z: FRONT_PANEL_FRONT_HEIGHT},
                {x: 0, y: stripe_width / 2, z: FRONT_PANEL_BACK_HEIGHT},
            ],
            frontPanelFrame,
            RED,
            0.2,
            2,
        )
        this.model.lineSegment(
            [
                {x: 0, y: -FRONT_PANEL_BACK_WIDTH / 2, z: FRONT_PANEL_BACK_HEIGHT + 0.1},
                {x: 0, y: FRONT_PANEL_BACK_WIDTH / 2, z: FRONT_PANEL_BACK_HEIGHT + 0.1},
            ],
            frontPanelFrame,
            RED,
            0.2,
            1,
        )
        const left_handle_tip = {x: -1, y: FRONT_PANEL_BACK_WIDTH / 2 + 1.5, z: FRONT_PANEL_BACK_HEIGHT + 0.5, frame: frontPanelFrame};
        const right_handle_tip = {x: -1, y: -FRONT_PANEL_BACK_WIDTH / 2 - 1.5, z: FRONT_PANEL_BACK_HEIGHT + 0.5, frame: frontPanelFrame};
        this.model.addMirroredAboutY(
            this.model.lineSegment(
                [
                    {x: 0, y: FRONT_PANEL_BACK_WIDTH / 2, z: FRONT_PANEL_BACK_HEIGHT + 0.1},
                    left_handle_tip,
                ],
                frontPanelFrame,
                RED,
                0.2,
                1,
            ),
            1,
        );
        // front panel left side
        const leftSide = this.model.polygon(
            [
                {x: 0, y: -FRONT_PANEL_BACK_WIDTH / 2, z: FRONT_PANEL_BACK_HEIGHT},
                {x: 0, y: -FRONT_PANEL_BACK_WIDTH / 2, z: NOSE_BOTTOM_HEIGHT},
                {x: 0 + FRONT_PANEL_LENGTH, y: -FRONT_PANEL_FRONT_WIDTH / 2, z: NOSE_BOTTOM_HEIGHT},
                {x: 0 + FRONT_PANEL_LENGTH, y: -FRONT_PANEL_FRONT_WIDTH / 2, z: FRONT_PANEL_FRONT_HEIGHT},
            ],
            frontPanelFrame,
            BLUE,
            1,
        );
        // front panel right side
        this.model.addMirroredAboutY(leftSide, 1);
        // front panel front
        this.model.polygon(
            [
                {x: 0 + FRONT_PANEL_LENGTH, y: -FRONT_PANEL_FRONT_WIDTH / 2, z: FRONT_PANEL_FRONT_HEIGHT},
                {x: 0 + FRONT_PANEL_LENGTH, y: FRONT_PANEL_FRONT_WIDTH / 2, z: FRONT_PANEL_FRONT_HEIGHT},
                {x: 0 + FRONT_PANEL_LENGTH, y: FRONT_PANEL_FRONT_WIDTH / 2, z: NOSE_BOTTOM_HEIGHT},
                {x: 0 + FRONT_PANEL_LENGTH, y: -FRONT_PANEL_FRONT_WIDTH / 2, z: NOSE_BOTTOM_HEIGHT},
            ],
            frontPanelFrame,
            BLUE,
            1,
        );

        // SKIs
        const ski_tip = 0.75;
        const leftSkis = this.model.polygon(
            [
                {x: -2, y: -SKI_SPACING / 2 - SKI_WIDTH/2, z: 0},
                {x: -2 + SKI_LENGTH, y: -SKI_SPACING / 2 - SKI_WIDTH/2, z: 0},
                {x: -2 + SKI_LENGTH + 2 * ski_tip, y: -SKI_SPACING / 2 - SKI_WIDTH/2, z: ski_tip},
                {x: -2 + SKI_LENGTH + 3 * ski_tip, y: -SKI_SPACING / 2, z: ski_tip * 1.5},
                {x: -2 + SKI_LENGTH + 2 * ski_tip, y: -SKI_SPACING / 2 + SKI_WIDTH/2, z: ski_tip},
                {x: -2 + SKI_LENGTH, y: -SKI_SPACING / 2 + SKI_WIDTH/2, z: 0},
                {x: -2, y: -SKI_SPACING / 2 + SKI_WIDTH/2, z: 0},
            ],
            frontPanelFrame,
            DARK,
            0
        );
        this.model.addMirroredAboutY(leftSkis, 0);

        this.model.addMirroredAboutY(
            this.model.lineSegment(
                [
                    {x: 0, y: FRONT_PANEL_BACK_WIDTH / 2, z: NOSE_BOTTOM_HEIGHT+ 0.5},
                    {x: 1, y: SKI_SPACING / 2, z: 0},

                ],
                frontPanelFrame,
                RED,
                0.5,
                1,
            )
        , 1);

        // Front Base Plate
        this.model.polygon(
            [
                {x: 0, y: -FRONT_PANEL_BACK_WIDTH / 2, z: NOSE_BOTTOM_HEIGHT},
                {x: FRONT_PANEL_LENGTH, y: -FRONT_PANEL_FRONT_WIDTH / 2, z: NOSE_BOTTOM_HEIGHT},
                {x: FRONT_PANEL_LENGTH, y: FRONT_PANEL_FRONT_WIDTH / 2, z: NOSE_BOTTOM_HEIGHT},
                {x: 0, y: FRONT_PANEL_BACK_WIDTH / 2, z: NOSE_BOTTOM_HEIGHT},
                {x: -FRONT_PANEL_BACK_WIDTH / 2, y: 0, z: NOSE_BOTTOM_HEIGHT},
            ],
            frontPanelFrame,
            DARK,
            0,
        )


        // Back Base Plate
        this.model.polygon(
            [
                {x: FRONT_PANEL_X_OFFSET, y: FRONT_PANEL_BACK_WIDTH / 2, z: NOSE_BOTTOM_HEIGHT},
                {x: FRONT_PANEL_X_OFFSET, y: -FRONT_PANEL_BACK_WIDTH / 2, z: NOSE_BOTTOM_HEIGHT},
                {x: -BASE_LENGTH, y: -FRONT_PANEL_BACK_WIDTH / 2, z: NOSE_BOTTOM_HEIGHT},
                {x: -BASE_LENGTH, y: FRONT_PANEL_BACK_WIDTH / 2, z: NOSE_BOTTOM_HEIGHT},
            ],
            baseFrame,
            DARK,
            0,
        );

        const backCornersUp = 1.5
        const backCornersIn = 0.8

        const back_wall_lean_back = 1.2;
        // Back Base Left Wall
        const leftBackWall = this.model.polygon(
            [
                {x: 0, y: -FRONT_PANEL_BACK_WIDTH / 2, z: NOSE_BOTTOM_HEIGHT},
                {x: -BASE_LENGTH, y: -FRONT_PANEL_BACK_WIDTH / 2, z: NOSE_BOTTOM_HEIGHT},
                {x: -BASE_LENGTH - back_wall_lean_back, y: -FRONT_PANEL_BACK_WIDTH / 2 + backCornersIn, z: NOSE_BOTTOM_HEIGHT + BACK_HEIGHT + backCornersUp},
                {x: 0, y: -FRONT_PANEL_BACK_WIDTH / 2, z: NOSE_BOTTOM_HEIGHT + BACK_HEIGHT},
            ],
            baseFrame,
            BLUE,
            1,
        );
        // Back Base Right Wall
        this.model.addMirroredAboutY(leftBackWall, 1);

        // Back Base Back Wall
        this.model.polygon(
            [
                {x: -BASE_LENGTH, y: FRONT_PANEL_BACK_WIDTH / 2, z: NOSE_BOTTOM_HEIGHT},
                {x: -BASE_LENGTH, y: -FRONT_PANEL_BACK_WIDTH / 2, z: NOSE_BOTTOM_HEIGHT},
                {x: -BASE_LENGTH - back_wall_lean_back, y: -FRONT_PANEL_BACK_WIDTH / 2 + backCornersIn, z: NOSE_BOTTOM_HEIGHT + BACK_HEIGHT + backCornersUp},
                {x: -BASE_LENGTH - back_wall_lean_back, y: FRONT_PANEL_BACK_WIDTH / 2 - backCornersIn, z: NOSE_BOTTOM_HEIGHT + BACK_HEIGHT + backCornersUp},
            ],
            baseFrame,
            BLUE,
            1,
        );

        const wheel_frame = baseFrame.rotate_about_x(Math.PI / 2);
        const wheel_radius = 0.7;
        const front_wheel_x = -2;
        const back_wheel_x = -4;
        this.model.addMirroredAboutZ(
            this.model.circle(
                {x: front_wheel_x, y: wheel_radius, z: FRONT_PANEL_BACK_WIDTH / 2},
                wheel_radius,
                wheel_frame,
                RED,
                0,
            )
        , 0);
        const back_wheel_radius = 1.2;
        this.model.addMirroredAboutZ(
            this.model.circle(
                {x: back_wheel_x, y: back_wheel_radius, z: FRONT_PANEL_BACK_WIDTH / 2},
                back_wheel_radius,
                wheel_frame,
                RED,
                0,
            )
        , 0);
        this.model.addMirroredAboutY(
            this.model.polygon(
                [
                    {x: back_wheel_x, y: FRONT_PANEL_BACK_WIDTH/2, z: 0},
                    {x: front_wheel_x, y: FRONT_PANEL_BACK_WIDTH/2, z: 0},
                    {x: front_wheel_x, y: FRONT_PANEL_BACK_WIDTH/2, z: 2 * wheel_radius},
                    {x: back_wheel_x, y: FRONT_PANEL_BACK_WIDTH/2, z: 2 * back_wheel_radius},
                ],
                baseFrame,
                RED,
                0,
            )
        , 0);

        // Seat
        const seat_back_radius = 0.8
        this.model.bodySegment(
            {
                position: {x: -1.5, y: 0, z: SEAT_HEIGHT},
                radius: 0.6,
                color: RED,
            },
            {
                position: {x: -BASE_LENGTH + 2, y: 0, z: SEAT_HEIGHT + 0.5},
                radius: seat_back_radius,
                color: CORAL,
            },
            baseFrame,
            RED,
            1,
        )

        // Body
        const butt_x = -1;
        const buttFrame = baseFrame.translate(butt_x, 0, SEAT_HEIGHT + seat_back_radius).rotate_about_y(0, "forward_lean", true).rotate_about_z(0, "torso_rotate", true)
        const torso_bottom_radius = 1.3;
        const torso_top_radius = 1.0;
        const torso_height = 2;
        this.model.bodySegment(
            {
                position: {x: 0, y: 0, z: torso_bottom_radius - 0.3},
                radius: torso_bottom_radius,
            },
            {
                position: {x: 0, y: 0, z: torso_height},
                radius: torso_top_radius,
                use_for_sort: true,
            },
            buttFrame,
            GRAY,
            2,
        )

        // Legs
        const leg_radius = 0.5;
        const knee = {
            position: {x: butt_x + 1, y: torso_bottom_radius - 1 * leg_radius, z: 2.5},
            radius: leg_radius,
        };
        this.model.addMirroredAboutY(
            this.model.bodySegment(
                {
                    position: {x: butt_x, y: torso_bottom_radius - leg_radius, z: SEAT_HEIGHT + seat_back_radius},
                    radius: leg_radius,
                },
                knee,
                baseFrame,
                RED,
                1,
            ),
            1,
        );

        this.model.addMirroredAboutY(
            this.model.bodySegment(
                knee,
                {
                    position: {x: butt_x + 1, y: torso_bottom_radius - 1 * leg_radius, z: 1},
                    radius: leg_radius,
                },
                baseFrame,
                RED,
                1,
            ),
            1,
        );

        // Head
        const head_frame = buttFrame.translate(0, 0, torso_height + torso_top_radius).rotate_about_z(0, "head_rotate", true).rotate_about_y(0, "head_tilt", true)
        this.model.ball(
            {x: 0, y: 0, z: 0},
            1.0,
            head_frame,
            SKIN,
            2,
        )
        const eye_frame = head_frame.rotate_about_y(Math.PI / 2);
        this.model.addMirroredAboutY(
            this.model.circle(
                {x: 0, y: -0.35 , z: 0.85},
                0.2,
                eye_frame,
                RED,
                2,
            )
        , 2);

        // Arms
        const arm_radius = 0.75;
        const elbow_dist = 2.5;
        const elbow_x = -1;
        const elbow_z = torso_height - 0.5;
        
        this.model.lineSegment(
            [
                {x: 0, y: torso_top_radius, z: torso_height},
                {x: elbow_x, y: elbow_dist, z: elbow_z},
                left_handle_tip,
            ],
            buttFrame,
            GRAY,
            arm_radius,
            2
        );
        this.model.lineSegment(
            [
                {x: 0, y: -torso_top_radius, z: torso_height},
                {x: elbow_x, y: -elbow_dist, z: elbow_z},
                right_handle_tip,
            ],
            buttFrame,
            GRAY,
            arm_radius,
            2
        );   
    }

    update(dt, skiAngle, steeringAngle, forwardLean) {

        this.model.update(
            dt, 
            {
                neg_ski_angle: -skiAngle,
                steering_angle: steeringAngle,
                forward_lean: forwardLean,
                torso_rotate: steeringAngle,
                head_rotate: steeringAngle,
                head_tilt: -forwardLean,
            }
        );
    }

    draw(ctx) {
        this.model.draw(ctx);
    }
}

export class SnowmobileTracks {
    constructor(camera) {
        this.camera = camera;
        this.tracks = [];
        this.distanceSinceLastTrack = 0;
        this.trackSpacing = 4;
    }
    update(dt, position, speed, velocity) {
        this.distanceSinceLastTrack += speed * dt;

        const unitNormalToVelocity = {x: -velocity.y / speed, y: velocity.x / speed};
        const trackWidth = 12;
        if (this.distanceSinceLastTrack > this.trackSpacing) {
            this.tracks.push(
                [
                    {x: position.x + unitNormalToVelocity.x * trackWidth, y: position.y + unitNormalToVelocity.y * trackWidth},
                    {x: position.x - unitNormalToVelocity.x * trackWidth, y: position.y - unitNormalToVelocity.y * trackWidth},
                ]
            );
            this.distanceSinceLastTrack = 0;
        }
        for (let i = 0; i < this.tracks.length; i++) {
            if (this.camera.distanceOffScreenY(this.tracks[i][0].y) < -20) {
                this.tracks.splice(i, 1);
                i--;
            } else {
                break;
            }
        }
        const maxTracks = 300;
        if (this.tracks.length > maxTracks) {
            this.tracks.splice(0, this.tracks.length - maxTracks);
        }
    }

    draw(ctx) {
        ctx.strokeStyle = "#E8E8F0";
        ctx.lineWidth = 6;
        ctx.beginPath();
        for (let track of this.tracks) {
            ctx.moveTo(track[0].x, track[0].y);
            ctx.lineTo(track[1].x, track[1].y);
        }
        ctx.stroke();
    }
}