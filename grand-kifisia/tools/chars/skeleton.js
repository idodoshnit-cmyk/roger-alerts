// Canonical runtime skeleton for all Rocketbox (3ds Max Biped) humans.
// The first NBODY bones are enough for crowd characters (far LOD); the rest (fingers, jaw, eyelids) are used by the near LOD only.
// Differences from the source hierarchy: thighs hang off the Pelvis (in the FBX they are children of Spine with an animated
// translation) and clavicles hang off Spine2 (in the FBX they are children of Neck). After this re-parenting every bone has a
// constant local translation, so clips only need rotations + the root (Bip01) position.
'use strict';
const B = 'Bip01 ';
const BONES = [ // [name, parent index]
  ['Bip01', -1], [B + 'Pelvis', 0], [B + 'Spine', 1], [B + 'Spine1', 2], [B + 'Spine2', 3], [B + 'Neck', 4], [B + 'Head', 5],
  [B + 'L Clavicle', 4], [B + 'L UpperArm', 7], [B + 'L Forearm', 8], [B + 'L Hand', 9],
  [B + 'R Clavicle', 4], [B + 'R UpperArm', 11], [B + 'R Forearm', 12], [B + 'R Hand', 13],
  [B + 'L Thigh', 1], [B + 'L Calf', 15], [B + 'L Foot', 16], [B + 'L Toe0', 17],
  [B + 'R Thigh', 1], [B + 'R Calf', 19], [B + 'R Foot', 20], [B + 'R Toe0', 21],
];
const NBODY = BONES.length; // 23
for (const [side, hand] of [['L', 10], ['R', 14]]) for (let f = 0; f < 5; f++) {
  const i0 = BONES.length; BONES.push([B + side + ' Finger' + f, hand]); BONES.push([B + side + ' Finger' + f + '1', i0]); BONES.push([B + side + ' Finger' + f + '2', i0 + 1]);
}
BONES.push([B + 'MJaw', 6], [B + 'LEyeBlinkTop', 6], [B + 'REyeBlinkTop', 6]);
const NAMES = BONES.map(b => b[0]), PARENT = BONES.map(b => b[1]);
const INDEX = {}; NAMES.forEach((n, i) => INDEX[n] = i);
module.exports = { BONES, NAMES, PARENT, INDEX, NBODY, NBONES: BONES.length };
