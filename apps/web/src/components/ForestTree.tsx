import type { TreeStage } from '@mochi/contracts';

const stageContent: Record<TreeStage, { title: string; note: string; leaves: number }> = {
  seedling: { title: 'Seedling', note: 'A small start. Your tree grows from confirmed savings.', leaves: 2 },
  sapling: { title: 'Sapling', note: 'Your first quarter is taking shape.', leaves: 5 },
  young: { title: 'Young tree', note: 'Steady care is helping your tree branch out.', leaves: 9 },
  mature: { title: 'Mature tree', note: 'Your progress is building a sturdy canopy.', leaves: 14 },
  thriving: { title: 'Thriving', note: 'You reached the goal you set for this tree.', leaves: 20 },
};

const leafPoints = [
  [80, 68], [120, 72], [60, 95], [100, 91], [142, 98], [42, 121], [77, 119], [116, 117], [157, 124], [61, 148],
  [96, 145], [134, 148], [32, 151], [171, 151], [80, 48], [120, 52], [50, 78], [150, 80], [98, 54], [100, 104],
];

export function ForestTree({ stage, progress }: { stage: TreeStage; progress: number }) {
  const { title, note, leaves } = stageContent[stage];
  return <div className="forest-tree-card">
    <div className="forest-tree-copy"><span className="eyebrow">YOUR TREE · {title.toUpperCase()}</span><h2>{progress.toFixed(0)}% grown</h2><p>{note}</p></div>
    <svg viewBox="0 0 200 210" role="img" aria-label={`${title} tree, ${progress.toFixed(0)} percent grown from confirmed savings`} className="forest-tree">
      <ellipse cx="100" cy="190" rx="70" ry="10" className="tree-ground" />
      {progress > 0 ? <path d="M98 190 Q96 153 101 124 Q104 91 98 55 M100 135 Q77 116 63 103 M100 116 Q124 99 137 84 M100 159 Q124 142 146 133 M98 159 Q81 146 66 139" className="tree-trunk" /> : null}
      {leafPoints.slice(0, progress === 0 ? 0 : leaves).map(([x, y], index) => <circle cx={x} cy={y} r={index % 3 === 0 ? 14 : 11} className="tree-leaf" key={`${x}-${y}`} />)}
      {progress === 0 ? <g className="tree-seedling"><path d="M99 190Q100 171 99 153" className="tree-trunk"/><path d="M99 169Q81 151 72 160Q81 175 99 169M99 163Q116 146 127 154Q119 170 99 163" className="tree-leaf" /></g> : null}
    </svg>
    <p className="tree-source">Growth uses confirmed savings only. Skipped purchases and spending records do not grow the tree.</p>
  </div>;
}
