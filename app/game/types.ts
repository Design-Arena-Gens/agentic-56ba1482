export enum BlockType {
  GRASS,
  DIRT,
  STONE,
  WOOD,
  PLANKS,
  LEAVES,
  SAND,
  WATER,
  COAL
}

export interface Block {
  x: number
  y: number
  z: number
  type: BlockType
}

export interface Chunk {
  x: number
  z: number
  blocks: Map<string, BlockType>
  mesh?: THREE.Mesh
}
