import * as THREE from 'three';

export class ViewmodelSpring {
  constructor(group) {
    this.group = group;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.rot = new THREE.Vector3();
    this.rotVel = new THREE.Vector3();
    this.k = 105;
    this.d = 17;
    this.rotK = 90;
    this.rotD = 15;
    this.recoil = new THREE.Vector3();
    this.recoilVel = new THREE.Vector3();
    this.lastYaw = 0;
    this.lastPitch = 0;
    this.bobTime = 0;
  }

  kick(pitch, yaw = 0, back = 0.055) {
    this.recoilVel.x += pitch * 7.5;
    this.recoilVel.y += yaw * 7.5;
    this.vel.z += back * 5.4;
  }

  update(dt, { yaw, pitch, moving, sprinting, ads, speed01 }) {
    const yawDelta = yaw - this.lastYaw;
    const pitchDelta = pitch - this.lastPitch;
    this.lastYaw = yaw;
    this.lastPitch = pitch;

    this.bobTime += dt * (moving ? (sprinting ? 12.5 : 8.2) : 2.0);
    const bob = moving ? Math.min(1, speed01) : 0;
    const targetPos = new THREE.Vector3(
      ads ? -0.27 : 0,
      (ads ? 0.018 : 0) + Math.sin(this.bobTime * 2) * 0.006 * bob,
      (sprinting ? 0.09 : 0) + Math.cos(this.bobTime) * 0.009 * bob
    );
    const targetRot = new THREE.Vector3(
      (ads ? -0.018 : 0.04) + pitchDelta * 1.7 + Math.sin(this.bobTime * 2) * 0.006 * bob,
      yawDelta * 1.8,
      (sprinting ? -0.11 : 0) + yawDelta * 0.8
    );

    const accel = targetPos.clone().sub(this.pos).multiplyScalar(this.k).addScaledVector(this.vel, -this.d);
    this.vel.addScaledVector(accel, dt);
    this.pos.addScaledVector(this.vel, dt);

    const rotAccel = targetRot.clone().sub(this.rot).multiplyScalar(this.rotK).addScaledVector(this.rotVel, -this.rotD);
    this.rotVel.addScaledVector(rotAccel, dt);
    this.rot.addScaledVector(this.rotVel, dt);

    this.recoilVel.addScaledVector(this.recoil, -125 * dt);
    this.recoilVel.multiplyScalar(Math.exp(-17 * dt));
    this.recoil.addScaledVector(this.recoilVel, dt);

    this.group.position.copy(this.pos);
    this.group.rotation.set(this.rot.x - this.recoil.x, this.rot.y + this.recoil.y, this.rot.z);
  }
}
