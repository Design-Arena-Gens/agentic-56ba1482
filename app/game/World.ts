import * as THREE from 'three'
import { createNoise2D } from 'simplex-noise'
import { BlockType, Chunk } from './types'

const CHUNK_SIZE = 16
const CHUNK_HEIGHT = 64
const RENDER_DISTANCE = 4

export class World {
  private scene: THREE.Scene
  private chunks: Map<string, Chunk> = new Map()
  private noise2D: ReturnType<typeof createNoise2D>
  private materials: Map<BlockType, THREE.MeshLambertMaterial> = new Map()
  private geometryCache: THREE.BufferGeometry | null = null

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.noise2D = createNoise2D()
    this.initMaterials()
    this.geometryCache = new THREE.BoxGeometry(1, 1, 1)
  }

  private initMaterials() {
    this.materials.set(BlockType.GRASS, new THREE.MeshLambertMaterial({ color: 0x7cb342 }))
    this.materials.set(BlockType.DIRT, new THREE.MeshLambertMaterial({ color: 0x8d6e63 }))
    this.materials.set(BlockType.STONE, new THREE.MeshLambertMaterial({ color: 0x757575 }))
    this.materials.set(BlockType.WOOD, new THREE.MeshLambertMaterial({ color: 0x6d4c41 }))
    this.materials.set(BlockType.PLANKS, new THREE.MeshLambertMaterial({ color: 0xa1887f }))
    this.materials.set(BlockType.LEAVES, new THREE.MeshLambertMaterial({ color: 0x66bb6a, transparent: true, opacity: 0.8 }))
    this.materials.set(BlockType.SAND, new THREE.MeshLambertMaterial({ color: 0xddc399 }))
    this.materials.set(BlockType.WATER, new THREE.MeshLambertMaterial({ color: 0x42a5f5, transparent: true, opacity: 0.6 }))
    this.materials.set(BlockType.COAL, new THREE.MeshLambertMaterial({ color: 0x212121 }))
  }

  getHeightAt(x: number, z: number): number {
    const scale = 0.03
    const noise = this.noise2D(x * scale, z * scale)
    const height = Math.floor(10 + noise * 8)
    return height
  }

  private generateChunk(chunkX: number, chunkZ: number): Chunk {
    const chunk: Chunk = {
      x: chunkX,
      z: chunkZ,
      blocks: new Map()
    }

    const offsetX = chunkX * CHUNK_SIZE
    const offsetZ = chunkZ * CHUNK_SIZE

    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const worldX = offsetX + x
        const worldZ = offsetZ + z
        const height = this.getHeightAt(worldX, worldZ)

        for (let y = 0; y <= height; y++) {
          let blockType = BlockType.STONE

          if (y === height) {
            if (height < 8) {
              blockType = BlockType.SAND
            } else {
              blockType = BlockType.GRASS
            }
          } else if (y > height - 3) {
            blockType = BlockType.DIRT
          } else if (Math.random() < 0.05 && y < height - 5) {
            blockType = BlockType.COAL
          }

          const key = `${x},${y},${z}`
          chunk.blocks.set(key, blockType)
        }

        if (height >= 8 && Math.random() < 0.02) {
          const treeHeight = 5
          for (let y = height + 1; y <= height + treeHeight; y++) {
            chunk.blocks.set(`${x},${y},${z}`, BlockType.WOOD)
          }

          for (let dx = -2; dx <= 2; dx++) {
            for (let dz = -2; dz <= 2; dz++) {
              for (let dy = 0; dy < 3; dy++) {
                if (dx === 0 && dz === 0 && dy < 2) continue
                const leafX = x + dx
                const leafZ = z + dz
                const leafY = height + treeHeight - 1 + dy
                if (leafX >= 0 && leafX < CHUNK_SIZE && leafZ >= 0 && leafZ < CHUNK_SIZE) {
                  chunk.blocks.set(`${leafX},${leafY},${leafZ}`, BlockType.LEAVES)
                }
              }
            }
          }
        }

        if (height < 8) {
          for (let y = height + 1; y <= 8; y++) {
            chunk.blocks.set(`${x},${y},${z}`, BlockType.WATER)
          }
        }
      }
    }

    return chunk
  }

  private buildChunkMesh(chunk: Chunk) {
    if (chunk.mesh) {
      this.scene.remove(chunk.mesh)
      chunk.mesh.geometry.dispose()
    }

    const geometries: Map<BlockType, THREE.BoxGeometry[]> = new Map()

    chunk.blocks.forEach((blockType, key) => {
      const [x, y, z] = key.split(',').map(Number)

      const hasTop = !chunk.blocks.has(`${x},${y + 1},${z}`) ||
                     (chunk.blocks.get(`${x},${y + 1},${z}`) === BlockType.WATER && blockType !== BlockType.WATER)
      const hasBottom = !chunk.blocks.has(`${x},${y - 1},${z}`)
      const hasLeft = !chunk.blocks.has(`${x - 1},${y},${z}`) ||
                      (chunk.blocks.get(`${x - 1},${y},${z}`) === BlockType.WATER && blockType !== BlockType.WATER)
      const hasRight = !chunk.blocks.has(`${x + 1},${y},${z}`) ||
                       (chunk.blocks.get(`${x + 1},${y},${z}`) === BlockType.WATER && blockType !== BlockType.WATER)
      const hasFront = !chunk.blocks.has(`${x},${y},${z + 1}`) ||
                       (chunk.blocks.get(`${x},${y},${z + 1}`) === BlockType.WATER && blockType !== BlockType.WATER)
      const hasBack = !chunk.blocks.has(`${x},${y},${z - 1}`) ||
                      (chunk.blocks.get(`${x},${y},${z - 1}`) === BlockType.WATER && blockType !== BlockType.WATER)

      if (hasTop || hasBottom || hasLeft || hasRight || hasFront || hasBack) {
        const geometry = new THREE.BoxGeometry(1, 1, 1)
        const worldX = chunk.x * CHUNK_SIZE + x
        const worldZ = chunk.z * CHUNK_SIZE + z
        geometry.translate(worldX, y, worldZ)

        if (!geometries.has(blockType)) {
          geometries.set(blockType, [])
        }
        geometries.get(blockType)!.push(geometry)
      }
    })

    const group = new THREE.Group()

    geometries.forEach((geos, blockType) => {
      const mergedGeometry = new THREE.BufferGeometry()

      const positions: number[] = []
      const normals: number[] = []
      const uvs: number[] = []

      geos.forEach(geo => {
        const pos = geo.attributes.position.array
        const norm = geo.attributes.normal.array
        const uv = geo.attributes.uv.array

        positions.push(...pos)
        normals.push(...norm)
        uvs.push(...uv)

        geo.dispose()
      })

      mergedGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      mergedGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
      mergedGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))

      const material = this.materials.get(blockType)!
      const mesh = new THREE.Mesh(mergedGeometry, material)
      mesh.castShadow = true
      mesh.receiveShadow = true
      group.add(mesh)
    })

    this.scene.add(group)
    chunk.mesh = group as any
  }

  updateChunks(playerPos: THREE.Vector3) {
    const playerChunkX = Math.floor(playerPos.x / CHUNK_SIZE)
    const playerChunkZ = Math.floor(playerPos.z / CHUNK_SIZE)

    const neededChunks = new Set<string>()

    for (let x = playerChunkX - RENDER_DISTANCE; x <= playerChunkX + RENDER_DISTANCE; x++) {
      for (let z = playerChunkZ - RENDER_DISTANCE; z <= playerChunkZ + RENDER_DISTANCE; z++) {
        const key = `${x},${z}`
        neededChunks.add(key)

        if (!this.chunks.has(key)) {
          const chunk = this.generateChunk(x, z)
          this.chunks.set(key, chunk)
          this.buildChunkMesh(chunk)
        }
      }
    }

    this.chunks.forEach((chunk, key) => {
      if (!neededChunks.has(key)) {
        if (chunk.mesh) {
          this.scene.remove(chunk.mesh)
          chunk.mesh.traverse(child => {
            if (child instanceof THREE.Mesh) {
              child.geometry.dispose()
            }
          })
        }
        this.chunks.delete(key)
      }
    })
  }

  getTargetBlock(raycaster: THREE.Raycaster): { position: THREE.Vector3; blockType: BlockType } | null {
    const maxDistance = 5
    const step = 0.1
    const direction = raycaster.ray.direction.clone()
    const origin = raycaster.ray.origin.clone()

    for (let i = 0; i < maxDistance / step; i++) {
      const point = origin.clone().add(direction.clone().multiplyScalar(i * step))
      const blockType = this.getBlockAt(Math.floor(point.x), Math.floor(point.y), Math.floor(point.z))

      if (blockType !== null) {
        return {
          position: new THREE.Vector3(Math.floor(point.x), Math.floor(point.y), Math.floor(point.z)),
          blockType
        }
      }
    }

    return null
  }

  getBlockAt(x: number, y: number, z: number): BlockType | null {
    const chunkX = Math.floor(x / CHUNK_SIZE)
    const chunkZ = Math.floor(z / CHUNK_SIZE)
    const key = `${chunkX},${chunkZ}`
    const chunk = this.chunks.get(key)

    if (!chunk) return null

    const localX = x - chunkX * CHUNK_SIZE
    const localZ = z - chunkZ * CHUNK_SIZE
    const blockKey = `${localX},${y},${localZ}`

    return chunk.blocks.get(blockKey) ?? null
  }

  removeBlock(raycaster: THREE.Raycaster): BlockType | null {
    const target = this.getTargetBlock(raycaster)
    if (!target) return null

    const { x, y, z } = target.position
    const chunkX = Math.floor(x / CHUNK_SIZE)
    const chunkZ = Math.floor(z / CHUNK_SIZE)
    const key = `${chunkX},${chunkZ}`
    const chunk = this.chunks.get(key)

    if (!chunk) return null

    const localX = x - chunkX * CHUNK_SIZE
    const localZ = z - chunkZ * CHUNK_SIZE
    const blockKey = `${localX},${y},${localZ}`

    const blockType = chunk.blocks.get(blockKey)
    if (blockType === undefined) return null

    chunk.blocks.delete(blockKey)
    this.buildChunkMesh(chunk)

    return blockType
  }

  placeBlock(raycaster: THREE.Raycaster, blockType: BlockType, playerPos: THREE.Vector3): boolean {
    const target = this.getTargetBlock(raycaster)
    if (!target) return false

    const direction = raycaster.ray.direction.clone()
    const point = target.position.clone().add(direction.clone().multiplyScalar(0.5))

    let placeX = Math.floor(point.x)
    let placeY = Math.floor(point.y)
    let placeZ = Math.floor(point.z)

    const dx = Math.abs(point.x - target.position.x)
    const dy = Math.abs(point.y - target.position.y)
    const dz = Math.abs(point.z - target.position.z)

    if (dx > dy && dx > dz) {
      placeX = point.x > target.position.x ? target.position.x + 1 : target.position.x - 1
      placeY = target.position.y
      placeZ = target.position.z
    } else if (dy > dx && dy > dz) {
      placeX = target.position.x
      placeY = point.y > target.position.y ? target.position.y + 1 : target.position.y - 1
      placeZ = target.position.z
    } else {
      placeX = target.position.x
      placeY = target.position.y
      placeZ = point.z > target.position.z ? target.position.z + 1 : target.position.z - 1
    }

    const playerBox = new THREE.Box3(
      new THREE.Vector3(playerPos.x - 0.3, playerPos.y, playerPos.z - 0.3),
      new THREE.Vector3(playerPos.x + 0.3, playerPos.y + 1.8, playerPos.z + 0.3)
    )

    const blockBox = new THREE.Box3(
      new THREE.Vector3(placeX, placeY, placeZ),
      new THREE.Vector3(placeX + 1, placeY + 1, placeZ + 1)
    )

    if (playerBox.intersectsBox(blockBox)) {
      return false
    }

    const chunkX = Math.floor(placeX / CHUNK_SIZE)
    const chunkZ = Math.floor(placeZ / CHUNK_SIZE)
    const key = `${chunkX},${chunkZ}`
    const chunk = this.chunks.get(key)

    if (!chunk) return false

    const localX = placeX - chunkX * CHUNK_SIZE
    const localZ = placeZ - chunkZ * CHUNK_SIZE
    const blockKey = `${localX},${placeY},${localZ}`

    chunk.blocks.set(blockKey, blockType)
    this.buildChunkMesh(chunk)

    return true
  }

  checkCollision(box: THREE.Box3): boolean {
    const minX = Math.floor(box.min.x)
    const minY = Math.floor(box.min.y)
    const minZ = Math.floor(box.min.z)
    const maxX = Math.ceil(box.max.x)
    const maxY = Math.ceil(box.max.y)
    const maxZ = Math.ceil(box.max.z)

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const block = this.getBlockAt(x, y, z)
          if (block !== null && block !== BlockType.WATER) {
            const blockBox = new THREE.Box3(
              new THREE.Vector3(x, y, z),
              new THREE.Vector3(x + 1, y + 1, z + 1)
            )
            if (box.intersectsBox(blockBox)) {
              return true
            }
          }
        }
      }
    }

    return false
  }

  destroy() {
    this.chunks.forEach(chunk => {
      if (chunk.mesh) {
        this.scene.remove(chunk.mesh)
        chunk.mesh.traverse(child => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose()
          }
        })
      }
    })
    this.chunks.clear()
    this.materials.forEach(mat => mat.dispose())
    this.geometryCache?.dispose()
  }
}
