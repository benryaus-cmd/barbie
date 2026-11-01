import * as THREE from 'three';
import type { FabricFinish, FabricPattern, HairBlend } from '@/game/lifestyle-types';

type Material = THREE.MeshStandardMaterial;
type Uniform<T> = { value:T };
type FabricState = { original:{roughness:number;metalness:number}; pattern:Uniform<number>; accent:Uniform<THREE.Color>; glitter:Uniform<number> };
type HairState = { enabled:Uniform<number>; secondary:Uniform<THREE.Color>; blend:Uniform<number>; bounds:Uniform<THREE.Vector2> };
const fabrics=new WeakMap<Material,FabricState>(),hairs=new WeakMap<Material,HairState>();
const finishes:Record<Exclude<FabricFinish,'original'>,{roughness:number;metalness:number}>={matte:{roughness:.94,metalness:0},satin:{roughness:.3,metalness:.16},gloss:{roughness:.13,metalness:.14},metallic:{roughness:.23,metalness:.84},glitter:{roughness:.34,metalness:.5}};
const patterns:FabricPattern[]=['solid','stripes','dots','gingham','stars','floral'];

/** Capture the authored garment/head coordinate before batching and spring skinning.
 * Dye and prints stick to the same points as the rig moves, including scaled crowns. */
export function stampStyleCoordinates(root:THREE.Object3D):THREE.Vector2 {
  root.updateWorldMatrix(true,true);
  const inverse=root.matrixWorld.clone().invert(),point=new THREE.Vector3();
  let low=Infinity,high=-Infinity;
  root.traverse(node=>{
    if(!(node instanceof THREE.Mesh))return;
    const position=node.geometry.getAttribute('position'),values=new Float32Array(position.count*3);
    const transform=inverse.clone().multiply(node.matrixWorld);
    for(let i=0;i<position.count;i++){
      point.fromBufferAttribute(position,i).applyMatrix4(transform);point.toArray(values,i*3);
      low=Math.min(low,point.y);high=Math.max(high,point.y);
    }
    node.geometry.setAttribute('stylePosition',new THREE.BufferAttribute(values,3));
  });
  return new THREE.Vector2(Number.isFinite(low)?low:0,Number.isFinite(high)?high:1);
}

function injectCoordinates(shader:THREE.WebGLProgramParametersWithUniforms) {
  shader.vertexShader='attribute vec3 stylePosition;\nvarying vec3 vFashionPosition;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFashionPosition = stylePosition;');
  shader.fragmentShader='varying vec3 vFashionPosition;\n'+shader.fragmentShader;
}
const fabricFunctions=/* glsl */`
uniform float fashionPattern;
uniform vec3 fashionAccent;
uniform float fashionGlitter;
float fashionHash(vec3 p) { return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
float fashionPrint(vec3 p) {
  vec2 tile=p.xy*20.0;
  vec2 c=fract(tile)-0.5;
  float r=length(c);
  if(fashionPattern<0.5)return 0.0;
  if(fashionPattern<1.5)return 1.0-smoothstep(0.36,0.44,fract(p.y*30.0+p.x*5.0));
  if(fashionPattern<2.5)return 1.0-smoothstep(0.20,0.25,r);
  if(fashionPattern<3.5){vec2 check=step(vec2(0.5),fract(tile));return (check.x+check.y)*0.42;}
  float a=atan(c.y,c.x);
  if(fashionPattern<4.5){float edge=mix(0.16,0.37,0.5+0.5*cos(a*5.0));return 1.0-smoothstep(edge-0.025,edge+0.025,r);}
  float petals=0.22+0.10*cos(a*5.0);
  return 1.0-smoothstep(petals-0.025,petals+0.025,r);
}
`;

