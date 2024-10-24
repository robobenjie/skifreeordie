import { FallingSnowParticleEffect, SparkParticleEffect } from "./particle_engine.js";
import randomCentered, { Clickable, calculateFlyInOut } from "./utils.js";
import getModifiedSvg from "./svg_utils.js";
import { getItemsForSale } from "./equipment.js";
const HAMMER_RATE = 6;
const CHECKOUT_TEXT_COLOR = "#434741";
const SLOT_TO_GROUP_MAP = {
  "jacket": ["player_jacket"],
  "left_hand": ["left_glove"],
  "right_hand": ["right_glove"],
  "left_weapon": ["left_hand"],
  "right_weapon": ["right_hand"],
};
export class Shop {
  constructor(character, ctx, canvas) {
      this.character = character;
      this.chair = null;  // Initialize the chair as null
      this.purchaseChair = null;
      this.characterLeftLeg = null;
      this.characterRightLeg = null;
      this.characterLeftPants = null;
      this.characterRightPants = null;
      this.dwarfPaymentBicep = null;
      this.dwarfPaymentArm = null;
      this.cardReader = null;
      this.confirmLed = null;
      this.hammerBicep = null;
      this.hammerArm = null;
      this.overlay = null;
      this.cable = null;
      this.elapsedTime = 0;
      this.ctx = ctx;
      this.lastSnowTime = 0;
      this.snowRate = 120;
      this.signature = null;

      this.checkingOut = false;
      this.confirmLedReady = false;
      this.checkoutStartTime = 0;
      this.checkoutEndTime = -100;
      this.checkoutItem = null;
      this.selectedDraggable = null;
      this.chosenSlot = null;

      this.initItems();

      this.treesImages = [
        new Image(),
      ]
      this.treesImages[0].src = "images/big_tree_1.svg";

      this.trees = [];
      this.treeSpawnTime = 0;
      this.lastTreeSpawnTime = 0;

      this.snowEffect = new FallingSnowParticleEffect(1200);
      this.backgroundSnowEffect = new FallingSnowParticleEffect(1200);
      this.sparkEffect = new SparkParticleEffect(50);

      // Warm up the snow effects
      const warmUpDuration = 3;  // Simulate 10 seconds of snow
      const wind = -60;
      this.snowEffect.warmUp(ctx, warmUpDuration, wind, this.snowRate);
      this.backgroundSnowEffect.warmUp(ctx, warmUpDuration, wind, this.snowRate);

      this.canvas = canvas;
      this.clickables = [];  // New list to store clickable objects
      this.initializeClickables();  // New method to set up clickables
      this.clearImageEffects(); // Initialize the effects
      this.loadImages();


      this.draggableItems = [];
      this.dropAreas = [];
      this.initDraggableItems();
      this.initDropAreas();
  }

  startCheckout(draggable, item, slot) {
    this.checkingOut = true;
    this.confirmLedReady = false;
    this.checkoutStartTime = this.elapsedTime;
    this.checkoutItem = item;
    this.chosenSlot = slot;
    this.signature.clear();
    this.selectedDraggable = draggable;
  }

  endCheckout() {
    this.checkingOut = false;
    this.checkoutEndTime = this.elapsedTime;
    this.draggableItems.forEach(item => item.resetPosition());
  }

  initializeClickables() {
    // Example clickable for the card reader
    const cardReaderClickable = new Clickable(275, 730, 610, 830, this.canvas);
    this.clickables.push(cardReaderClickable);
    this.signature = new Signature(cardReaderClickable);

    cardReaderClickable.addDragEndListener(() => {
      if (this.signature.points.length > 20) {
        this.confirmLedReady = true;
      }
    });
    cardReaderClickable.addTapListener(() => {
      if (this.signature.points.length > 20) {
          this.confirmLedReady = true;
        }
    });

    const confirmLedClickable = new Clickable(590, 760, 970, 1150, this.canvas);
    this.clickables.push(confirmLedClickable);
    confirmLedClickable.addTapListener(() => {
      console.log("confirm tapped");
      if (this.confirmLedReady) {
        this.draggableItems = this.draggableItems.filter(item => item.item !== this.checkoutItem);
        this.endCheckout();
        this.character.equip(this.checkoutItem, this.chosenSlot);
        this.loadImages();
      }
    });

    const cancelLedClickable = new Clickable(230, 440, 970, 1150, this.canvas);
    this.clickables.push(cancelLedClickable);
    cancelLedClickable.addTapListener(() => {
      console.log("cancel tapped");
      this.endCheckout();
    });

    // Add more clickables as needed...
  }

