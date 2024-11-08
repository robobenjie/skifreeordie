import getModifiedSvg from './svg_utils.js';
import { MeleeWeapon, Gun } from './weapons.js';
import { KinematicRenderer } from './kinematic_renderer.js';

class Equipment {
    constructor(data) {
        this.data = data;
        this.image = null;

        this.weapon = null;

        if (data.melee_weapon) {
            this.weapon = new MeleeWeapon(this);
        }
        if (data.gun) {
            this.weapon = new Gun(this);
        }
    }
    equip(character, mobManager) {
        if (this.weapon) {
            this.weapon.equip(character, mobManager);
        }
    }
    getID() {
        return this.data.id;
    }
    getSlots() {
        return this.data.slots || [];
    }
    getImage() {
        return this.image;
    }
    getColorChanges() {
        return this.data.color_changes || [];
    }
    getUnhide() {
        return this.data.unhide || [];
    }
    getPrice() {
        return this.data.price;
    }
    getDisplayName() {
        return this.data.display_name;
    }
    getDescription() {
        return this.data.description || [];
    }
    getStats() {
        return this.data.stats || {};
    }
    getLayerGroup() {
        return this.data.layer_group;
    }
    async loadImage() {
        try {
            this.image = await getModifiedSvg(
                `images/${this.data.shop_image}`,
                this.getLayerGroup(),
                {
                    replace_colors: this.getColorChanges(),
                    show: this.getUnhide()
                }
            );

        } catch (error) {
            console.error(`Failed to load image for ${this.getID()}:`, error);
        }
    }

    update(dt, hand) {
        if (this.weapon) {
            this.weapon.update(dt, hand);
        }
    }

    draw(ctx) {
        if (this.weapon) {
            this.weapon.draw(ctx);
        }
    }

}

const JACKET_BASE = "#ff6600";


function makeSpeedJacket() {
    return new Equipment({
        id: "speed_jacket",
        layer_group: "jacket",
        shop_image: "jacket.svg",   
        display_name: "Speed Jacket",
        description: ["Increases speed by 10%"],
        stats: {
        speed: 3,
        armor: 1
    },
    slots: ["jacket"],
    colors: {
        jacket_base: "#545E75",
            jacket_big_stripe: "#28a8ff",
            jacket_trim: "#fff200",
        },
        color_changes: [
            [JACKET_BASE, "#545E75"],
            ["#d45500", "#00aaaa"]
    ],
    unhide: ["jacket_trim_stripe", "jacket_big_stripe"],
        price: 150
    })
};

export const SpeedJacket = makeSpeedJacket();

function makeSword() {
    const swordModel = new KinematicRenderer();
    const handFrame = swordModel.frame();
    swordModel.bodySegment(
        {position: { x: 0, y: 0, z: 0.2 }, radius: 0.07},
        {position: { x: .3, y: 0, z: 1.5 }, radius: 0.04},
        swordModel.frame(),
        "#999999",
        0,
    );
    swordModel.bodySegment(
        {position: { x: 0.0, y: -0.2, z: .1 }, radius: 0.12},
        {position: { x: 0.0, y: 0.2, z: .1 }, radius: 0.12},
        handFrame,
        "#ffcc00",
        0,
    );
    swordModel.bodySegment(
        {position: { x: 0.0, y: 0.0, z: -0.1 }, radius: 0.1, skip: true},
        {position: { x: 0.0, y: 0.0, z: -0.2 }, radius: 0.1, skip: true},
        handFrame,
        "#ffcc00",
        0,
    );
    swordModel.ball(
        { x: 0.0, y: 0.0, z: -0.25 },
        .1,
        handFrame,
        "#ff0000",
        0,
    );
    return new Equipment({
        id: "sword",
        layer_group: "sword",
        shop_image: "sword.svg",
        display_name: "Sword",
        description: ["Elegant melee weapon"],
        stats: {
            speed: 1,
            reach: 2,
            damage: 1
        },
        slots: ["right_hand", "left_hand"],
        unhide: ["sword"],
        melee_weapon: {
            coolDown: 0.25,
            hitAreaHeight: 5,
            hitAreaWidth: 45,
            damage: 3.5,
            knockback: 50000
        },
        price: 100,
        model: swordModel
    })
};


export const Sword = makeSword();
export const Sword2 = makeSword();


function makePistol() {
    const pistolModel = new KinematicRenderer();
    const pistolModelFrame = pistolModel.frame();
    pistolModel.lineSegment(
        [{x: 0, y: 0, z: 0.15}, {x: 0.50, y: 0, z: .15}],
        pistolModelFrame,
        "#666666",
        0.2,
        0,
    );

    return new Equipment({
        id: "pistol",
        layer_group: "pistol",
        shop_image: "pistol.svg",
        display_name: "Pistol",
        description: ["A small pistol"],
        stats: {
        speed: 1,
        damage: 1
        },
        slots: ["right_hand", "left_hand"],
        unhide: ["pistol"],
        gun: {
            coolDown: 1,
            damage: 3.5,
            knockback: 50000,
            firingArc: 35,
            firingDistance: 300,
            hitPercentage: 0.9
        },
        price: 100,
        model: pistolModel
    })
};

export const Pistol = makePistol();
export const Pistol2 = makePistol();

export function getItemsForSale(character) {
    return [SpeedJacket, Sword, Pistol, SpeedJacket,SpeedJacket, Sword, Pistol2, SpeedJacket,SpeedJacket, Sword, Pistol, SpeedJacket];
}

export default Equipment;