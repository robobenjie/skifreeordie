import getModifiedSvg from './svg_utils.js';
import { MeleeWeapon, Gun } from './weapons.js';

class Equipment {
    constructor(data) {
        this.data = data;
        this.image = null;

        this.weapon = null;

        if (data.melee_weapon) {
            this.weapon = new MeleeWeapon(this.data.melee_weapon);
        }
        if (data.gun) {
            this.weapon = new Gun(this.data.gun);
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

    update(dt) {
        if (this.weapon) {
            this.weapon.update(dt);
        }
    }

    draw(ctx) {
        if (this.weapon) {
            this.weapon.draw(ctx);
        }
    }

}

const JACKET_BASE = "#ff6600";

export const SpeedJacket = new Equipment({
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
    color_changes: [
            [JACKET_BASE, "#545E75"],
            ["#d45500", "#00aaaa"]
    ],
    unhide: ["jacket_trim_stripe", "jacket_big_stripe"],
    price: 400
})

export const Sword = new Equipment({
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
        coolDown: 0.3,
        hitAreaHeight: 5,
        hitAreaWidth: 45,
        damage: 3.5,
        knockback: 50000
    },
    price: 250
})

export const Pistol = new Equipment({
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
    gun_data: {
        coolDown: 0.01,
        damage: 0.5,
        knockback: 10000,
        firingArc: 45,
        firingDistance: 300,
        hitPercentage: 0.3
    },
    price: 100,
})

export function getItemsForSale(character) {
    return [SpeedJacket, Sword, Pistol, SpeedJacket,SpeedJacket, Sword, Pistol, SpeedJacket,SpeedJacket, Sword, Pistol, SpeedJacket];
}

export default Equipment;