import * as THREE from 'three'
import { World } from './World'
import { Controls } from './Controls'

export class Player {
  public position: THREE.Vector3
  public velocity: THREE.Vector3
  private camera: THREE.PerspectiveCamera
  private world: World
  private onGround: boolean = false
  private readonly height = 1.8
  private readonly radius = 0.3
  private readonly gravity = -25
  private readonly jumpStrength = 10

  constructor(camera: THREE.PerspectiveCamera, world: World) {
    this.camera = camera
    this.world = world

    const spawnX = 0
    const spawnZ = 0
    const spawnY = world.getHeightAt(spawnX, spawnZ) + 3

    this.position = new THREE.Vector3(spawnX, spawnY, spawnZ)
    this.velocity = new THREE.Vector3(0, 0, 0)
    camera.position.copy(this.position)
  }

  update(deltaTime: number, controls: Controls) {
    const moveSpeed = controls.keys.sprint ? 8 : 5
    const acceleration = 50

    const forward = new THREE.Vector3()
    const right = new THREE.Vector3()

    this.camera.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()

    const targetVelocity = new THREE.Vector3(0, this.velocity.y, 0)

    if (controls.keys.forward) {
      targetVelocity.add(forward.clone().multiplyScalar(moveSpeed))
    }
    if (controls.keys.backward) {
      targetVelocity.sub(forward.clone().multiplyScalar(moveSpeed))
    }
    if (controls.keys.left) {
      targetVelocity.sub(right.clone().multiplyScalar(moveSpeed))
    }
    if (controls.keys.right) {
      targetVelocity.add(right.clone().multiplyScalar(moveSpeed))
    }

    this.velocity.x += (targetVelocity.x - this.velocity.x) * acceleration * deltaTime
    this.velocity.z += (targetVelocity.z - this.velocity.z) * acceleration * deltaTime

    if (this.onGround && controls.keys.jump) {
      this.velocity.y = this.jumpStrength
      this.onGround = false
    }

    this.velocity.y += this.gravity * deltaTime

    const movement = this.velocity.clone().multiplyScalar(deltaTime)

    const box = new THREE.Box3(
      new THREE.Vector3(
        this.position.x - this.radius,
        this.position.y,
        this.position.z - this.radius
      ),
      new THREE.Vector3(
        this.position.x + this.radius,
        this.position.y + this.height,
        this.position.z + this.radius
      )
    )

    const steps = Math.ceil(movement.length() * 10)
    const stepMovement = movement.clone().divideScalar(steps)

    for (let i = 0; i < steps; i++) {
      const testBox = box.clone()
      testBox.translate(new THREE.Vector3(stepMovement.x, 0, 0))

      if (!this.world.checkCollision(testBox)) {
        this.position.x += stepMovement.x
        box.translate(new THREE.Vector3(stepMovement.x, 0, 0))
      } else {
        this.velocity.x = 0
      }

      testBox.copy(box)
      testBox.translate(new THREE.Vector3(0, 0, stepMovement.z))

      if (!this.world.checkCollision(testBox)) {
        this.position.z += stepMovement.z
        box.translate(new THREE.Vector3(0, 0, stepMovement.z))
      } else {
        this.velocity.z = 0
      }

      testBox.copy(box)
      testBox.translate(new THREE.Vector3(0, stepMovement.y, 0))

      if (!this.world.checkCollision(testBox)) {
        this.position.y += stepMovement.y
        box.translate(new THREE.Vector3(0, stepMovement.y, 0))
        this.onGround = false
      } else {
        if (this.velocity.y < 0) {
          this.onGround = true
        }
        this.velocity.y = 0
      }
    }

    this.velocity.x *= 0.9
    this.velocity.z *= 0.9

    this.camera.position.copy(this.position).add(new THREE.Vector3(0, this.height * 0.9, 0))
  }
}
