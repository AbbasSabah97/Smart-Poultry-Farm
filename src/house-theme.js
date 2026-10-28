// Pure theme helper: can be regression-tested without starting the 3D engine.
// In Three.js, MeshStandardMaterial exposes .color directly; a Mesh has .material.color.
export function applyHouseTheme({Color,roofMaterial,feederMaterial,waterIndicators=[],roofColor}) {
  if (!roofMaterial?.color || !feederMaterial?.color) {
    throw new TypeError('House theme requires material objects with a color property');
  }
  const tint = new Color(roofColor || '#8fa4b1');
  roofMaterial.color.copy(tint);
  feederMaterial.color.copy(new Color(0xbf4430).lerp(tint,.12));
  waterIndicators.forEach((indicator,i)=>{
    if (!indicator?.material?.color) return;
    indicator.material.color.set(i%2?0x13b5df:0x0f94d2);
  });
}
