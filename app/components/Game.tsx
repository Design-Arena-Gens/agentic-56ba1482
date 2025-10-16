'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { World } from '../game/World'
import { Player } from '../game/Player'
import { Controls } from '../game/Controls'
import { BlockType } from '../game/types'
import { Enemy } from '../game/Enemy'
import { SoundManager } from '../game/SoundManager'

export default function Game() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [health, setHealth] = useState(10)
  const [inventory, setInventory] = useState([
    { type: BlockType.GRASS, count: 64 },
    { type: BlockType.DIRT, count: 64 },
    { type: BlockType.STONE, count: 64 },
    { type: BlockType.WOOD, count: 32 },
    { type: BlockType.PLANKS, count: 32 },
    { type: BlockType.LEAVES, count: 32 },
    { type: BlockType.SAND, count: 32 },
    { type: BlockType.WATER, count: 0 },
    { type: BlockType.COAL, count: 16 },
  ])
  const [selectedSlot, setSelectedSlot] = useState(0)
  const [showCrafting, setShowCrafting] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [timeOfDay, setTimeOfDay] = useState(0.3)
  const [targetBlock, setTargetBlock] = useState<string | null>(null)
  const [keybinds, setKeybinds] = useState({
    forward: 'w',
    backward: 's',
    left: 'a',
    right: 'd',
    jump: ' ',
    crafting: 'e',
    sprint: 'shift'
  })
  const [listeningFor, setListeningFor] = useState<string | null>(null)

  const gameRef = useRef<{
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    world: World
    player: Player
    controls: Controls
    enemies: Enemy[]
    sounds: SoundManager
    animationId: number | null
  } | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(0x87CEEB, 50, 200)

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    containerRef.current.appendChild(renderer.domElement)

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(50, 100, 50)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    directionalLight.shadow.camera.near = 0.5
    directionalLight.shadow.camera.far = 500
    directionalLight.shadow.camera.left = -100
    directionalLight.shadow.camera.right = 100
    directionalLight.shadow.camera.top = 100
    directionalLight.shadow.camera.bottom = -100
    scene.add(directionalLight)

    const world = new World(scene)
    const player = new Player(camera, world)
    const controls = new Controls(camera, renderer.domElement, keybinds)
    const sounds = new SoundManager()

    const enemies: Enemy[] = []
    for (let i = 0; i < 5; i++) {
      const x = Math.random() * 80 - 40
      const z = Math.random() * 80 - 40
      const y = world.getHeightAt(x, z) + 2
      const enemy = new Enemy(scene, new THREE.Vector3(x, y, z))
      enemies.push(enemy)
    }

    gameRef.current = {
      scene,
      camera,
      renderer,
      world,
      player,
      controls,
      enemies,
      sounds,
      animationId: null
    }

    let lastTime = performance.now()
    let dayNightTime = 0.3

    const animate = () => {
      const currentTime = performance.now()
      const deltaTime = (currentTime - lastTime) / 1000
      lastTime = currentTime

      controls.update(deltaTime, player)
      player.update(deltaTime, controls)

      dayNightTime += deltaTime * 0.02
      if (dayNightTime > 1) dayNightTime = 0
      setTimeOfDay(dayNightTime)

      const dayNightCycle = Math.sin(dayNightTime * Math.PI * 2) * 0.5 + 0.5
      const skyColor = new THREE.Color().lerpColors(
        new THREE.Color(0x000011),
        new THREE.Color(0x87CEEB),
        dayNightCycle
      )
      scene.fog = new THREE.Fog(skyColor.getHex(), 50, 200)
      scene.background = skyColor
      ambientLight.intensity = 0.3 + dayNightCycle * 0.5
      directionalLight.intensity = 0.2 + dayNightCycle * 0.8

      const sunAngle = dayNightTime * Math.PI * 2
      directionalLight.position.set(
        Math.cos(sunAngle) * 100,
        Math.sin(sunAngle) * 100,
        50
      )

      enemies.forEach(enemy => {
        enemy.update(deltaTime, player.position)

        const dist = enemy.position.distanceTo(player.position)
        if (dist < 1.5) {
          setHealth(h => Math.max(0, h - 0.5 * deltaTime))
        }
      })

      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera)

      const target = world.getTargetBlock(raycaster)
      if (target) {
        setTargetBlock(BlockType[target.blockType])
      } else {
        setTargetBlock(null)
      }

      world.updateChunks(player.position)
      renderer.render(scene, camera)
      gameRef.current!.animationId = requestAnimationFrame(animate)
    }

    animate()

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)

    const handleClick = () => {
      if (showCrafting || showSettings) return

      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera)

      if (controls.keys.leftClick) {
        const removed = world.removeBlock(raycaster)
        if (removed) {
          sounds.playBreak()
          setInventory(inv => {
            const newInv = [...inv]
            const slot = newInv.find(s => s.type === removed)
            if (slot) {
              slot.count++
            }
            return newInv
          })
        }
      }
    }

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      if (showCrafting || showSettings) return

      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera)

      const selectedBlock = inventory[selectedSlot]
      if (selectedBlock && selectedBlock.count > 0) {
        const placed = world.placeBlock(raycaster, selectedBlock.type, player.position)
        if (placed) {
          sounds.playPlace()
          setInventory(inv => {
            const newInv = [...inv]
            newInv[selectedSlot].count--
            return newInv
          })
        }
      }
    }

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (e.deltaY > 0) {
        setSelectedSlot(s => (s + 1) % inventory.length)
      } else {
        setSelectedSlot(s => (s - 1 + inventory.length) % inventory.length)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (listeningFor) return

      const key = e.key.toLowerCase()

      if (key >= '1' && key <= '9') {
        setSelectedSlot(parseInt(key) - 1)
      }

      if (key === keybinds.crafting) {
        setShowCrafting(c => !c)
        controls.setPointerLock(!showCrafting)
      }
    }

    renderer.domElement.addEventListener('click', handleClick)
    renderer.domElement.addEventListener('contextmenu', handleContextMenu)
    renderer.domElement.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('resize', handleResize)
      renderer.domElement.removeEventListener('click', handleClick)
      renderer.domElement.removeEventListener('contextmenu', handleContextMenu)
      renderer.domElement.removeEventListener('wheel', handleWheel)
      window.removeEventListener('keydown', handleKeyDown)

      if (gameRef.current?.animationId) {
        cancelAnimationFrame(gameRef.current.animationId)
      }

      enemies.forEach(enemy => enemy.destroy())
      world.destroy()
      renderer.dispose()
      containerRef.current?.removeChild(renderer.domElement)
    }
  }, [showCrafting, showSettings, keybinds, listeningFor])

  useEffect(() => {
    if (gameRef.current) {
      gameRef.current.controls.updateKeybinds(keybinds)
    }
  }, [keybinds])

  const craft = (recipe: { output: BlockType; ingredients: { type: BlockType; count: number }[] }) => {
    const canCraft = recipe.ingredients.every(ingredient => {
      const slot = inventory.find(s => s.type === ingredient.type)
      return slot && slot.count >= ingredient.count
    })

    if (canCraft) {
      setInventory(inv => {
        const newInv = [...inv]
        recipe.ingredients.forEach(ingredient => {
          const slot = newInv.find(s => s.type === ingredient.type)
          if (slot) slot.count -= ingredient.count
        })
        const outputSlot = newInv.find(s => s.type === recipe.output)
        if (outputSlot) outputSlot.count += 4
        return newInv
      })
      gameRef.current?.sounds.playPlace()
    }
  }

  const recipes = [
    {
      name: 'Planks',
      output: BlockType.PLANKS,
      ingredients: [{ type: BlockType.WOOD, count: 1 }]
    },
    {
      name: 'Sticks',
      output: BlockType.WOOD,
      ingredients: [{ type: BlockType.PLANKS, count: 2 }]
    }
  ]

  const canCraft = (recipe: typeof recipes[0]) => {
    return recipe.ingredients.every(ingredient => {
      const slot = inventory.find(s => s.type === ingredient.type)
      return slot && slot.count >= ingredient.count
    })
  }

  const startListening = (action: string) => {
    setListeningFor(action)
    const handler = (e: KeyboardEvent) => {
      e.preventDefault()
      const key = e.key.toLowerCase()
      setKeybinds(k => ({ ...k, [action]: key }))
      setListeningFor(null)
      window.removeEventListener('keydown', handler)
    }
    window.addEventListener('keydown', handler)
  }

  const getBlockColor = (type: BlockType) => {
    const colors: Record<BlockType, string> = {
      [BlockType.GRASS]: '#7cb342',
      [BlockType.DIRT]: '#8d6e63',
      [BlockType.STONE]: '#757575',
      [BlockType.WOOD]: '#6d4c41',
      [BlockType.PLANKS]: '#a1887f',
      [BlockType.LEAVES]: '#66bb6a',
      [BlockType.SAND]: '#ddc399',
      [BlockType.WATER]: '#42a5f5',
      [BlockType.COAL]: '#212121'
    }
    return colors[type] || '#999'
  }

  return (
    <div id="game-container" ref={containerRef}>
      <div className="hud">
        <div className="crosshair" />

        <div className="health-bar">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className={`heart ${i >= health ? 'empty' : ''}`} />
          ))}
        </div>

        <div className="time-display">
          Time: {Math.floor(timeOfDay * 24)}:00
          {timeOfDay > 0.75 || timeOfDay < 0.25 ? ' 🌙' : ' ☀️'}
        </div>

        {targetBlock && (
          <div className="block-info">
            {targetBlock}
          </div>
        )}

        <div className="inventory-bar">
          {inventory.map((slot, i) => (
            <div key={i} className={`inventory-slot ${i === selectedSlot ? 'active' : ''}`}>
              <div
                className="slot-icon"
                style={{
                  background: slot.count > 0 ? getBlockColor(slot.type) : 'transparent',
                  width: '35px',
                  height: '35px',
                  border: '2px solid rgba(0,0,0,0.3)'
                }}
              />
              {slot.count > 0 && <span className="slot-count">{slot.count}</span>}
            </div>
          ))}
        </div>

        <button className="settings-btn" onClick={() => setShowSettings(!showSettings)}>
          ⚙️ Settings
        </button>

        {showSettings && (
          <div className="settings-menu">
            <h3>Keybindings</h3>
            <div className="keybind-row">
              <span>Forward:</span>
              <button
                className={`keybind-btn ${listeningFor === 'forward' ? 'listening' : ''}`}
                onClick={() => startListening('forward')}
              >
                {listeningFor === 'forward' ? '...' : keybinds.forward.toUpperCase()}
              </button>
            </div>
            <div className="keybind-row">
              <span>Backward:</span>
              <button
                className={`keybind-btn ${listeningFor === 'backward' ? 'listening' : ''}`}
                onClick={() => startListening('backward')}
              >
                {listeningFor === 'backward' ? '...' : keybinds.backward.toUpperCase()}
              </button>
            </div>
            <div className="keybind-row">
              <span>Left:</span>
              <button
                className={`keybind-btn ${listeningFor === 'left' ? 'listening' : ''}`}
                onClick={() => startListening('left')}
              >
                {listeningFor === 'left' ? '...' : keybinds.left.toUpperCase()}
              </button>
            </div>
            <div className="keybind-row">
              <span>Right:</span>
              <button
                className={`keybind-btn ${listeningFor === 'right' ? 'listening' : ''}`}
                onClick={() => startListening('right')}
              >
                {listeningFor === 'right' ? '...' : keybinds.right.toUpperCase()}
              </button>
            </div>
            <div className="keybind-row">
              <span>Jump:</span>
              <button
                className={`keybind-btn ${listeningFor === 'jump' ? 'listening' : ''}`}
                onClick={() => startListening('jump')}
              >
                {listeningFor === 'jump' ? '...' : keybinds.jump === ' ' ? 'SPACE' : keybinds.jump.toUpperCase()}
              </button>
            </div>
            <div className="keybind-row">
              <span>Sprint:</span>
              <button
                className={`keybind-btn ${listeningFor === 'sprint' ? 'listening' : ''}`}
                onClick={() => startListening('sprint')}
              >
                {listeningFor === 'sprint' ? '...' : keybinds.sprint.toUpperCase()}
              </button>
            </div>
            <div className="keybind-row">
              <span>Crafting:</span>
              <button
                className={`keybind-btn ${listeningFor === 'crafting' ? 'listening' : ''}`}
                onClick={() => startListening('crafting')}
              >
                {listeningFor === 'crafting' ? '...' : keybinds.crafting.toUpperCase()}
              </button>
            </div>
            <p style={{ marginTop: '15px', fontSize: '11px', opacity: 0.8 }}>
              Click a button and press a key to rebind
            </p>
          </div>
        )}

        {showCrafting && (
          <div className="crafting-menu">
            <button className="close-btn" onClick={() => setShowCrafting(false)}>✕</button>
            <h2>Crafting</h2>
            <div className="crafting-recipes">
              {recipes.map((recipe, i) => (
                <div
                  key={i}
                  className={`recipe-card ${!canCraft(recipe) ? 'disabled' : ''}`}
                  onClick={() => canCraft(recipe) && craft(recipe)}
                >
                  <div
                    style={{
                      width: '60px',
                      height: '60px',
                      background: getBlockColor(recipe.output),
                      margin: '0 auto 8px',
                      border: '2px solid rgba(0,0,0,0.3)'
                    }}
                  />
                  <div style={{ fontSize: '12px', marginBottom: '5px' }}>{recipe.name}</div>
                  <div style={{ fontSize: '10px', opacity: 0.8 }}>
                    {recipe.ingredients.map(ing => {
                      const slot = inventory.find(s => s.type === ing.type)
                      return `${BlockType[ing.type]}: ${slot?.count || 0}/${ing.count}`
                    }).join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