/** Installs once; all wardrobe edits only mutate these stable uniforms and PBR values. */
export function setFabricStyle(material:Material,options:{color:string;finish?:FabricFinish;pattern?:FabricPattern;accent?:string}):void {
  let state=fabrics.get(material);
  if(!state){
    state={original:{roughness:material.roughness,metalness:material.metalness},pattern:{value:0},accent:{value:new THREE.Color('#fffaf3')},glitter:{value:0}};
    fabrics.set(material,state);const uniforms=state,previous=material.onBeforeCompile;
    material.onBeforeCompile=(shader,renderer)=>{
      previous.call(material,shader,renderer);injectCoordinates(shader);
      shader.uniforms.fashionPattern=uniforms.pattern;shader.uniforms.fashionAccent=uniforms.accent;shader.uniforms.fashionGlitter=uniforms.glitter;
      shader.fragmentShader=fabricFunctions+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, fashionAccent, fashionPrint(vFashionPosition));');
      shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
float fashionFlake=step(0.89,fashionHash(floor(vFashionPosition*650.0)))*fashionGlitter;
roughnessFactor=mix(roughnessFactor,0.08,fashionFlake);`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
float fashionSparkle=pow(max(dot(normalize(normal),normalize(vViewPosition)),0.0),18.0);
totalEmissiveRadiance += mix(diffuseColor.rgb,vec3(1.0),0.65)*fashionFlake*(0.12+fashionSparkle*0.7);`);
    };
    material.customProgramCacheKey=()=>'fashion-fabric-v7';material.needsUpdate=true;
  }
  material.color.set(options.color);
  const finish=options.finish&&options.finish!=='original'?finishes[options.finish]:state.original;
  material.roughness=finish.roughness;material.metalness=finish.metalness;
  state.pattern.value=Math.max(0,patterns.indexOf(options.pattern??'solid'));
  state.accent.value.set(options.accent??'#fffaf3');state.glitter.value=options.finish==='glitter'?1:0;
}

export function setHairDye(material:Material,options:{secondary?:string;blend?:HairBlend;bounds:THREE.Vector2}):void {
  let state=hairs.get(material);
  if(!state){
    state={enabled:{value:0},secondary:{value:new THREE.Color()},blend:{value:0},bounds:{value:options.bounds.clone()}};
    hairs.set(material,state);const uniforms=state,previous=material.onBeforeCompile;
    material.onBeforeCompile=(shader,renderer)=>{
      previous.call(material,shader,renderer);injectCoordinates(shader);
      shader.uniforms.fashionHairEnabled=uniforms.enabled;shader.uniforms.fashionHairSecondary=uniforms.secondary;
      shader.uniforms.fashionHairBlend=uniforms.blend;shader.uniforms.fashionHairBounds=uniforms.bounds;
      shader.fragmentShader=`uniform float fashionHairEnabled;\nuniform vec3 fashionHairSecondary;\nuniform float fashionHairBlend;\nuniform vec2 fashionHairBounds;\n`+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
float fashionDye=0.0;
if(fashionHairBlend<0.5)fashionDye=smoothstep(-0.2,0.2,sin(vFashionPosition.x*105.0+vFashionPosition.z*37.0));
else if(fashionHairBlend<1.5){float height=(vFashionPosition.y-fashionHairBounds.x)/max(0.01,fashionHairBounds.y-fashionHairBounds.x);fashionDye=1.0-smoothstep(0.18,0.86,height);}
else fashionDye=smoothstep(-0.008,0.008,vFashionPosition.x);
diffuseColor.rgb=mix(diffuseColor.rgb,fashionHairSecondary,fashionDye*fashionHairEnabled);`);
    };
    material.customProgramCacheKey=()=>'fashion-hair-v7';material.needsUpdate=true;
  }
  state.enabled.value=options.secondary?1:0;state.secondary.value.set(options.secondary??'#ffffff');
  state.blend.value=options.blend==='ombre'?1:options.blend==='split'?2:0;state.bounds.value.copy(options.bounds);
}

/** Clone before rigid batching, with one clone per source material and accessory.
 * Lenses can stay untouched while even formerly-shared gold/cloth trim is isolated. */
export function isolateAccessoryMaterials(roots:THREE.Object3D[],id:string,excluded:Material[]=[]):(color?:string)=>void {
  const clones=new Map<Material,Material>(),original=new Map<Material,THREE.Color>();
  for(const root of roots)root.traverse(node=>{
    if(!(node instanceof THREE.Mesh))return;
    const clone=(source:Material)=>{
      if(excluded.includes(source))return source;
      let material=clones.get(source);
      if(!material){material=source.clone();material.name=`accessory ${id}`;clones.set(source,material);original.set(material,source.color.clone());}
      return material;
    };
    node.material=Array.isArray(node.material)?node.material.map(m=>clone(m as Material)):clone(node.material as Material);
  });
  return color=>{for(const [material,natural] of original)if(color)material.color.set(color);else material.color.copy(natural);};
}
