// Function to fetch SVG from URI and interpolate between two groups
export async function fetchSVG(uri) {
    const response = await fetch(uri);
    const svgText = await response.text();
    return svgText;
  }
  
export function interpolateSVG(svgText, group1Label, group2Label, factor) {
    const parser = new DOMParser();
    const serializer = new XMLSerializer();
    const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
  
    const getGroup = (label) =>
      Array.from(svgDoc.querySelectorAll('g'))
        .find(g => g.getAttribute('inkscape:label') === label);
  
    const group1 = getGroup(group1Label);
    const group2 = getGroup(group2Label);
  
    if (!group1 || !group2) {
      throw new Error(`One or both groups not found. Groups are ${group1Label} and ${group2Label}`);
    }

    group1.setAttribute('style', 'display: block');
    group2.setAttribute('style', 'display: none');
  
    const paths1 = Array.from(group1.querySelectorAll('path'));
    const paths2 = Array.from(group2.querySelectorAll('path'));
    const paths2Map = new Map(paths2.map(p => [p.getAttribute('inkscape:label'), p]));
  
    paths1.forEach((path1) => {
      const label = path1.getAttribute('inkscape:label');
      const path2 = paths2Map.get(label);
  
      if (!path2) {
        throw new Error(`Path '${label}' not found in group '${group2Label}'`);
      }
  
      const d1 = path1.getAttribute('d');
      const d2 = path2.getAttribute('d');
  
      // console.log(`Path '${label}' before interpolation:`);
      // console.log(`d1: ${d1}`);
      // console.log(`d2: ${d2}`);
  
      const commands1 = parsePath(d1);
      const commands2 = parsePath(d2);
  
      // console.log('Parsed commands:');
      // console.log('commands1:', JSON.stringify(commands1, null, 2));
      // console.log('commands2:', JSON.stringify(commands2, null, 2));
  
      if (commands1.length !== commands2.length) {
        console.warn(`Path '${label}' has different number of commands: ${commands1.length} vs ${commands2.length}`);
      }
  
      const interpolated = commands1.map((cmd1, i) => {
        const cmd2 = commands2[i];
        if (!cmd2 || cmd1.type !== cmd2.type) {
          console.warn(`Command mismatch at index ${i}. Using command from first path.`);
          return cmd1;
        }
        return {
          type: cmd1.type,
          values: cmd1.values.map((v, vi) => {
            const v2 = cmd2.values[vi];
            if (typeof v !== 'number' || typeof v2 !== 'number') {
              console.warn(`Non-numeric value found: ${v} or ${v2}`);
              return v;
            }
            return v + factor * (v2 - v);
          })
        };
      });
  
      const interpolatedPath = serializePath(interpolated);
      // console.log(`Interpolated path: ${interpolatedPath}`);
  
      path1.setAttribute('d', interpolatedPath);
    });

    // console.log(svgDoc);
  
    return serializer.serializeToString(svgDoc);
}
  
function parsePath(d) {
    // This regex matches command letters and numbers (including scientific notation)
    const regex = /([a-zA-Z])|(-?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?)/g;
    const commands = [];
    let currentCommand = null;
    let match;
  
    while ((match = regex.exec(d)) !== null) {
      if (match[1]) { // We found a command letter
        if (currentCommand) {
          commands.push(currentCommand);
        }
        currentCommand = { type: match[1], values: [] };
      } else if (match[2]) { // We found a number
        currentCommand.values.push(parseFloat(match[2]));
      }
    }
  
    if (currentCommand) {
      commands.push(currentCommand);
    }
  
    return commands;
  }
  
function serializePath(commands) {
  return commands.map(cmd => {
    if (cmd.values.length === 0) return cmd.type;
    const formattedValues = cmd.values.map((v, i) => {
      if (typeof v !== 'number') return v;
      let formatted = v.toPrecision(6);
      // Add comma after x-coordinate (every even index except the last)
      if (i % 2 === 0 && i < cmd.values.length - 1) {
        formatted += ',';
      }
      return formatted;
    }).join(' ');
    return `${cmd.type}${cmd.type.toLowerCase() !== 'z' ? ' ' : ''}${formattedValues}`;
  }).join(' ');
}

  
// Function to convert SVG string to Image object
export function svgToImage(svgString) {
    return new Promise((resolve, reject) => {
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
        };
        img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
        };
        img.src = url;
    });
}

  