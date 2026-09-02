import * as THREE from 'three';

const tracerMat = new THREE.LineBasicMaterial({ color: 0x5ef2ff, transparent: true, opacity: 0.9 });
const sparkMat = new THREE.MeshBasicMaterial({ color: 0xff9d3c, transparent: true, opacity: 1 });
const decalGeo = new THREE.RingGeometry(0.025, 0.07, 10);
const decalBaseMat = new THREE.MeshBasicMaterial({ color: 0x1a0d08, transparent: true, opacity: .58, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });

export function spawnTracer(scene, from, to, life = 0.06) {
  const geometry = new THREE.BufferGeometry().setFromPoints([from.clone(), to.clone()]);
  const line = new THREE.Line(geometry, tracerMat.clone());
  scene.add(line);
  const born = performance.now();
  return {
    update(now) {
      const t = (now - born) / (life * 1000);
      line.material.opacity = Math.max(0, 1 - t);
      if (t >= 1) { scene.remove(line); geometry.dispose(); line.material.dispose(); return false; }
      return true;
    }
  };
}

export function spawnImpact(scene, point, normal = new THREE.Vector3(0, 1, 0), count = 5) {
  const group = new THREE.Group();
  scene.add(group);
  const particles = [];
  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.09), sparkMat.clone());
    mesh.position.copy(point);
    const velocity = normal.clone().multiplyScalar(0.7 + Math.random() * 1.7);
    velocity.x += (Math.random() - 0.5) * 2.1;
    velocity.y += Math.random() * 1.4;
    velocity.z += (Math.random() - 0.5) * 2.1;
    group.add(mesh);
    particles.push({ mesh, velocity });
  }

  const decal = new THREE.Mesh(decalGeo, decalBaseMat.clone());
  decal.position.copy(point).addScaledVector(normal, .012);
  decal.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal.clone().normalize());
  decal.rotation.z = Math.random() * Math.PI * 2;
  scene.add(decal);

  let age = 0;
  return {
    update(_now, dt) {
      age += dt;
      if (age < .28) {
        for (const p of particles) {
          p.velocity.y -= 8.5 * dt;
          p.mesh.position.addScaledVector(p.velocity, dt);
          p.mesh.material.opacity = Math.max(0, 1 - age / 0.28);
        }
      } else if (group.parent) {
        scene.remove(group);
        group.traverse(o => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
      }

      if (age > 4.5) decal.material.opacity = Math.max(0, .58 * (1 - (age - 4.5) / 2));
      if (age >= 6.5) {
        scene.remove(decal);
        decal.material.dispose();
        return false;
      }
      return true;
    }
  };
}

export function spawnShell(scene, origin, right) {
  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.055, 6),
    new THREE.MeshStandardMaterial({ color: 0xb98742, metalness: 0.9, roughness: 0.28 })
  );
  shell.rotation.z = Math.PI / 2;
  shell.position.copy(origin);
  scene.add(shell);
  const velocity = right.clone().multiplyScalar(1.5 + Math.random() * 0.6);
  velocity.y = 1.2 + Math.random() * 0.7;
  velocity.z += (Math.random() - 0.5) * 0.4;
  let age = 0;
  return {
    update(_now, dt) {
      age += dt;
      velocity.y -= 6.5 * dt;
      shell.position.addScaledVector(velocity, dt);
      shell.rotation.x += 11 * dt;
      shell.rotation.y += 8 * dt;
      if (shell.position.y < 0.03) { shell.position.y = 0.03; velocity.y *= -0.24; velocity.multiplyScalar(0.78); }
      if (age > 1.3) { scene.remove(shell); shell.geometry.dispose(); shell.material.dispose(); return false; }
      return true;
    }
  };
}
