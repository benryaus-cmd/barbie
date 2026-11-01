type Disposable = { dispose(): void };

type ReleasedObject = {
  geometry?: Disposable | null;
  skeleton?: Disposable | null;
  material?: Disposable | Disposable[] | null;
};

type RunRoot = {
  removeFromParent(): void;
  traverse(visit: (object: any) => void): void;
  clear(): void;
};

export function releaseRunRoot(
  root: RunRoot,
  appOwned: ReadonlySet<Disposable>
) {
  root.removeFromParent();
  const geometries = new Set<Disposable>();
  const materials = new Set<Disposable>();
  const skeletons = new Set<Disposable>();
  root.traverse((object: ReleasedObject) => {
    if(object.skeleton&&!appOwned.has(object.skeleton))skeletons.add(object.skeleton);
    if (object.geometry && !appOwned.has(object.geometry)) {
      geometries.add(object.geometry);
    }
    const source = object.material;
    if (!source) return;
    const list = Array.isArray(source) ? source : [source];
    for (const material of list) {
      if (material && !appOwned.has(material)) materials.add(material);
    }
  });
  skeletons.forEach(skeleton=>skeleton.dispose());
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
  root.clear();
}