  update(dt) {
      // Update logic here
      let wind = -60
      this.elapsedTime += dt;
      this.snowEffect.update(dt, wind, this.ctx);
      this.backgroundSnowEffect.update(dt, wind, this.ctx);
      if (!this.checkingOut && this.elapsedTime > this.checkoutEndTime + 1.0) {  
        if (Math.sin(this.elapsedTime * HAMMER_RATE) * Math.sin((this.elapsedTime - dt) * HAMMER_RATE) < 0) {
          this.hammerSparks()
        }
      }
      this.sparkEffect.update(dt);
      if (this.elapsedTime > this.lastSnowTime + 1 / this.snowRate) {
        let xpos = (Math.random() * 7 - 1) * this.ctx.canvas.width;
        let ypos = 0;
        this.snowEffect.emit(xpos, ypos, {x:0.0, y:80.0}, 10);
        xpos = (Math.random() * 4 - 1) * this.ctx.canvas.width;
        this.backgroundSnowEffect.emit(xpos, ypos, {x:0.0, y:80.0}, 15);
        this.lastSnowTime = this.elapsedTime;
      }
      if (this.elapsedTime > this.treeSpawnTime) {
        this.treeSpawnTime = this.elapsedTime + 6 + randomCentered(3);
        this.trees.push({
          x: this.ctx.canvas.width + this.treesImages[0].width / 2,
          y: 400 + randomCentered(100),
          age: 0,
          img: this.treesImages[0],
        });
      }
      for (let tree of this.trees) {
        tree.x -= 150 * dt;
        tree.y += 100 * dt;
        tree.age += dt;
        if (tree.x < -100) {
          this.trees.splice(this.trees.indexOf(tree), 1);
        }
      }

  }

  initItems() {
    this.forSaleItems = getItemsForSale(this.character);
  }

  hammerSparks() {
    for (let i = 0; i < 6 + randomCentered(5); i++) {
      let dir = -Math.PI / 2 + randomCentered(Math.PI / 2);
      let speed = 300 + randomCentered(100);
      let lifetime = 0.3 + randomCentered(0.2);
      this.sparkEffect.emit(570, 1460, {x:Math.cos(dir) * speed, y:Math.sin(dir) * speed}, lifetime, "#ff6601");
    }
  }

