import getModifiedSvg from './svg_utils.js';
import { MeleeWeapon, Gun } from './weapons.js';
import { KinematicRenderer } from './kinematic_renderer.js';

class Equipment {
    constructor(data) {
        this.data = data;
        this.image = null;

        this.weapon = null;
        this._isGun = false;
        this._isMelee = false;

        if (data.melee_weapon) {
            this.weapon = new MeleeWeapon(this);
            this._isMelee = true;
        }
        if (data.gun) {
            this.weapon = new Gun(this);
            this._isGun = true;
        }
    }
    
    equip(character, mobManager) {
        if (this.weapon) {
            this.weapon.equip(character, mobManager);
        }
    }
    isGun() {
        return this._isGun;
    }
    isMelee() {
        return this._isMelee;
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
    getHiddenStats() {
        return this.data.hidden_stats || {};
    }
    getDragMultiplier() {
        return this.getHiddenStats().dragMultiplier || 1;
    }
    getAllowUphill() {
        return this.getHiddenStats().allowUphill || false;
    }
    getLayerGroup() {
        return this.data.layer_group;
    }
    async loadImage() {
        console.log("loading image", this.data.shop_image, "with color changes", this.getColorChanges());
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
const SKIS_BASE = "#333333";
const SKIS_EXTRA = "#333334";

function makeSkis(displayName, description, price, color, speed, turning, edges, extraColor = undefined) {
    return new Equipment({
        id: "skis",
        layer_group: "skis",
        shop_image: "ski.svg",
        display_name: displayName,
        description: description,
        stats: {
            speed: speed,
            turning: turning,
            sharp_edges: edges
        },
        hidden_stats: {},
        slots: ["skis"],
        colors: {
            skis_base: color,
            skis_extra: extraColor || color
        },
        color_changes: [
            [SKIS_BASE, color],
            [SKIS_EXTRA, extraColor || color]
        ],
        unhide: ["skis"],
        price: price
    })
}

const turningColors = ["#133c55","#386fa4","#59a5d8","#84d2f6","#91e5f6"];
const speedColors = ["#e89005","#ec7505","#d84a05","#f42b03","#e70e02"];
const edgeColors = ["#642ca9","#ff36ab","#ff74d4","#ffb8de","#ffdde1"];

const speedWords = ["Slow", "Medium", "Waxed", "Fast", "Danger", "Epic"];
const turningWords = ["Awkward", "Balanced", "Agile", "Nimble", "Topsy-Turny", "Tornado"];
const edgeWords = ["Drifty", "Sliding", "", "Griping", "Razor", "Monofilament"];

const allSkis = [];

function getSkiName(speed, turning, edge) {
    return "MK" + speed + "-T" + turning + "-E" + edge;
}
function getSkiDescription(speed, turning, edge) {
    return [speedWords[speed - 1] + " " + turningWords[turning - 1] + " " + edgeWords[edge - 1] + " Skis"];
}
// speed primary
for (let speed = 3; speed <= 6; speed++) {
    allSkis.push(makeSkis(getSkiName(speed, 2, 2), getSkiDescription(speed, 2, 2), 50 * speed, speedColors[speed - 2], speed, 2, 2));
    // turning secondary
    for (let turning = 3; turning < speed; turning++) {
        allSkis.push(makeSkis(getSkiName(speed, turning, 2), getSkiDescription(speed, turning, 2), 50 * speed + 50 * turning, speedColors[speed - 2], speed, turning, 2, turningColors[turning - 2]));
    }
    // edge secondary
    for (let edge = 3; edge < speed; edge++) {
        allSkis.push(makeSkis(getSkiName(speed, 2, edge), getSkiDescription(speed, 2, edge), 50 * speed + 50 * edge, speedColors[speed - 2], speed, 2, edge, edgeColors[edge - 2]));
    }
}
// Turning Primary
for (let turning = 3; turning <= 6; turning++) {
    allSkis.push(makeSkis(getSkiName(2, turning, 2), getSkiDescription(2, turning, 2), 50 * turning, turningColors[turning - 2], 2, turning, 2));
    // speed secondary
    for (let speed = 3; speed < turning; speed++) {
        allSkis.push(makeSkis(getSkiName(speed, turning, 2), getSkiDescription(speed, turning, 2), 50 * turning + 50 * speed, turningColors[turning - 2], speed, turning, 2, speedColors[speed - 2]));
    }
    // edge secondary
    for (let edge = 3; edge < turning; edge++) {
        allSkis.push(makeSkis(getSkiName(2, turning, edge), getSkiDescription(2, turning, edge), 50 * turning + 50 * edge, turningColors[turning - 2], 2, turning, edge, edgeColors[edge - 2]));
    }
}
// Edge Primary
for (let edge = 3; edge <= 6; edge++) {
    allSkis.push(makeSkis(getSkiName(2, 2, edge), getSkiDescription(2, 2, edge), 50 * edge, edgeColors[edge - 2], 2, 2, edge));
    // speed secondary
    for (let speed = 3; speed < edge; speed++) {
        allSkis.push(makeSkis(getSkiName(speed, 2, edge), getSkiDescription(speed, 2, edge), 50 * edge + 50 * speed, edgeColors[edge - 2], speed, 2, edge, speedColors[speed - 2]));
    }
    // turning secondary
    for (let turning = 3; turning < edge; turning++) {
        allSkis.push(makeSkis(getSkiName(2, turning, edge), getSkiDescription(2, turning, edge), 50 * edge + 50 * turning, edgeColors[edge - 2], 2, edge, turning, turningColors[turning - 2]));
    }
}

export const regularSkis = makeSkis("Regular Skis", ["A pair of regular skis"], 50, "#333333", 2, 2, 2);
export const speedSkis = makeSkis("Speed Skis", ["The fastest skis in the world"], 800, "#D62246", 6, 1, 2);
export const turningSkis = makeSkis("Turning Skis", ["Razor edged"], 800, "#FFF200", 2, 6, 4);
export const edgeSkis = makeSkis("Edge Skis", ["Razor edge skis"], 800, "#0F7173", 2, 3, 6);

export const uphillSkis = makeSkis("Uphill Skis", ["Ski backwards!"], 800, "#BC9EC1", 2, 3, 4);
allSkis.push(uphillSkis);

uphillSkis.data.hidden_stats.allowUphill = true;



function makeSpeedJacket() {
    return new Equipment({
        id: "speed_jacket",
        layer_group: "jacket",
        shop_image: "jacket.svg",   
        display_name: "Speed Jacket",
        description: ["Reduces drag by 10%"],
        stats: {
            armor: 1
        },
        hidden_stats: {
            dragMultiplier: 0.9,
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

function makeFlintlock() {
    const pistolModel = new KinematicRenderer();
    const pistolModelFrame = pistolModel.frame();
    pistolModel.lineSegment(
        [{x: 0, y: 0, z: 0.15}, {x: 0.85, y: 0, z: .15}],
        pistolModelFrame,
        "#784421",
        0.2,
        0,
    );
    pistolModel.ball(
        {x: 0.9, y: 0, z: .18},
        .08,
        pistolModelFrame,
        "#d8a700",
        0,
    );
    pistolModel.ball(
        {x: 0.4, y: 0, z: .2},
        .08,
        pistolModelFrame,
        "#999999",
        0,
    );
    return new Equipment({
        id: "flintlock",
        layer_group: "flintlock",
        shop_image: "flintlock.svg",
        display_name: "Flintlock",
        description: ["A Pirate's Favorite. Yarrr!"],
        stats: {
        speed: 1,
        damage: 1
        },
        slots: ["right_hand", "left_hand"],
        unhide: ["flintlock"],
        gun: {
            coolDown: 2.5,
            damage: 5,
            knockback: 80000,
            firingArc: 35,
            firingDistance: 300,
            hitPercentage: 0.7
        },
        price: 100,
        model: pistolModel
    })
};

function makeKlobb() {
    const klobbModel = new KinematicRenderer();
    const klobbModelFrame = klobbModel.frame();
    klobbModel.lineSegment(
        [{x: 0, y: 0, z: 0.15}, {x: 0.60, y: 0, z: .25}],
        klobbModelFrame,
        "#666666",
        0.35,
        0,
    );
    return new Equipment({
        id: "klobb",
        layer_group: "klobb",
        shop_image: "klobb.svg",
        display_name: "Klobb",
        description: ["I prefer slappers only"],
        stats: {
            speed: 1,
            damage: 1
        },
        slots: ["right_hand", "left_hand"],
        unhide: ["klobb"],
        gun: {
            coolDown: 0.01,
            damage: 0.3,
            knockback: 10000,
            firingArc: 45,
            firingDistance: 300,
            hitPercentage: 0.3
        },
        price: 100,
        model: klobbModel
    })
}
export const Klobb = makeKlobb();

export const Pistol = makePistol();
export const Pistol2 = makePistol();
export const Flintlock = makeFlintlock();

function makeFood(image, displayName, description, price, healthGain) {
    return new Equipment({
        id: "food",
        layer_group: "food",
        shop_image: image,
        display_name: displayName,
        description: [description, "Heals " + healthGain * 10 + "% of your health."],
        stats: {
            health: healthGain
        },
        slots: ["food"],
        price: price
    })
}

const chillibowl = makeFood("bread_bowl.svg", "Magma Chilli", "Magma Chilli in a bread bowl", 50, 5);
const yetiburger = makeFood("yetiburger.svg", "Yeti Burger", "The pinkest burger in the world", 70, 7);
const candybar = makeFood("candy.svg", "Candy Bar", "A candy bar", 20, 2);
const candy2 = makeFood("candy.svg", "Candy Bar", "A candy bar", 20, 2);

function getSkisForSale(character, numSkis) {
    const skis = character.getSkis();
    let currSpeed, currTurning, currEdge;
    if (skis) {
        currSpeed = skis.getStats().speed;
        currTurning = skis.getStats().turning;
        currEdge = skis.getStats().edge;
    } else {
        currSpeed = 2;
        currTurning = 2;
        currEdge = 2;
    }
    // Filter skis where sum is >= current sum and no stat is too much higher
    const currentSum = currSpeed + currTurning + currEdge;
    const validSkis = allSkis.filter(ski => {
        const stats = ski.getStats();
        const sum = stats.speed + stats.turning + stats.sharp_edges;
        
        // Check total sum is equal or higher
        if (sum < currentSum) {
            return false;
        }

        // Check no individual stat is more than 2 higher
        if (stats.speed > currSpeed + 2) return false;
        if (stats.turning > currTurning + 2) return false; 
        if (stats.sharp_edges > currEdge + 2) return false;

        return true;
    });

    // Shuffle and take requested number
    return validSkis
        .sort(() => Math.random() - 0.5)
        .slice(0, numSkis);

}

export function getItemsForSale(character) {
    let possible = getSkisForSale(character, 4).concat([Klobb, Flintlock, chillibowl, candybar, candy2, yetiburger,SpeedJacket, Sword, Pistol2, Pistol]);
    return possible.sort(() => Math.random() - 0.5).slice(0, 12);
}

export default Equipment;