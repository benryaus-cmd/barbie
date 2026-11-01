import * as THREE from 'three';
/** Continuous skin across an articulated elbow/knee; hands, shoes and clothing retain their own joints. */
export function createLimbSkin(upper:THREE.Object3D,lower:THREE.Object3D,material:THREE.MeshStandardMaterial,kind:'arm'|'leg',bodySkeleton?:THREE.Skeleton) {
 for(const joint of [upper,lower])for(const child of [...joint.children])if(child instanceof THREE.Mesh&&child.material===material){child.removeFromParent();child.geometry.dispose();}
 const length=kind==='arm'?.27:.425;
 const profile:Array<[number,number]>=kind==='arm'?
 [[0,.035],[.044,.025],[.056,-.015],[.051,-.10],[.042,-.21],[.039,-.27],[.040,-.31],[.042,-.35],[.033,-.43],[.026,-.505],[0,-.515]]:
 [[0,.028],[.075,.02],[.085,-.07],[.079,-.20],[.061,-.33],[.050,-.425],[.051,-.48],[.061,-.54],[.050,-.65],[.037,-.75],[.032,-.815],[0,-.822]];
 const sample=(y:number)=>{for(let i=0;i<profile.length-1;i++){const a=profile[i],b=profile[i+1];if(y<=a[1]&&y>=b[1])return THREE.MathUtils.lerp(a[0],b[0],(a[1]-y)/(a[1]-b[1]));}return 0;};
 const points:THREE.Vector2[]=[];const top=profile[0][1],bottom=profile[profile.length-1][1];
 for(let i=0;i<=40;i++){const y=THREE.MathUtils.lerp(bottom,top,i/40);points.push(new THREE.Vector2(sample(y),y));}
 const geometry=new THREE.LatheGeometry(points,24),position=geometry.attributes.position;
 const upperIndex=bodySkeleton?bodySkeleton.bones.indexOf(upper as THREE.Bone):0,lowerIndex=bodySkeleton?bodySkeleton.bones.indexOf(lower as THREE.Bone):1;
 if(upperIndex<0||lowerIndex<0)throw new Error('Mapped limb joints must belong to the shared body skeleton.');
 const indices:number[]=[],weights:number[]=[];
 for(let i=0;i<position.count;i++){const depth=kind==='arm'?.94:THREE.MathUtils.lerp(.96,.87,THREE.MathUtils.smoothstep(-position.getY(i),.425,.51));position.setZ(i,position.getZ(i)*depth);const blend=THREE.MathUtils.smoothstep(-position.getY(i),length-.055,length+.055);indices.push(upperIndex,lowerIndex,0,0);weights.push(1-blend,blend,0,0);}
 geometry.computeVertexNormals();geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
 let bend:THREE.Bone|undefined,skeleton=bodySkeleton;
 if(!skeleton){const root=new THREE.Bone();bend=new THREE.Bone();root.name=kind+'.skin.root';bend.name=kind+'.skin.bend';bend.position.copy(lower.position);root.add(bend);upper.add(root);upper.updateWorldMatrix(true,true);skeleton=new THREE.Skeleton([root,bend]);}
 const mesh=new THREE.SkinnedMesh(geometry,material);mesh.name=kind+' continuous skin';mesh.castShadow=mesh.receiveShadow=true;upper.add(mesh);upper.updateWorldMatrix(true,true);mesh.bind(skeleton);mesh.frustumCulled=false;
 return {update(){if(bend){bend.quaternion.copy(lower.quaternion);bend.updateWorldMatrix(true,true);}}};
}