  draw(ctx) {
    function rotateInImageFrame(pivot, amount) {
      ctx.translate(pivot.x, pivot.y);
      ctx.rotate(amount);
      ctx.translate(-pivot.x, -pivot.y);
    }
    if (this.chair && this.cable && this.characterLeftLeg && this.characterRightLeg && this.characterLeftPants && this.characterRightPants && this.hammerBicep && this.hammerArm && this.cardReader && this.purchaseChair && this.confirmLed && this.overlay) {
      const checkingOut = this.checkingOut || this.elapsedTime < this.checkoutEndTime + 1.0;


      let height = ctx.canvas.height;
      const scale = height / this.chair.height;

      ctx.save();
      ctx.scale(scale, scale);

      let width = this.chair.width;
      height = this.chair.height;

      for (let tree of this.trees) {
        ctx.save();
        ctx.globalAlpha = Math.max(1 - tree.age / 5, 0);
        ctx.translate(tree.x + width / 2, tree.y + height / 2);
        ctx.scale(1 - tree.age / 10, 1 - tree.age / 10);
        
        ctx.drawImage(tree.img, -width / 2, -height / 2, width, height);
        ctx.restore();
      }

      ctx.save();
      ctx.scale(1/scale * 0.8, 1/ scale * 0.8);
      this.backgroundSnowEffect.draw(ctx);
      ctx.restore();

      // Draw the chair if the image is loaded
      ctx.translate(ctx.canvas.width / 2 / scale - width / 2, 0);
      // Update the transform for each clickable
      this.clickables.forEach(clickable => clickable.setCtxTransform(this.ctx));
      ctx.drawImage(this.cable, 0, 0, width, height);
      ctx.save();
      const pivot = {x: 530, y: 300};
      rotateInImageFrame(pivot, Math.sin(this.elapsedTime * 1) * 0.02);
      if (checkingOut) {
        ctx.drawImage(this.purchaseChair, 0, 0, width, height);
      } else {
        ctx.drawImage(this.chair, 0, 0, width, height);
      }
      this.dropAreas.forEach(area => area.setCtxTransform(this.ctx));

      if (!checkingOut) {
        // Dwarf Hammer Arm
        ctx.save(); {
          let amt = Math.sin(this.elapsedTime * HAMMER_RATE);
          amt = Math.pow(Math.abs(amt), 0.5);
          rotateInImageFrame({x: 692, y: 1325}, amt * 0.06);
          ctx.drawImage(this.hammerBicep, 0, 0, width, height);    
          rotateInImageFrame({x: 776, y: 1392}, amt * 0.22);
          ctx.drawImage(this.hammerArm, 0, 0, width, height);
        } ctx.restore();
      } else {
        // Dwarf Payment Arm
        let armRotation = 0;
        const maxArmRotation = -0.8
        if (this.checkingOut) {
          armRotation = calculateFlyInOut(maxArmRotation, 0, 0, 1.0, 1000, 1000, this.elapsedTime - this.checkoutStartTime);
        } else {
          armRotation = calculateFlyInOut(0, 0, maxArmRotation, 0, 0, 1.0, this.elapsedTime - this.checkoutEndTime);
        }
        ctx.save(); {
          rotateInImageFrame({x: 516, y: 1341}, armRotation);
          ctx.drawImage(this.dwarfPaymentBicep, 0, 0, width, height);    
          rotateInImageFrame({x: 451, y: 1420}, -armRotation);
          ctx.drawImage(this.dwarfPaymentArm, 0, 0, width, height);
        } ctx.restore();
      }

      // Right leg
      ctx.save(); {
        rotateInImageFrame({x:245, y:1506}, Math.sin(this.elapsedTime * 3) * 0.02);
        ctx.save(); {
          rotateInImageFrame({x:245, y: 1674}, Math.sin(this.elapsedTime * 3) * 0.1);
          ctx.drawImage(this.characterRightLeg, 0, 0, width, height);
        } ctx.restore()
        ctx.drawImage(this.characterRightPants, 0, 0, width, height);
      } ctx.restore();

      // Left leg
      ctx.save(); {
        rotateInImageFrame({x:346, y:1506}, Math.sin(this.elapsedTime * 3 + Math.PI) * 0.02);
        ctx.save(); {
          rotateInImageFrame({x:346, y: 1661}, Math.sin(this.elapsedTime * 3 + Math.PI) * 0.1);
          ctx.drawImage(this.characterLeftLeg, 0, 0, width, height);
        } ctx.restore()
        ctx.drawImage(this.characterLeftPants, 0, 0, width, height);
      }ctx.restore();

      this.sparkEffect.draw(ctx);

      ctx.restore(); // chair swing

      ctx.restore(); // scale & translate
      this.snowEffect.draw(ctx);

      // Checking out
      let y = -height;
      if (this.checkingOut) {
        y = calculateFlyInOut(-height * 0.65, 0, 0, 1.0, 1000, 1000, this.elapsedTime - this.checkoutStartTime);
      } else {
        y = calculateFlyInOut(0, 0, -height * 0.65, 0, 0, 1.0, this.elapsedTime - this.checkoutEndTime);
      }
      ctx.save();
      ctx.scale(scale, scale);



      ctx.translate(ctx.canvas.width / 2 / scale - width / 2, 0);
      if (!this.checkingOut) {
        this.drawStoreOverlay(ctx, width, height);
      } else if (this.selectedDraggable) {
        this.selectedDraggable.x = 680;
        this.selectedDraggable.y = 1600;
        ctx.fillStyle = "#ffffffaa";
        const rectsize = 300;  
        ctx.fillRect(this.selectedDraggable.x - rectsize / 2, this.selectedDraggable.y - rectsize / 2, rectsize, rectsize);
        this.selectedDraggable.draw(ctx);
      }
      ctx.translate(0, y);
      ctx.drawImage(this.cardReader, 0, 0, width, height);

      if (this.confirmLedReady && Math.sin(this.elapsedTime * 8) > 0) {
        ctx.drawImage(this.confirmLed, 0, 0, width, height);
      }
      drawCheckoutText(ctx, width, this.checkoutItem);
      this.signature.draw(ctx);
      ctx.restore();

    } else {
      console.log("no chair");
    }

    // You can add debug drawing for clickables if needed
    // this.clickables.forEach(clickable => {
    //     ctx.strokeStyle = 'red';
    //     ctx.strokeRect(clickable.x - clickable.width/2, clickable.y - clickable.height/2, clickable.width, clickable.height);
    // });
  }

