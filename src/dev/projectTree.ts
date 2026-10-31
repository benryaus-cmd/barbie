import type { ProjectFileEntry } from '@/types/projectFiles';

interface TreeNode {
  dirs: Map<string, TreeNode>;
  files: string[];
}

const createNode = (): TreeNode => ({ dirs: new Map(), files: [] });

const renderNode = (node: TreeNode, prefix: string, lines: string[]): void => {
  const dirNames = [...node.dirs.keys()].sort((a, b) => a.localeCompare(b));
  const fileNames = [...node.files].sort((a, b) => a.localeCompare(b));
  const total = dirNames.length + fileNames.length;

  dirNames.forEach((name, index) => {
    const last = index === total - 1;
    lines.push(`${prefix}${last ? '└── ' : '├── '}📁 ${name}`);
    const child = node.dirs.get(name);
    if (child) renderNode(child, `${prefix}${last ? '    ' : '│   '}`, lines);
  });

  fileNames.forEach((name, index) => {
    const last = dirNames.length + index === total - 1;
    lines.push(`${prefix}${last ? '└── ' : '├── '}📄 ${name}`);
  });
};

export const generateTree = (files: ProjectFileEntry[]): string => {
  const root = createNode();

  for (const file of files) {
    const parts = file.path.split('/').filter(Boolean);
    if (parts.length === 0) continue;

    let node = root;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const name = parts[i];
      let next = node.dirs.get(name);
      if (!next) {
        next = createNode();
        node.dirs.set(name, next);
      }
      node = next;
    }
    if (!node.files.includes(parts[parts.length - 1])) {
      node.files.push(parts[parts.length - 1]);
    }
  }

  const lines: string[] = ['📁 ./'];
  renderNode(root, '', lines);
  return lines.join('\n');
};