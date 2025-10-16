import * as THREE from 'three'

export class Enemy {
  public position: THREE.Vector3
  private mesh: THREE.Group
  private scene: THREE.Scene
  private velocity: THREE.Vector3
  private speed = 2

  constructor(scene: THREE.Scene, position: THREE.Vector3) {
    this.scene = scene
    this.position = position.clone()
    this.velocity = new THREE.Vector3()

    this.mesh = new THREE.Group()

    const bodyGeometry = new THREE.BoxGeometry(0.8, 1.6, 0.4)
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x44aa44 })
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    body.position.y = 0.8
    body.castShadow = true
    this.mesh.add(body)

    const headGeometry = new THREE.BoxGeometry(0.6, 0.6, 0.6)
    const headMaterial = new THREE.MeshLambertMaterial({ color: 0x55bb55 })
    const head = new THREE.Mesh(headGeometry, headMaterial)
    head.position.y = 1.9
    head.castShadow = true
    this.mesh.add(head)

    const eyeGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.1)
    const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 })

    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    leftEye.position.set(-0.15, 1.95, 0.25)
    this.mesh.add(leftEye)

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    rightEye.position.set(0.15, 1.95, 0.25)
    this.mesh.add(rightEye)

    const armGeometry = new THREE.BoxGeometry(0.3, 1.2, 0.3)
    const armMaterial = new THREE.MeshLambertMaterial({ color: 0x44aa44 })

    const leftArm = new THREE.Mesh(armGeometry, armMaterial)
    leftArm.position.set(-0.55, 0.8, 0)
    leftArm.castShadow = true
    this.mesh.add(leftArm)

    const rightArm = new THREE.Mesh(armGeometry, armMaterial)
    rightArm.position.set(0.55, 0.8, 0)
    rightArm.castShadow = true
    this.mesh.add(rightArm)

    const legGeometry = new THREE.BoxGeometry(0.3, 0.8, 0.3)
    const legMaterial = new THREE.MeshLambertMaterial({ color: 0x3d8f3d })

    const leftLeg = new THREE.Mesh(legGeometry, legMaterial)
    leftLeg.position.set(-0.2, 0.4, 0)
    leftLeg.castShadow = true
    this.mesh.add(leftLeg)

    const rightLeg = new THREE.Mesh(legGeometry, legMaterial)
    rightLeg.position.set(0.2, 0.4, 0)
    rightLeg.castShadow = true
    this.mesh.add(rightLeg)

    this.mesh.position.copy(position)
    scene.add(this.mesh)
  }

  update(deltaTime: number, playerPosition: THREE.Vector3) {
    const direction = new THREE.Vector3()
      .subVectors(playerPosition, this.position)
      .normalize()

    const distance = this.position.distanceTo(playerPosition)

    if (distance > 2 && distance < 20) {
      this.velocity.copy(direction.multiplyScalar(this.speed * deltaTime))
      this.position.add(this.velocity)

      const angle = Math.atan2(direction.x, direction.z)
      this.mesh.rotation.y = angle
    }

    this.mesh.position.copy(this.position)

    const time = Date.now() * 0.001
    this.mesh.children[0].rotation.z = Math.sin(time * 5) * 0.1
    this.mesh.children[3].rotation.x = Math.sin(time * 8) * 0.3
    this.mesh.children[4].rotation.x = Math.sin(time * 8 + Math.PI) * 0.3
    this.mesh.children[5].rotation.x = Math.sin(time * 8) * 0.3
    this.mesh.children[6].rotation.x = Math.sin(time * 8 + Math.PI) * 0.3
  }

  destroy() {
    this.scene.remove(this.mesh)
    this.mesh.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose()
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => mat.dispose())
        } else {
          child.material.dispose()
        }
      }
    })
  }
}