  drawStoreOverlay(ctx, width, height) {
    ctx.drawImage(this.overlay, 0, 0, width, height);
    
    // Draw draggable items 
    this.draggableItems.forEach(item => {
      // Draw item name and cost
      ctx.font = '35px Roboto';
      ctx.fillStyle = CHECKOUT_TEXT_COLOR;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      
      const x = item.originalX;
      const y = item.originalY;
      // Draw item name
      ctx.fillText(item.item.getDisplayName(), x, y + item.height / 2 + 10);
      
      // Draw item cost
      ctx.fillText(`🥇 ${item.item.getPrice()}`, x, y + item.height / 2 + 55);
      item.draw(ctx);
    });
  }

  initDraggableItems() {
    const itemSize = 250;
    const itemSpacing = 10;
    const itemsPerRow = 3;
    const startX = 80;
    const startY = 150;

    this.forSaleItems.forEach((item, index) => {
        const row = Math.floor(index / itemsPerRow);
        const col = index % itemsPerRow;
        const x = startX + col * (itemSize + itemSpacing) + itemSize / 2;
        const y = startY + row * (itemSize + itemSpacing) + itemSize / 2;

        const draggableItem = new DraggableItem(item, x, y, itemSize, itemSize, this.canvas, this);
        draggableItem.shop = this;
        this.draggableItems.push(draggableItem);
        this.clickables.push(draggableItem);
    });
  }

  initDropAreas() {
    let jacketDrop = new DropArea(160, 450, 1260, 1530, this.canvas, "jacket");
    this.dropAreas.push(jacketDrop);
    let rightHandDrop = new DropArea(150, 300, 1330, 1540, this.canvas, "right_hand");
    this.dropAreas.push(rightHandDrop);
    let leftHandDrop = new DropArea(300, 450, 1330, 1540, this.canvas, "left_hand");
    this.dropAreas.push(leftHandDrop);
  }

  clearImageEffects() {
    const effects = {stroke_red: [], stroke_green: [], stroke_yellow: [], ghost: []};
    if (JSON.stringify(this.currentEffects) !== JSON.stringify(effects)) {
      this.currentEffects = effects;
      this.loadImages();
    }
  }

  updateImageEffects(effectMapping) {
    const effects = {stroke_red: [], stroke_green: [], stroke_yellow: [], ghost: []};

    for (const [effectType, slots] of Object.entries(effectMapping)) {
        slots.forEach(slot => {
            const groups = SLOT_TO_GROUP_MAP[slot];
            effects.stroke_red = effects.stroke_red.filter(group => !groups.includes(group));
            effects.stroke_green = effects.stroke_green.filter(group => !groups.includes(group));
            effects.stroke_yellow = effects.stroke_yellow.filter(group => !groups.includes(group));
            effects.ghost = effects.ghost.filter(group => !groups.includes(group));
            if (groups && effectType) {
                effects[effectType].push(...groups);
            }
        });
    }

    console.log("new effects", effects);

    // Only call loadImages if the effects have changed
    if (JSON.stringify(this.currentEffects) !== JSON.stringify(effects)) {
        this.currentEffects = effects;
        this.loadImages();
    }
  }

