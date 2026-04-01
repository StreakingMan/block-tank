/**
 * 方块形状数据定义 - 7种标准方块 + 旋转矩阵 + 武器元数据
 * 坐标 [row, col] 相对于方块锚点（左下角）
 */
import { BlockShape } from '../../core/Constants';

/** 方块旋转状态：4个状态，每个状态是格子偏移坐标数组 [row, col][] */
export type BlockRotations = [number, number][][];

export const BLOCK_SHAPES: Record<BlockShape, BlockRotations> = {
    [BlockShape.I]: [
        [[0, 0], [0, 1], [0, 2], [0, 3]],
        [[0, 0], [1, 0], [2, 0], [3, 0]],
        [[0, 0], [0, 1], [0, 2], [0, 3]],
        [[0, 0], [1, 0], [2, 0], [3, 0]],
    ],
    [BlockShape.O]: [
        [[0, 0], [0, 1], [1, 0], [1, 1]],
        [[0, 0], [0, 1], [1, 0], [1, 1]],
        [[0, 0], [0, 1], [1, 0], [1, 1]],
        [[0, 0], [0, 1], [1, 0], [1, 1]],
    ],
    [BlockShape.T]: [
        [[0, 0], [0, 1], [0, 2], [1, 1]],
        [[0, 0], [1, 0], [2, 0], [1, 1]],
        [[1, 0], [1, 1], [1, 2], [0, 1]],
        [[0, 1], [1, 1], [2, 1], [1, 0]],
    ],
    [BlockShape.S]: [
        [[0, 0], [0, 1], [1, 1], [1, 2]],
        [[0, 1], [1, 0], [1, 1], [2, 0]],
        [[0, 0], [0, 1], [1, 1], [1, 2]],
        [[0, 1], [1, 0], [1, 1], [2, 0]],
    ],
    [BlockShape.Z]: [
        [[0, 1], [0, 2], [1, 0], [1, 1]],
        [[0, 0], [1, 0], [1, 1], [2, 1]],
        [[0, 1], [0, 2], [1, 0], [1, 1]],
        [[0, 0], [1, 0], [1, 1], [2, 1]],
    ],
    [BlockShape.L]: [
        [[0, 0], [0, 1], [0, 2], [1, 0]],
        [[0, 0], [1, 0], [2, 0], [2, 1]],
        [[1, 0], [1, 1], [1, 2], [0, 2]],
        [[0, 0], [0, 1], [1, 1], [2, 1]],
    ],
    [BlockShape.J]: [
        [[0, 0], [0, 1], [0, 2], [1, 2]],
        [[0, 0], [0, 1], [1, 0], [2, 0]],
        [[0, 0], [1, 0], [1, 1], [1, 2]],
        [[0, 1], [1, 1], [2, 0], [2, 1]],
    ],
};

/** 方块颜色索引 */
export const BLOCK_COLOR_INDEX: Record<BlockShape, number> = {
    [BlockShape.I]: 0,
    [BlockShape.O]: 1,
    [BlockShape.T]: 2,
    [BlockShape.S]: 3,
    [BlockShape.Z]: 4,
    [BlockShape.L]: 5,
    [BlockShape.J]: 6,
};

/** 所有方块形状列表 */
export const ALL_SHAPES: BlockShape[] = [
    BlockShape.I, BlockShape.O, BlockShape.T,
    BlockShape.S, BlockShape.Z, BlockShape.L, BlockShape.J,
];

/** 获取方块在当前旋转状态下的实际网格占位 */
export function getBlockCells(shape: BlockShape, rotation: number): [number, number][] {
    return BLOCK_SHAPES[shape][rotation % 4];
}

/** 获取方块的包围盒尺寸 */
export function getBlockBounds(cells: [number, number][]): { minR: number; maxR: number; minC: number; maxC: number; width: number; height: number } {
    let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
    for (const [r, c] of cells) {
        minR = Math.min(minR, r);
        maxR = Math.max(maxR, r);
        minC = Math.min(minC, c);
        maxC = Math.max(maxC, c);
    }
    return { minR, maxR, minC, maxC, width: maxC - minC + 1, height: maxR - minR + 1 };
}
