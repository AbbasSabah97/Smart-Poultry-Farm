// Geometry and user-selection helpers. No hardware control functions.
export const HOUSE_VISUAL_COUNT = 150;
export const HOUSE_LAYOUT = Object.freeze([
 {id:'H01',x:-139,z:-63},{id:'H02',x:-46,z:-63},{id:'H03',x:47,z:-63},{id:'H04',x:140,z:-63},
 {id:'H05',x:-93,z:65},{id:'H06',x:0,z:65},{id:'H07',x:93,z:65}
]);
export const BIRD_LANES = Object.freeze([-7.2,-3.68,0.28,3.5,7.25]);
// Source bird model front axis is assumed +Z. Rotate toward centre for wall-side lanes.
export function birdHeadingForLane(index){
  if(index===0)return 0;          // at negative Z wall: +Z / into barn
  if(index===4)return Math.PI;    // at positive Z wall: -Z / into barn
  return Math.PI/2;               // remaining birds face longitudinal aisle
}
export function birdPositionForIndex(i){
 if(!Number.isInteger(i)||i<0||i>=HOUSE_VISUAL_COUNT)throw Error('Bird index out of range');
 return {x:-30.9+Math.floor(i/5)*2.12,z:BIRD_LANES[i%5],heading:birdHeadingForLane(i%5)};
}