  loadImages() {
    const allEquipment = this.character.getAllEquipment();
    let replaceColors = [];
    let show = [];
    let strokeYellow = this.currentEffects.stroke_yellow || [];
    let strokeGreen = this.currentEffects.stroke_green || [];
    let ghost = this.currentEffects.ghost || [];

    for (let slot in allEquipment) {
        let item = allEquipment[slot];
        if (item) {
            replaceColors.push(...item.getColorChanges());
            if (slot === "left_hand" || slot === "right_hand") {
                show.push(...item.getUnhide().map(unhide => `${slot}.${unhide}`));
            } else {
                show.push(...item.getUnhide());
            }
        }
    }

    getModifiedSvg("images/shop_lift.svg", "chair", {
        replace_colors: replaceColors,
        hide: ["player_left_leg", "player_right_leg", "dwarf_payment_arm", "dwarf_payment_bicep", "dwarf_payment_head", "left_pants", "right_pants", "hammer_arm_bicep", "hammer_arm"],
        show: show,
        stroke_yellow: strokeYellow,
        stroke_green: strokeGreen,
        ghost: ghost
    }).then(img => {
        this.chair = img;
    }).catch(err => {
        console.error("Error loading chair image:", err);
    });

    getModifiedSvg("images/shop_lift.svg", "chair", {
        replace_colors: replaceColors,
        hide: ["dwarf_head", "dwarf_right_arm", "dwarf_payment_arm", "dwarf_payment_bicep", "left_pants", "right_pants", "player_left_leg", "player_right_leg"],
        show: show
    }).then(img => {
        this.purchaseChair = img;
    }).catch(err => {
        console.error("Error loading purchase chair image:", err);
    });

    getModifiedSvg("images/shop_lift.svg", "cable", {
        replace_colors: [],
        hide: [""]
    }).then(img => {
        this.cable = img;
    }).catch(err => {
        console.error("Error loading cable image:", err);
    });

    getModifiedSvg("images/shop_lift.svg", "dwarf_payment_arm", {
        replace_colors: [],
        hide: []
    }).then(img => {
        this.dwarfPaymentArm = img;
    }).catch(err => {
        console.error("Error loading dwarf payment arm image:", err);
    });

    getModifiedSvg("images/shop_lift.svg", "dwarf_payment_bicep", {
        replace_colors: [],
        hide: []
    }).then(img => {
        this.dwarfPaymentBicep = img;
    }).catch(err => {
        console.error("Error loading dwarf payment bicep image:", err);
    });

    getModifiedSvg("images/shop_lift.svg", "player_left_leg", {
        replace_colors: replaceColors,
        hide: [""],
        show: show
    }).then(img => {
        this.characterLeftLeg = img;
    }).catch(err => {
        console.error("Error loading character left leg image:", err);
    });

    getModifiedSvg("images/shop_lift.svg", "player_right_leg", {
        replace_colors: replaceColors,
        hide: [""],
        show: show
    }).then(img => {
        this.characterRightLeg = img;
    }).catch(err => {
        console.error("Error loading character right leg image:", err);
    });

    getModifiedSvg("images/shop_lift.svg", "left_pants", {
        replace_colors: replaceColors,
        hide: [""],
        show: show
    }).then(img => {
        this.characterLeftPants = img;
    }).catch(err => {
        console.error("Error loading character left pants image:", err);
    });

    getModifiedSvg("images/shop_lift.svg", "right_pants", {
        replace_colors: replaceColors,
        hide: [""],
        show: show
    }).then(img => {
        this.characterRightPants = img;
    }).catch(err => {
        console.error("Error loading character right pants image:", err);
    });

    getModifiedSvg("images/shop_lift.svg", "hammer_arm_bicep", {
        replace_colors: [],
        hide: [""]
    }).then(img => {
        this.hammerBicep = img;
    }).catch(err => {
        console.error("Error loading hammer bicep image:", err);
    });

    getModifiedSvg("images/shop_lift.svg", "hammer_arm", {
        replace_colors: [],
        hide: [""]
    }).then(img => {
        this.hammerArm = img;
    }).catch(err => {
        console.error("Error loading hammer arm image:", err);
    });

    getModifiedSvg("images/shop_lift.svg", "card_reader", {
        replace_colors: [],
        hide: ["confirm_led"]
    }).then(img => {
        this.cardReader = img;
    }).catch(err => {
        console.error("Error loading card reader image:", err);
    });

    getModifiedSvg("images/shop_lift.svg", "confirm_led", {
        replace_colors: [],
        hide: []
    }).then(img => {
        this.confirmLed = img;
    }).catch(err => {
        console.error("Error loading confirm led image:", err);
    });
    getModifiedSvg("images/shop_lift.svg", "store_overlay", {
        replace_colors: [],
        hide: []
    }).then(img => {
        this.overlay = img;
    }).catch(err => {
        console.error("Error loading overlay image:", err);
    });
  }
}

