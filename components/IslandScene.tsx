"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { ISLAND_R, SITES, islandHeight, siteY } from "./terrain";
import type { HourPlan } from "@/lib/types";

function Terrain() {
  const geo = useMemo(() => {
    const seg = 190;
    const size = ISLAND_R * 2.9;
    const g = new THREE.PlaneGeometry(size, size, seg, seg);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const colors: number[] = [];
    const sand = new THREE.Color("#b9a173");
    const low = new THREE.Color("#2e5b3d");
    const high = new THREE.Color("#4a6b4a");
    const rock = new THREE.Color("#6d6559");
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = islandHeight(x, z);
      pos.setY(i, y);
      const c = new THREE.Color();
      if (y < 0.08) c.copy(sand);
      else if (y < 0.9) c.lerpColors(low, high, y / 0.9);
      else c.lerpColors(high, rock, Math.min(1, (y - 0.9) / 1.2));
      colors.push(c.r, c.g, c.b);
    }
    g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, []);

  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.95} metalness={0} flatShading />
    </mesh>
  );
}

function Ocean({ hour }: { hour: number }) {
  const night = hour < 6 || hour > 18;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]}>
      <circleGeometry args={[70, 96]} />
      <meshStandardMaterial
        color={night ? "#040810" : "#08202f"}
        roughness={0.82}
        metalness={0.05}
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
    mid.y += from.distanceTo(to) * 0.28 + 0.5;
    return new THREE.QuadraticBezierCurve3(from, mid, to);
  }, [from, to]);

  const pts = useMemo(() => curve.getPoints(40), [curve]);
  const lineGeo = useMemo(
    () => new THREE.BufferGeometry().setFromPoints(pts),
    [pts],
  );

  const count = Math.max(1, Math.min(7, Math.round(power / 90)));
  const dots = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(({ clock }) => {
    if (!dots.current) return;
    const t = clock.getElapsedTime();
    for (let i = 0; i < count; i++) {
      const p = ((t * 0.34 + i / count) % 1 + 1) % 1;
      const v = curve.getPoint(p);
      dummy.position.copy(v);
      dummy.scale.setScalar(0.075);
      dummy.updateMatrix();
      dots.current.setMatrixAt(i, dummy.matrix);
    }
    dots.current.instanceMatrix.needsUpdate = true;
  });

  const opacity = Math.min(0.5, 0.14 + power / 1600);

  return (
    <group>
      <primitive object={new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color, transparent: true, opacity }))} />
      <instancedMesh ref={dots} args={[undefined, undefined, count]} key={count}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color={color} />
      </instancedMesh>
    </group>
  );
}

function Marker({
  site,
  active,
  intensity,
}: {
  site: (typeof SITES)[number];
  active: boolean;
  intensity: number;
}) {
  const y = siteY(site);
  const h = site.kind === "source" ? 0.5 : 0.34;
  const len = Math.hypot(site.x, site.z) || 1;
  const out = { x: site.x / len, z: site.z / len };
  return (
    <group position={[site.x, y, site.z]}>
      <mesh position={[0, h / 2, 0]}>
        <cylinderGeometry args={[0.075, 0.075, h, 10]} />
        <meshStandardMaterial
          color={active ? site.color : "#2b3442"}
          emissive={active ? site.color : "#000000"}
          emissiveIntensity={active ? 0.5 + intensity : 0}
        />
      </mesh>
      <mesh position={[0, h + 0.11, 0]}>
        <sphereGeometry args={[0.13, 14, 14]} />
        <meshStandardMaterial
          color={active ? site.color : "#39434f"}
          emissive={active ? site.color : "#000000"}
          emissiveIntensity={active ? 1.1 + intensity * 1.6 : 0}
        />
      </mesh>
      {active && (
        <Html
          center
          distanceFactor={10}
          position={[out.x * 1.15, h + 0.55, out.z * 1.15]}
          zIndexRange={[10, 0]}
        >
          <div
            style={{
              fontSize: 12,
              lineHeight: 1.1,
              letterSpacing: 0.2,
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

function Scene({ plan }: { plan: HourPlan }) {
  const hour = plan.hour;
  const sunAngle = ((hour - 6) / 12) * Math.PI;
  const day = hour >= 6 && hour <= 18;
  const sunY = Math.sin(sunAngle) * 9;
  const sunX = Math.cos(sunAngle) * 11;

  const hub = useMemo(() => new THREE.Vector3(0, islandHeight(0.6, -0.4) + 1.5, 0), []);

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
        position={[sunX, Math.max(sunY, 0.6), 4]}
        intensity={day ? 1.5 : 0.15}
        color={day ? "#fff3e0" : "#4a6ea8"}
      />
      <hemisphereLight args={["#5f7fa8", "#101418", day ? 0.5 : 0.25]} />

      <Terrain />
      <Ocean hour={hour} />

      {SITES.map((s) => {
        const isSource = s.kind === "source";
        const p = isSource ? sourcePower[s.id] ?? 0 : 0;
        const active = isSource
          ? p > 1
          : plan.servedLoadIds.includes(s.id);
        return (
          <Marker
            key={s.id}
            site={s}
            active={active}
            intensity={isSource ? Math.min(1, p / 900) : 0.25}
          />
        );
      })}

      {SITES.filter((s) => s.kind === "source").map((s) => {
        const p = sourcePower[s.id] ?? 0;
        if (p <= 1) return null;
        return (
          <Flow
            key={s.id}
            from={new THREE.Vector3(s.x, siteY(s) + 0.6, s.z)}
            to={hub}
            power={p}
            color={s.color}
          />
        );
      })}

      {SITES.filter((s) => s.kind === "load").map((s) => {
        if (!plan.servedLoadIds.includes(s.id)) return null;
        return (
          <Flow
            key={s.id}
            from={hub}
            to={new THREE.Vector3(s.x, siteY(s) + 0.45, s.z)}
            power={260}
            color={s.id === "desal" ? "#4aa3d4" : "#93a3b8"}
          />
        );
      })}

      <OrbitControls
        enablePan={false}
        minDistance={9}
        maxDistance={26}
        maxPolarAngle={Math.PI / 2.06}
        minPolarAngle={Math.PI / 5}
        autoRotate
        autoRotateSpeed={0.22}
      />
    </>
  );
}

export default function IslandScene({ plan }: { plan: HourPlan }) {
  return (
    <Canvas camera={{ position: [10.2, 5.2, 11.2], fov: 37 }} dpr={[1, 2]}>
      <color attach="background" args={["#080b11"]} />
      <fog attach="fog" args={["#05070a", 22, 50]} />
      <Scene plan={plan} />
    </Canvas>
  );
}
