const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const THREE=require('three'),ts=require('typescript'),repo=process.env.DREAMLAND_REPO||path.resolve(__dirname,'..');
const file=path.join(repo,'src/game/character/surface-map.ts');assert(fs.existsSync(file),'actual triangle surface map is available');
const mod={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(require,mod,mod.exports);
const {createSurfaceMap,conformToSurface}=mod.exports;
const space=new THREE.Group();space.position.set(3,-2,4);space.rotation.set(.2,.4,.1);space.scale.set(1.3,.8,1.1);
const mesh=new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute([0,0,0, 2,0,2, 0,2,0, 0,0,-1, 2,0,-1, 0,2,-1],3)),new THREE.MeshBasicMaterial());space.add(mesh);
const surface=createSurfaceMap([mesh],space);let hit=surface.sample(.5,.5);assert(hit&&Math.abs(hit.z-.5)<1e-6,'samples front triangle plane using barycentric coordinates');assert(hit.normal.z>0&&hit.normal.x<0&&Math.abs(hit.normal.length()-1)<1e-6,'returns finite transformed surface normal');assert.equal(surface.sample(1.8,1.8),null,'triangle bounding box is not a surface');assert.equal(surface.sample(NaN,0),null,'invalid query has no support');
mesh.geometry.dispose();mesh.position.z=20;assert(Math.abs(surface.sample(.5,.5).z-.5)<1e-6,'baked samples survive source transform changes and disposal');
const patch=new THREE.PlaneGeometry(1,1,4,4);patch.translate(.5,.5,6);conformToSurface(patch,surface,.0008);assert.equal(patch.attributes.uv.count,patch.attributes.position.count,'subdivision retains aligned UV samples');const p=patch.attributes.position;for(let i=0;i<p.count;i++)assert(Math.abs(p.getZ(i)-p.getX(i)-.0008)<1e-6,'flat applique follows actual facets at embroidery clearance');assert([...patch.attributes.normal.array].every(Number.isFinite),'conformed normals remain finite');
console.log('PASS: frontmost actual triangles, coordinate transforms, triangle bounds, baked lifetime and conforming applique');

// Outline-only shapes must follow cloth between their edges as well.
const folded=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute([-.06,-.05,0, .06,-.05,0, 0,0,.04, .06,-.05,0, .06,.05,0, 0,0,.04, .06,.05,0, -.06,.05,0, 0,0,.04, -.06,.05,0, -.06,-.05,0, 0,0,.04],3));
const foldMesh=new THREE.Mesh(folded,new THREE.MeshBasicMaterial({side:THREE.DoubleSide})),foldSpace=new THREE.Group();foldSpace.add(foldMesh);
const embroidery=new THREE.PlaneGeometry(.1,.08);conformToSurface(embroidery,createSurfaceMap([foldMesh],foldSpace),.0008);
const decal=new THREE.Mesh(embroidery,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));decal.updateMatrixWorld();const ray=new THREE.Raycaster(new THREE.Vector3(.002,.002,1),new THREE.Vector3(0,0,-1));const hitDecal=ray.intersectObject(decal)[0];assert(hitDecal&&hitDecal.point.z>.036,'applique interior follows raised cloth instead of spanning a flat outline');
console.log('PASS: applique triangle interior conforms to curved support');

const domeSpace=new THREE.Group(),dome=new THREE.Mesh(new THREE.SphereGeometry(.2,28,20),new THREE.MeshBasicMaterial());dome.scale.z=.7;domeSpace.add(dome);
const domeMap=createSurfaceMap([dome],domeSpace),curvedLogo=new THREE.PlaneGeometry(.1,.075);curvedLogo.translate(0,.05,1);conformToSurface(curvedLogo,domeMap,.0008);
const dp=curvedLogo.attributes.position,di=curvedLogo.index;
for(let i=0;i<di.count;i+=3){const p=new THREE.Vector3();for(let j=0;j<3;j++)p.add(new THREE.Vector3().fromBufferAttribute(dp,di.getX(i+j)));p.multiplyScalar(1/3);dome.updateMatrixWorld();const check=new THREE.Raycaster(new THREE.Vector3(p.x,p.y,1),new THREE.Vector3(0,0,-1)).intersectObject(dome)[0];assert(check,'cloth supports entire patch');const gap=p.z-check.point.z;assert(gap>-.00005&&gap<.0012,`applique triangle interiors clear cloth at embroidery gap: ${gap}`)}
console.log('PASS: actual curved cloth has clear, close-fitting applique triangle interiors and retained UVs');