function drawCheckoutText(ctx, width, item) {
  ctx.fillStyle = CHECKOUT_TEXT_COLOR;
  ctx.font = "40px Pixelify Sans";
  ctx.textAlign = "center";
  let y = 279;
  let x = 289;

  const bigGap = 41;
  const smallGap = 31;

  ctx.fillText("Swords and Boards", width / 2, y);
  y += smallGap;
  //ctx.font = "30px Pixelify Sans";
  //ctx.fillText("Equipment Rental", width / 2, y);
  //y += bigGap;
  if (!item) {
    return;
  }
  ctx.textAlign = "left";
  ctx.font = "40px Tiny5";
  ctx.fillText("----------------------", x, y);
  y += bigGap;
  ctx.fillText(item.getDisplayName().toUpperCase(), x, y);
  y += bigGap;
  ctx.font = "35px Tiny5";
  for (let [stat, value] of Object.entries(item.getStats())) {
    let statText = stat.toUpperCase() + ' - ' + 'X '.repeat(value);
    ctx.fillText(statText, x, y);
    y += smallGap;
  }
  ctx.fillText(item.getDescription()[0] || "", x, y);
  y += smallGap;
  ctx.fillText(item.getDescription()[1] || "", x, y);
  y = 547;
  ctx.font = "40px Tiny5";
  ctx.fillText("----------------------", x, y);
  y += smallGap;
  ctx.font = "40px Tiny5";
  ctx.fillText("RENTAL FEE", x, y)
  ctx.textAlign = "right";
  ctx.fillText(`${item.getPrice()} GM`, width - x, y);
  ctx.textAlign = "left";
  y += smallGap;
  ctx.fillText("----------------------", x, y);
  y += smallGap;
  ctx.fillText("Signature:", x, y);
}

class Signature {
    constructor(clickable) {
        this.clickable = clickable;
        this.points = [];
        this.isDrawing = false;
        this.wasDrawing = false;
        this.pixelSize = 6; // Size of each "pixel" in the signature

        this.clickable.addDragStartListener((x, y) => this.startDrawing(x, y));
        this.clickable.addDragMoveListener((x, y) => this.addPoint(x, y));
        this.clickable.addDragEndListener(() => this.stopDrawing());
    }

    clear() {
      this.points = [];
    }

    startDrawing(x, y) {
        this.isDrawing = true;
        this.addPoint(x, y);
    }

    addPoint(x, y) {
        if (this.isDrawing) {
            // Ensure x and y are valid numbers
            if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y)) {
                console.warn('Invalid coordinates:', x, y);
                return;
            }

            // Discretize the point to align with our pixel grid
            const discreteX = Math.floor(x / this.pixelSize) * this.pixelSize;
            const discreteY = Math.floor(y / this.pixelSize) * this.pixelSize;

            if (!this.clickable.isPointInside(discreteX, discreteY)) {
                return;
            }
            
            // Prevent adding [0,0] unless it's the first point and intentional
            if (discreteX === 0 && discreteY === 0 && this.points.length > 0) {
                console.warn('Skipping [0,0] point');
                return;
            }

