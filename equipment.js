import getModifiedSvg from './svg_utils.js';

class Equipment {
    constructor(data) {
        this.data = data;
        this.image = null;
    }
    getID() {
        return this.data.id;
    }
    getSlots() {
        return this.data.slots || [];
    }
    getShopImage() {
        return this.data.shop_image;
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
                `images/${this.getShopImage()}`,
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

}

export const SpeedJacket = new Equipment({
    id: "speed_jacket",
    layer_group: "jacket",
    shop_image: "jacket.svg",
    display_name: "Speed Jacket",
    description: "Increases speed by 10%",
    slots: ["jacket"],
    color_changes: [
            ["#ff6600ff", "#00FFFF"],
            ["#d45500ff", "#00AAAA"]
    ],
    price: 400
})

export function getItemsForSale(character) {
    return [SpeedJacket];
}

export default Equipment;