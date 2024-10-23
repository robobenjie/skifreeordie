import { FallingSnowParticleEffect, SparkParticleEffect } from "./particle_engine.js";
import randomCentered, { Clickable, calculateFlyInOut } from "./utils.js";

const HAMMER_RATE = 6;
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
      this.cable = null;
      this.elapsedTime = 0;
      this.ctx = ctx;
      this.lastSnowTime = 0;
      this.snowRate = 120;
      this.signature = null;

      this.checkingOut = true;
      this.confirmLedReady = false;
      this.checkoutStartTime = 0;
      this.checkoutEndTime = 0;

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
      this.loadImages();
      this.startCheckout();
  }

  startCheckout() {
    this.checkingOut = true;
    this.confirmLedReady = false;
    this.checkoutStartTime = this.elapsedTime;
  }

  endCheckout() {
    this.checkingOut = false;
    this.checkoutEndTime = this.elapsedTime;
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
        this.endCheckout();
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
    if (this.chair && this.cable && this.characterLeftLeg && this.characterRightLeg && this.characterLeftPants && this.characterRightPants && this.hammerBicep && this.hammerArm && this.cardReader && this.purchaseChair && this.confirmLed) {
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
      ctx.translate(ctx.canvas.width / 2 / scale - width / 2, y);
      ctx.drawImage(this.cardReader, 0, 0, width, height);

      if (this.confirmLedReady && Math.sin(this.elapsedTime * 8) > 0) {
        ctx.drawImage(this.confirmLed, 0, 0, width, height);
      }
      drawCheckoutText(ctx, width);
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

  loadImages() {

    getModifiedSvg("chair", {
      replace_colors: [["#ff6601", "#000000"]],
      hide: ["player_left_leg", "player_right_leg", "dwarf_payment_arm", "dwarf_payment_bicep", "dwarf_payment_head", "left_pants", "right_pants", "hammer_arm_bicep", "hammer_arm"]
    }).then(img => {
        this.chair = img;  // Set the chair image once it's ready
    }).catch(err => {
        console.error("Error loading chair image:", err);
    });

    getModifiedSvg("chair", {
      replace_colors: [],
      hide: ["dwarf_head", "dwarf_right_arm", "dwarf_payment_arm", "dwarf_payment_bicep", "left_pants", "right_pants", "player_left_leg", "player_right_leg"]
    }).then(img => {
      this.purchaseChair = img;
    }).catch(err => {
      console.error("Error loading purchase chair image:", err);
    });

    getModifiedSvg("cable", {
        replace_colors: [],
        hide: [""]
    }).then(img => {
        this.cable = img;
    }).catch(err => {
        console.error("Error loading cable image:", err);
    });

    getModifiedSvg("dwarf_payment_arm", {
      replace_colors: [],
      hide: []
    }).then(img => {
      this.dwarfPaymentArm = img;
    }).catch(err => {
      console.error("Error loading dwarf payment arm image:", err);
    });

    getModifiedSvg("dwarf_payment_bicep", {
      replace_colors: [],
      hide: []
    }).then(img => {
      this.dwarfPaymentBicep = img;
    }).catch(err => {
      console.error("Error loading dwarf payment bicep image:", err);
    });

    getModifiedSvg("player_left_leg", {
        replace_colors: [],
        hide: [""]
    }).then(img => {
        this.characterLeftLeg = img;
    }).catch(err => {
        console.error("Error loading character left leg image:", err);
    });

    getModifiedSvg("player_right_leg", {
        replace_colors: [],
        hide: [""]
    }).then(img => {
        this.characterRightLeg = img;
    }).catch(err => {
        console.error("Error loading character right leg image:", err);
    });

    getModifiedSvg("left_pants", {
        replace_colors: [],
        hide: [""]
    }).then(img => {
        this.characterLeftPants = img;
    }).catch(err => {
        console.error("Error loading character left pants image:", err);
    });

    getModifiedSvg("right_pants", {
        replace_colors: [],
        hide: [""]
    }).then(img => {
        this.characterRightPants = img;
    }).catch(err => {
        console.error("Error loading character right pants image:", err);
    });

    getModifiedSvg("hammer_arm_bicep", {
        replace_colors: [],
        hide: [""]
    }).then(img => {
        this.hammerBicep = img;
    }).catch(err => {
        console.error("Error loading hammer bicep image:", err);
    });

    getModifiedSvg("hammer_arm", {
        replace_colors: [],
        hide: [""]
    }).then(img => {
        this.hammerArm = img;
    }).catch(err => {
        console.error("Error loading hammer arm image:", err);
    });

    getModifiedSvg("card_reader", {
        replace_colors: [],
        hide: ["confirm_led"]
    }).then(img => {
        this.cardReader = img;
    }).catch(err => {
        console.error("Error loading card reader image:", err);
    });

    getModifiedSvg("confirm_led", {
      replace_colors: [],
      hide: []
    }).then(img => {
      this.confirmLed = img;
    }).catch(err => {
      console.error("Error loading confirm led image:", err);
    });
  }
}

function drawCheckoutText(ctx, width) {
  ctx.fillStyle = "#434741"
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
  ctx.textAlign = "left";
  ctx.font = "40px Tiny5";
  ctx.fillText("----------------------", x, y);
  y += bigGap;
  ctx.fillText("FLAMING LONGSWORD", x, y);
  y += bigGap;
  ctx.font = "35px Tiny5";
  ctx.fillText("DAMAGE - X X", x, y);
  y += smallGap;
  ctx.fillText("REACH - X X X X", x, y)
  y += smallGap;
  ctx.fillText("SPEED - X", x, y);
  y += bigGap;
  ctx.fillText("A long bladed weapon.", x, y);
  y += smallGap;
  ctx.fillText("Sets enemies on fire.", x, y);
  y += smallGap;
  ctx.font = "40px Tiny5";
  ctx.fillText("----------------------", x, y);
  y += smallGap;
  ctx.font = "40px Tiny5";
  ctx.fillText("RENTAL FEE", x, y)
  ctx.textAlign = "right";
  ctx.fillText("250 GM", width - x, y);
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


function getModifiedSvg(label, { replace_colors = [], hide = [] }) {
  return new Promise((resolve, reject) => {
    const svgObject = document.getElementById('shopSvg'); // Assuming the SVG is in an <object> tag

    if (svgObject.contentDocument) {
      // SVG is already loaded
      processSvg(svgObject.contentDocument);
    } else {
      // Wait for the SVG to load
      svgObject.addEventListener('load', () => {
        const svgDoc = svgObject.contentDocument;
        if (svgDoc) {
          processSvg(svgDoc);
        } else {
          reject(new Error('SVG contentDocument not available after load.'));
        }
      });
    }

    function processSvg(svgDoc) {
      // Get all <g> elements

      // Create a deep clone of the SVG document
      const clonedSvgDoc = svgDoc.cloneNode(true);
      
      // Use the cloned document for further processing
      svgDoc = clonedSvgDoc;

      const groups = svgDoc.getElementsByTagName('g');

      // Find the correct group with the matching `inkscape:label`
      let element = null;
      for (let group of groups) {
        const labelAttr = group.getAttributeNS('http://www.inkscape.org/namespaces/inkscape', 'label');
        if (labelAttr === label) {
          element = group;
          break;
        }
      }

      if (!element) {
        return reject(`No element found with label: ${label}`);
      }

      // Function to recursively collect all visible elements
      function collectVisibleElements(node, collection) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if the element is visible (not explicitly hidden)
          const computedStyle = window.getComputedStyle(node);
          if (computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden') {
            collection.push(node);
          }
        }
        for (let child of node.childNodes) {
          collectVisibleElements(child, collection);
        }
      }

      // Collect all visible elements in the SVG
      const allVisibleElements = [];
      collectVisibleElements(svgDoc.documentElement, allVisibleElements);

      // Function to check if an element is a descendant of another
      function isDescendant(parent, child) {
        if (child === parent) {
          return true;
        }
        let node = child.parentNode;
        while (node != null) {
          if (node === parent) {
            return true;
          }
          node = node.parentNode;
        }
        return false;
      }

      // Filter out elements that are descendants of our target element
      const elementsToHide = allVisibleElements.filter(el => !(isDescendant(element, el) || isDescendant(el, element)));

      // Add these elements to hide
      elementsToHide.forEach(el => {
        const labelAttr = el.getAttributeNS('http://www.inkscape.org/namespaces/inkscape', 'label');
        if (labelAttr) {
          hide.push(labelAttr);
        }
      });

      console.log(label)
      console.log(hide);

      let paths = svgDoc.getElementsByTagName('path');
      let pathAndGroups = [...paths, ...groups];

      // Hide specific children
      hide.forEach(hideLabel => {
        const childToHide = Array.from(pathAndGroups).find(g => g.getAttributeNS('http://www.inkscape.org/namespaces/inkscape', 'label') === hideLabel);
        if (childToHide) {
          childToHide.setAttribute('display', 'none');
          // Check if there's a style attribute
          if (childToHide.hasAttribute('style')) {
            let styleString = childToHide.getAttribute('style');
            // Parse the style string
            let styles = styleString.split(';').reduce((acc, style) => {
              let [key, value] = style.split(':').map(s => s.trim());
              if (key && value) acc[key] = value;
              return acc;
            }, {});

            // Remove any 'display' property from the styles
            if ('display' in styles) {
              delete styles['display'];
              // Reconstruct the style string without 'display'
              styleString = Object.entries(styles)
                .map(([key, value]) => `${key}:${value}`)
                .join(';');
              
              // Set the new style string or remove the attribute if empty
              if (styleString) {
                childToHide.setAttribute('style', styleString);
              } else {
                childToHide.removeAttribute('style');
              }
            }
          }
        }
      });

      // Convert the modified SVG to an Image object
      console.log(svgDoc);
      let svgData = new XMLSerializer().serializeToString(svgDoc.documentElement);
      replace_colors.forEach(([oldColor, newColor]) => {
        svgData = svgData.replace(new RegExp(oldColor, 'g'), newColor);
      });
      console.log(svgDoc);
      const img = new Image();
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = function () {
        resolve(img); // Return the image when loaded
        URL.revokeObjectURL(url); // Clean up the blob URL
      };

      img.onerror = function () {
        reject(new Error('Failed to load SVG as image.'));
      };

      img.src = url;
    }
  });
}

export default Shop;