            if (this.points.length > 0 && this.wasDrawing) {
                const lastPoint = this.points[this.points.length - 1];
                const dx = discreteX - lastPoint.x;
                const dy = discreteY - lastPoint.y;
                const steps = Math.max(Math.abs(dx), Math.abs(dy)) / this.pixelSize;
                
                if (steps > 1) {
                    for (let i = 1; i <= steps; i++) {
                        const t = i / steps;
                        const interpolatedX = Math.round(lastPoint.x + dx * t);
                        const interpolatedY = Math.round(lastPoint.y + dy * t);
                        if (interpolatedX !== 0 || interpolatedY !== 0 || this.points.length === 0) {
                            this.points.push({x: interpolatedX, y: interpolatedY});
                        }
                    }
                } else {
                    this.points.push({x: discreteX, y: discreteY});
                }
            } else {
                this.points.push({x: discreteX, y: discreteY});
                this.wasDrawing = true;
            }
                        
        }
    }

    stopDrawing() {
        this.isDrawing = false;
        this.wasDrawing = false;
    }

    draw(ctx) {
        ctx.fillStyle = "#434741"; // Black color for the signature
        for (let point of this.points) {
            ctx.fillRect(point.x, point.y, this.pixelSize, this.pixelSize);
        }
    }

    clear() {
        this.points = [];
    }
}

class DraggableItem extends Clickable {
    constructor(item, x, y, width, height, canvas, shop) {
        super(x - width / 2, x + width / 2, y - height / 2, y + height / 2, canvas);
        this.item = item;
        this.originalX = x;
        this.originalY = y;
        this.isDragging = false;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.shop = shop;
        this.currentSlot = null;

        this.addDragStartListener(this.onDragStart.bind(this));
        this.addDragMoveListener(this.onDragMove.bind(this));
        this.addDragEndListener(this.onDragEnd.bind(this));
    }

    onDragStart(x, y) {
        this.isDragging = true;
        this.dragOffsetX = x - this.x;
        this.dragOffsetY = y - this.y;
        this.shop.updateImageEffects({stroke_yellow: this.item.getSlots()});
    }

    onDragMove(x, y) {
        if (this.isDragging) {
            this.x = x - this.dragOffsetX;
            this.y = y - this.dragOffsetY;

            let newSlot = null;
            for (const area of this.shop.dropAreas) {
                if (area.isPointInside(x, y) && this.item.getSlots().includes(area.slotName)) {
                    newSlot = area.slotName;
                    break;
                }
            }

            const effectMapping = {
                stroke_yellow: [],
                stroke_green: [],
                ghost: []
            };

            if (newSlot) {
              effectMapping.stroke_green.push(newSlot);
                  if (newSlot === 'left_hand') {
                      effectMapping.ghost.push('left_weapon');
                  } 
                  if (newSlot === 'right_hand') {
                      effectMapping.ghost.push('right_weapon');
                  }
              }


            const unhoveredSlots = this.item.getSlots().filter(slot => slot !== newSlot);
            effectMapping.stroke_yellow.push(...unhoveredSlots);

            console.log(effectMapping);

            this.shop.updateImageEffects(effectMapping);
        }
    }

    onDragEnd(x, y) {
        this.isDragging = false;
        this.shop.updateImageEffects([], 'reset');
        if (!this.isDroppedInValidArea(x, y)) {
            this.resetPosition();
        }
        this.shop.clearImageEffects();
    }

    resetPosition() {
        this.x = this.originalX;
        this.y = this.originalY;
    }

    isDroppedInValidArea(x, y) {
        for (const area of this.shop.dropAreas) {
            if (area.isPointInside(x, y) && this.item.getSlots().includes(area.slotName)) {
                this.shop.startCheckout(this, this.item, area.slotName);
                return true;
            }
        }
        return false;
    }

    draw(ctx) {
        const image = this.item.getImage();
        if (image) {
            let maxSize = Math.max(image.width, image.height);
            let scale = this.width / maxSize;
            let scaledWidth = image.width * scale;
            let scaledHeight = image.height * scale;
            ctx.drawImage(image, this.x - scaledWidth / 2, this.y - scaledHeight / 2, scaledWidth, scaledHeight);
        }
    }
}

class DropArea extends Clickable   {
  constructor(minX, maxX, minY, maxY, canvas, slotName) {
    super(minX, maxX, minY, maxY, canvas);
    this.slotName = slotName;
  }
}

export default Shop;
