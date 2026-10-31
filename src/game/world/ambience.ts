import * as THREE from 'three';

/** Cheap geometry and one water shader; no postprocessing or reflection targets. */
export function createWorldAmbience() {
  const root=new THREE.Group();root.name='Sunset, pool water & party lights';
  const sky=new THREE.Mesh(new THREE.SphereGeometry(420,24,12),new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,
    uniforms:{},
    vertexShader:'varying vec3 vDirection; void main(){vDirection=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`varying vec3 vDirection;void main(){float h=vDirection.y;vec3 peach=vec3(1.0,.55,.42);vec3 rose=vec3(.79,.38,.59);vec3 violet=vec3(.24,.22,.47);vec3 c=mix(peach,rose,smoothstep(-.02,.28,h));c=mix(c,violet,smoothstep(.18,.85,h));gl_FragColor=vec4(c,1.0);#include <tonemapping_fragment>\n#include <colorspace_fragment>}`,
  }));
  // Shader chunks require preprocessor directives to begin on a new line.
  (sky.material as THREE.ShaderMaterial).fragmentShader=(sky.material as THREE.ShaderMaterial).fragmentShader.replace(';#include',';\n#include');
  root.add(sky);
  const sun=new THREE.Mesh(new THREE.SphereGeometry(19,20,12),new THREE.MeshBasicMaterial({color:0xffcc8c,fog:false}));sun.position.set(-170,27,-240);root.add(sun);
  const waterMaterial=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.DoubleSide,
    uniforms:{time:{value:0}},
    vertexShader:`uniform float time;varying vec2 vUv;varying float wave;void main(){vUv=uv;vec3 p=position;wave=sin(p.x*3.0+time*1.4)*cos(p.y*3.2-time)*.025;p.z+=wave;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`,
    fragmentShader:`uniform float time;varying vec2 vUv;varying float wave;void main(){vec2 q=vUv*vec2(11.2,8.2);float a=sin(q.x*5.0+time*1.6+sin(q.y*3.3-time));float b=sin(q.y*6.0-time*1.4+sin(q.x*3.0+time));float caustic=pow(max(0.0,a*b),5.0);float glint=pow(max(0.0,sin(q.x*2.5+q.y*3.0-time*1.5)),16.0);vec3 c=mix(vec3(.04,.49,.66),vec3(.21,.83,.87),vUv.y*.4+.35+wave*4.0);c+=caustic*.26+glint*vec3(.27,.21,.14);gl_FragColor=vec4(c,.93);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>}`,
  });
  const water=new THREE.Mesh(new THREE.PlaneGeometry(11.2,8.2,36,28),waterMaterial);water.rotation.x=-Math.PI/2;water.position.set(0,.73,-25);water.name='Living pool water';root.add(water);
  const party=new THREE.Group();party.name='Optional party effects';root.add(party);
  const beams:THREE.Group[]=[];
  const lasers:THREE.Mesh[]=[];
  const colors=[0xff5ac5,0x5be5ff,0xb77aff,0xffd75b];
  colors.forEach((color,index)=>{
    const pivot=new THREE.Group();pivot.position.set(8.3+index*2,4,-30.2);party.add(pivot);beams.push(pivot);
    const beam=new THREE.Mesh(new THREE.ConeGeometry(1.25,4.5,12,1,true),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.085,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));beam.position.y=-2.25;pivot.add(beam);
    const laser=new THREE.Mesh(new THREE.CylinderGeometry(.014,.014,7,5),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.65,depthWrite:false,blending:THREE.AdditiveBlending}));party.add(laser);lasers.push(laser);
  });
  for(let i=0;i<2;i++) {const light=new THREE.PointLight(colors[i],11,9,2);light.position.set(10+i*3,2.2,-27);party.add(light);}
  let clock=0;
  const direction=new THREE.Vector3(),up=new THREE.Vector3(0,1,0),start=new THREE.Vector3(),end=new THREE.Vector3();
  return {root,update(dt:number,effects:boolean){
    clock+=dt;waterMaterial.uniforms.time.value=clock;party.visible=effects;
    if(!effects)return;
    beams.forEach((beam,index)=>{beam.rotation.z=Math.sin(clock*.7+index*1.8)*.45;beam.rotation.x=.4+Math.cos(clock*.6+index)*.28;});
    lasers.forEach((laser,index)=>{start.set(8.3+index*2,3.8,-30.2);end.set(11.5+Math.sin(clock*.7+index)*3,.18,-26+Math.cos(clock*.5+index)*2);direction.copy(end).sub(start);laser.scale.y=direction.length()/7;laser.position.copy(start).add(end).multiplyScalar(.5);laser.quaternion.setFromUnitVectors(up,direction.normalize());});
  }};
}
