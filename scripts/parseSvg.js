import fs from 'fs';

const svg = fs.readFileSync('docs/bvb-floor-2.svg', 'utf8');
const groupRegex = /<g\s+id="room-(\d+)-c(\d+)"[^>]*>[\s\S]*?<rect\s+class="room"\s+x="([0-9.]+)"\s+y="([0-9.]+)"\s+width="([0-9.]+)"\s+height="([0-9.]+)"/g;
let m;
const list = [];
while ((m = groupRegex.exec(svg)) !== null) {
  list.push({
    roomNumber: m[1],
    typeCode: m[2],
    x: parseFloat(m[3]),
    y: parseFloat(m[4]),
    width: parseFloat(m[5]),
    height: parseFloat(m[6])
  });
}
console.log('Total extracted:', list.length);
fs.writeFileSync('src/inventory/bvbRooms.json', JSON.stringify(list, null, 2));
