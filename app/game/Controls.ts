import * as THREE from 'three'
import { Player } from './Player'

export class Controls {
  public keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    sprint: false,
    leftClick: false,
    rightClick: false
  }

  private camera: THREE.PerspectiveCamera
  private domElement: HTMLElement
  private keybinds: { [key: string]: string }
  private locked = false
  private rotation = new THREE.Euler(0, 0, 0, 'YXZ')

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, keybinds: { [key: string]: string }) {
    this.camera = camera
    this.domElement = domElement
    this.keybinds = keybinds

    this.rotation.setFromQuaternion(camera.quaternion)

    domElement.addEventListener('click', () => {
      if (!this.locked) {
        domElement.requestPointerLock()
      }
    })

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === domElement
    })

    document.addEventListener('mousemove', this.onMouseMove)
    document.addEventListener('keydown', this.onKeyDown)
    document.addEventListener('keyup', this.onKeyUp)
    document.addEventListener('mousedown', this.onMouseDown)
    document.addEventListener('mouseup', this.onMouseUp)
  }

  private onMouseMove = (event: MouseEvent) => {
    if (!this.locked) return

    const sensitivity = 0.002

    this.rotation.y -= event.movementX * sensitivity
    this.rotation.x -= event.movementY * sensitivity

    this.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.rotation.x))

    this.camera.quaternion.setFromEuler(this.rotation)
  }

  private onKeyDown = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase()

    if (key === this.keybinds.forward) this.keys.forward = true
    if (key === this.keybinds.backward) this.keys.backward = true
    if (key === this.keybinds.left) this.keys.left = true
    if (key === this.keybinds.right) this.keys.right = true
    if (key === this.keybinds.jump) this.keys.jump = true
    if (key === this.keybinds.sprint) this.keys.sprint = true
  }

  private onKeyUp = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase()

    if (key === this.keybinds.forward) this.keys.forward = false
    if (key === this.keybinds.backward) this.keys.backward = false
    if (key === this.keybinds.left) this.keys.left = false
    if (key === this.keybinds.right) this.keys.right = false
    if (key === this.keybinds.jump) this.keys.jump = false
    if (key === this.keybinds.sprint) this.keys.sprint = false
  }

  private onMouseDown = (event: MouseEvent) => {
    if (!this.locked) return

    if (event.button === 0) {
      this.keys.leftClick = true
    } else if (event.button === 2) {
      this.keys.rightClick = true
    }
  }

  private onMouseUp = (event: MouseEvent) => {
    if (event.button === 0) {
      this.keys.leftClick = false
    } else if (event.button === 2) {
      this.keys.rightClick = false
    }
  }

  update(deltaTime: number, player: Player) {
    // Controls are handled in event listeners
  }

  setPointerLock(lock: boolean) {
    if (lock && !this.locked) {
      this.domElement.requestPointerLock()
    } else if (!lock && this.locked) {
      document.exitPointerLock()
    }
  }

  updateKeybinds(newKeybinds: { [key: string]: string }) {
    this.keybinds = newKeybinds
  }

  destroy() {
    document.removeEventListener('mousemove', this.onMouseMove)
    document.removeEventListener('keydown', this.onKeyDown)
    document.removeEventListener('keyup', this.onKeyUp)
    document.removeEventListener('mousedown', this.onMouseDown)
    document.removeEventListener('mouseup', this.onMouseUp)
  }
}
