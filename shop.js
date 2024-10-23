import { FallingSnowParticleEffect } from "./particle_engine.js";
import randomCentered, { Clickable } from "./utils.js";

export class Shop {
  constructor(character, ctx, canvas) {
      this.character = character;
      this.chair = null;  // Initialize the chair as null
      this.purchaseChair = null;
      this.characterLeftLeg = null;
      this.characterRightLeg = null;
      this.characterLeftPants = null;
      this.characterRightPants = null;
      this.cardReader = null;
      this.hammerBicep = null;
      this.hammerArm = null;
      this.cable = null;
      this.elapsedTime = 0;
      this.ctx = ctx;
      this.lastSnowTime = 0;
      this.snowRate = 40;

      this.checkingOut = true;

      this.treesImages = [
        new Image(),
      ]
      this.treesImages[0].src = "images/big_tree_1.svg";

      this.trees = [];
      this.treeSpawnTime = 0;
      this.lastTreeSpawnTime = 0;

      this.snowEffect = new FallingSnowParticleEffect(800);
      this.backgroundSnowEffect = new FallingSnowParticleEffect(800);

      this.canvas = canvas;
      this.clickables = [];  // New list to store clickable objects
      this.initializeClickables();  // New method to set up clickables

      getModifiedSvg("chair", {
          replace_colors: [["#ff6601", "#000000"]],
          hide: ["player_left_leg", "player_right_leg", "dwarf_payment_arm", "dwarf_payment_head", "left_pants", "right_pants", "hammer_arm_bicep", "hammer_arm"]
      }).then(img => {
          this.chair = img;  // Set the chair image once it's ready
      }).catch(err => {
          console.error("Error loading chair image:", err);
      });

      getModifiedSvg("chair", {
        replace_colors: [],
        hide: ["dwarf_head", "dwarf_right_arm", "left_pants", "right_pants", "player_left_leg", "player_right_leg"]
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
          hide: [""]
      }).then(img => {
          this.cardReader = img;
      }).catch(err => {
          console.error("Error loading card reader image:", err);
      });
  }

  initializeClickables() {
    // Example clickable for the card reader
    const cardReaderClickable = new Clickable(275, 730, 610, 830, this.canvas);
    cardReaderClickable.onTap = () => {
      console.log("Card reader tapped!");
      // Add your card reader tap logic here
    };
    this.clickables.push(cardReaderClickable);

    // Add more clickables as needed...
  }

  update(dt) {
      // Update logic here
      let wind = -80
      this.elapsedTime += dt;
      this.snowEffect.update(dt, wind, this.ctx);
      this.backgroundSnowEffect.update(dt, wind, this.ctx);
      if (this.elapsedTime > this.lastSnowTime + 1 / this.snowRate) {
        let xpos = (Math.random() * 4 - 1) * this.ctx.canvas.width;
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

  draw(ctx) {
    function rotateInImageFrame(pivot, amount) {
      ctx.translate(pivot.x, pivot.y);
      ctx.rotate(amount);
      ctx.translate(-pivot.x, -pivot.y);
    }
    if (this.chair && this.cable && this.characterLeftLeg && this.characterRightLeg && this.characterLeftPants && this.characterRightPants && this.hammerBicep && this.hammerArm && this.cardReader && this.purchaseChair) {
      
      ctx.save();
      ctx.scale(0.8, 0.8);
      this.backgroundSnowEffect.draw(ctx);
      ctx.restore();

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

      // Draw the chair if the image is loaded
      ctx.translate(ctx.canvas.width / 2 / scale - width / 2, 0);
      // Update the transform for each clickable
      this.clickables.forEach(clickable => clickable.setCtxTransform(this.ctx));
      ctx.drawImage(this.cable, 0, 0, width, height);
      ctx.save();
      const pivot = {x: 530, y: 300};
      rotateInImageFrame(pivot, Math.sin(this.elapsedTime * 1) * 0.02);
      if (this.checkingOut) {
        ctx.drawImage(this.purchaseChair, 0, 0, width, height);
      } else {
        ctx.drawImage(this.chair, 0, 0, width, height);
      }

      if (!this.checkingOut) {
        // Dwarf Hammer Arm
        ctx.save(); {
          let amt = Math.sin(this.elapsedTime * 6);
          amt = Math.pow(Math.abs(amt), 0.5);
          rotateInImageFrame({x: 692, y: 1325}, amt * 0.06);
          ctx.drawImage(this.hammerBicep, 0, 0, width, height);    
          rotateInImageFrame({x: 776, y: 1392}, amt * 0.22);
          ctx.drawImage(this.hammerArm, 0, 0, width, height);
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



      ctx.restore(); // chair swing

      ctx.restore(); // scale & translate
      this.snowEffect.draw(ctx);

      if (this.checkingOut) {
        ctx.save();
        ctx.scale(scale, scale);
        ctx.translate(ctx.canvas.width / 2 / scale - width / 2, 0);
        ctx.drawImage(this.cardReader, 0, 0, width, height);
        drawCheckoutText(ctx, width);
        ctx.restore();
      }
    } else {
      console.log("no chair");
    }

    // You can add debug drawing for clickables if needed
    // this.clickables.forEach(clickable => {
    //     ctx.strokeStyle = 'red';
    //     ctx.strokeRect(clickable.x - clickable.width/2, clickable.y - clickable.height/2, clickable.width, clickable.height);
    // });
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
