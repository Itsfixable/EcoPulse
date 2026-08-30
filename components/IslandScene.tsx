"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { HALF, siteY, type Site, type TerrainModel } from "./terrain";
import type { HourPlan } from "@/lib/types";

function Terrain({ t }: { t: TerrainModel }) {
  const geo = useMemo(() => {
    const seg = 180;
    const g = new THREE.PlaneGeometry(HALF * 2, HALF * 2, seg, seg);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const colors: number[] = [];

    const seabed = new THREE.Color("#12212b");
    const sand = new THREE.Color("#b9a173");
    const low = new THREE.Color("#2f5c3e");
    const mid = new THREE.Color("#47694a");
    const rock = new THREE.Color("#6f6659");

    for (let i = 0; i < pos.count; i++) {
      const y = t.heightAt(pos.getX(i), pos.getZ(i));
      pos.setY(i, y);
      const c = new THREE.Color();
      if (y <= 0) c.copy(seabed);
      else if (y < 0.09) c.copy(sand);
      else if (y < 1.0) c.lerpColors(low, mid, y / 1.0);
      else c.lerpColors(mid, rock, Math.min(1, (y - 1.0) / 1.4));
      colors.push(c.r, c.g, c.b);
    }
    g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, [t]);

  return (
    <mesh geometry={geo}>
      <meshStandardMaterial vertexColors roughness={0.95} metalness={0} flatShading />
    </mesh>
  );
}

function Ocean({ night }: { night: boolean }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <circleGeometry args={[70, 96]} />
      <meshStandardMaterial
        color={night ? "#040810" : "#0a2333"}
        roughness={0.8}
        metalness={0.05}
        transparent
        opacity={0.94}
      />
    </mesh>
  );
}

function Flow({
  from,
  to,
  power,
  color,
}: {
  from: THREE.Vector3;
  to: THREE.Vector3;
  power: number;
  color: string;
}) {
  const curve = useMemo(() => {
    const mid = from.clone().lerp(to, 0.5);
    mid.y += from.distanceTo(to) * 0.26 + 0.45;
    return new THREE.QuadraticBezierCurve3(from, mid, to);
  }, [from, to]);

  const lineGeo = useMemo(
    () => new THREE.BufferGeometry().setFromPoints(curve.getPoints(40)),
    [curve],
  );
  const material = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: Math.min(0.5, 0.14 + power / 1600),
      }),
    [color, power],
  );
  const line = useMemo(() => new THREE.Line(lineGeo, material), [lineGeo, material]);

  const count = Math.max(1, Math.min(7, Math.round(power / 90)));
  const dots = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    if (!dots.current) return;
    const t = clock.getElapsedTime();
    for (let i = 0; i < count; i++) {
      const p = (t * 0.34 + i / count) % 1;
      dummy.position.copy(curve.getPoint(p));
      dummy.scale.setScalar(0.07);
      dummy.updateMatrix();
      dots.current.setMatrixAt(i, dummy.matrix);
    }
    dots.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <primitive object={line} />
      <instancedMesh ref={dots} args={[undefined, undefined, count]} key={count}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color={color} />
      </instancedMesh>
    </group>
  );
}

function Marker({
  site,
  y,
  active,
  intensity,
}: {
  site: Site;
  y: number;
  active: boolean;
  intensity: number;
}) {
  const h = site.kind === "source" ? 0.46 : 0.3;
  const len = Math.hypot(site.x, site.z) || 1;
  const out = { x: site.x / len, z: site.z / len };

  return (
    <group position={[site.x, y, site.z]}>
      <mesh position={[0, h / 2, 0]}>
        <cylinderGeometry args={[0.07, 0.07, h, 10]} />
        <meshStandardMaterial
          color={active ? site.color : "#2b3442"}
          emissive={active ? site.color : "#000000"}
          emissiveIntensity={active ? 0.5 + intensity : 0}
        />
      </mesh>
      <mesh position={[0, h + 0.1, 0]}>
        <sphereGeometry args={[0.12, 14, 14]} />
        <meshStandardMaterial
          color={active ? site.color : "#39434f"}
          emissive={active ? site.color : "#000000"}
          emissiveIntensity={active ? 1.1 + intensity * 1.6 : 0}
        />
      </mesh>
      {active && (
        <Html center distanceFactor={8} position={[out.x * 0.55, h + 0.62, out.z * 0.55]} zIndexRange={[10, 0]}>
          <div
            style={{
              fontSize: 11,
              lineHeight: 1.1,
              whiteSpace: "nowrap",
              color: "#dfe7f0",
              background: "rgba(8,11,17,0.82)",
              border: "1px solid rgba(120,140,170,0.22)",
              borderRadius: 5,
              padding: "3px 6px",
              fontWeight: 500,
              pointerEvents: "none",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 5,
                height: 5,
                borderRadius: 9,
                background: site.color,
                marginRight: 5,
                verticalAlign: "middle",
              }}
            />
            {site.label}
          </div>
        </Html>
      )}
    </group>
  );
}

