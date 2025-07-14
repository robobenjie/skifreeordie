class SVGLoader {
    constructor() {
        this.svgCache = new Map();
        this.loadingPromises = new Map();
    }

    async loadSVG(url) {
        if (this.svgCache.has(url)) {
            return this.svgCache.get(url);
        }

        if (this.loadingPromises.has(url)) {
            return this.loadingPromises.get(url);
        }

        const loadPromise = new Promise((resolve, reject) => {
            fetch(url)
                .then(response => response.text())
                .then(svgText => {
                    const parser = new DOMParser();
                    const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
                    this.svgCache.set(url, svgDoc);
                    resolve(svgDoc);
                })
                .catch(reject);
        });

        this.loadingPromises.set(url, loadPromise);
        return loadPromise;
    }
}
const svgLoader = new SVGLoader();

const memoizedResults = new Map();

export async function getModifiedSvg(svgUrl, label, { replace_colors = [], hide = [], show = [], stroke_red = [], stroke_green = [], stroke_yellow = [], ghost = [] }) {
    const options = {replace_colors, hide, show, stroke_red, stroke_green, stroke_yellow, ghost}
    const optionsKey = JSON.stringify({ label, ...options});
    const cacheKey = `${svgUrl}_${optionsKey}`;

    if (memoizedResults.has(cacheKey)) {
        return memoizedResults.get(cacheKey);
    }

    try {
        const svgDoc = await svgLoader.loadSVG(svgUrl);
        const result = processSvg(svgDoc.cloneNode(true), label, options);
        memoizedResults.set(cacheKey, result);
        return result;
    } catch (error) {
        console.error('Error loading SVG:', error);
        throw error;
    }
}

function processSvg(svgDoc, label, { replace_colors, hide, show, stroke_red, stroke_green, stroke_yellow, ghost }) {
    return new Promise((resolve, reject) => {

        const groups = svgDoc.getElementsByTagName('g');

        let element = Array.from(groups).find(group => 
            group.getAttributeNS('http://www.inkscape.org/namespaces/inkscape', 'label') === label
        );

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

      // Show specific children
      show.forEach(showLabel => {
        const [parentLabel, childLabel] = showLabel.split('.');
        let childToShow;

        if (childLabel) {
          // Find the parent group first
          const parentGroup = Array.from(groups).find(g => g.getAttributeNS('http://www.inkscape.org/namespaces/inkscape', 'label') === parentLabel);
          if (parentGroup) {
            // Then find the child within the parent group
            childToShow = Array.from(parentGroup.getElementsByTagName('*')).find(el => el.getAttributeNS('http://www.inkscape.org/namespaces/inkscape', 'label') === childLabel);
          }
        } else {
          // If there's no dot notation, search as before
          childToShow = Array.from(pathAndGroups).find(g => g.getAttributeNS('http://www.inkscape.org/namespaces/inkscape', 'label') === showLabel);
        }

        if (childToShow) {
          childToShow.removeAttribute('display');
          // Check if there's a style attribute
          if (childToShow.hasAttribute('style')) {
            let styleString = childToShow.getAttribute('style');
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
                childToShow.setAttribute('style', styleString);
              } else {
                childToShow.removeAttribute('style');
              }
            }
          }
        }
      });


      if (stroke_red) {
            const filter="url(#strokeFilterRed)";
            stroke_red.forEach(label => {
            Array.from(pathAndGroups).find(g => g.getAttributeNS('http://www.inkscape.org/namespaces/inkscape', 'label') === label).setAttribute('filter', filter);
        });
      }
      if (stroke_green) {
        const filter="url(#strokeFilterGreen)";
        stroke_green.forEach(label => {
            Array.from(pathAndGroups).find(g => g.getAttributeNS('http://www.inkscape.org/namespaces/inkscape', 'label') === label).setAttribute('filter', filter);
        });
      }

      if (stroke_yellow) {
        const filter="url(#strokeFilterYellow)";
        stroke_yellow.forEach(label => {
            Array.from(pathAndGroups).find(g => g.getAttributeNS('http://www.inkscape.org/namespaces/inkscape', 'label') === label).setAttribute('filter', filter);
        });
      }

      if (ghost) {
        const filter="url(#ghostFilter)";
        ghost.forEach(label => {
            Array.from(pathAndGroups).find(g => g.getAttributeNS('http://www.inkscape.org/namespaces/inkscape', 'label') === label).setAttribute('filter', filter);
        });
      }




      // Convert the modified SVG to an Image object
      collectVisibleElements(svgDoc.documentElement, allVisibleElements);

        // Convert the modified SVG to an Image object
        let svgData = new XMLSerializer().serializeToString(svgDoc);
        console.log("replace colors", replace_colors);
        replace_colors.forEach(([oldColor, newColor]) => {
            svgData = svgData.replace(new RegExp(oldColor, 'g'), newColor);
        });

        const img = new Image();
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = function () {
            resolve(img);
            URL.revokeObjectURL(url);
        };

        img.onerror = function () {
            reject(new Error('Failed to load SVG as image.'));
        };

        img.src = url;
    });
}

export default getModifiedSvg;