function Scene({
  plan,
  terrain,
  sites,
}: {
  plan: HourPlan;
  terrain: TerrainModel;
  sites: Site[];
}) {
  const hour = plan.hour;
  const day = hour >= 6 && hour <= 18;
  const angle = ((hour - 6) / 12) * Math.PI;

  const hub = useMemo(() => {
    const peak = sites.reduce(
      (best, s) => (siteY(terrain, s) > siteY(terrain, best) ? s : best),
      sites[0],
    );
    return new THREE.Vector3(peak.x * 0.3, siteY(terrain, peak) + 1.3, peak.z * 0.3);
  }, [terrain, sites]);

  const sourcePower: Record<string, number> = {
    solar: plan.solarKw,
    wind: plan.windKw,
    battery: Math.max(0, plan.batteryKw),
    generator: plan.dieselKw,
  };

  return (
    <>
      <ambientLight intensity={day ? 0.55 : 0.18} />
      <directionalLight
        position={[Math.cos(angle) * 11, Math.max(Math.sin(angle) * 9, 0.6), 4]}
        intensity={day ? 1.5 : 0.15}
        color={day ? "#fff3e0" : "#4a6ea8"}
      />
      <hemisphereLight args={["#5f7fa8", "#101418", day ? 0.5 : 0.25]} />

      <Terrain t={terrain} />
      <Ocean night={!day} />

      {sites.map((s) => {
        const isSource = s.kind === "source";
        const p = sourcePower[s.id] ?? 0;
        return (
          <Marker
            key={s.id}
            site={s}
            y={siteY(terrain, s)}
            active={isSource ? p > 1 : plan.servedLoadIds.includes(s.id)}
            intensity={isSource ? Math.min(1, p / 900) : 0.25}
          />
        );
      })}

      {sites
        .filter((s) => s.kind === "source" && (sourcePower[s.id] ?? 0) > 1)
        .map((s) => (
          <Flow
            key={s.id}
            from={new THREE.Vector3(s.x, siteY(terrain, s) + 0.55, s.z)}
            to={hub}
            power={sourcePower[s.id]}
            color={s.color}
          />
        ))}

      {sites
        .filter((s) => s.kind === "load" && plan.servedLoadIds.includes(s.id))
        .map((s) => (
          <Flow
            key={s.id}
            from={hub}
            to={new THREE.Vector3(s.x, siteY(terrain, s) + 0.4, s.z)}
            power={260}
            color={s.id === "desal" ? "#45a5d8" : "#93a3b8"}
          />
        ))}

      <OrbitControls
        enablePan={false}
        minDistance={9}
        maxDistance={28}
        minPolarAngle={Math.PI / 5}
        maxPolarAngle={Math.PI / 2.06}
        autoRotate
        autoRotateSpeed={0.22}
      />
    </>
  );
}

export default function IslandScene({
  plan,
  terrain,
  sites,
}: {
  plan: HourPlan;
  terrain: TerrainModel;
  sites: Site[];
}) {
  return (
    <Canvas camera={{ position: [10.2, 5.4, 11.2], fov: 37 }} dpr={[1, 2]}>
      <color attach="background" args={["#080b11"]} />
      <fog attach="fog" args={["#080b11", 22, 52]} />
      <Scene plan={plan} terrain={terrain} sites={sites} />
    </Canvas>
  );
}
