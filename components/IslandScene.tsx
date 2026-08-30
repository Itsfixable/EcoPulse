"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { HALF, siteY, type Site, type TerrainModel } from "./terrain";
import { loadKw } from "@/lib/dispatch";
import type { HourPlan, IslandConfig } from "@/lib/types";

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
  const mesh = useRef<THREE.Mesh>(null);

  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(150, 150, 110, 110);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  // Layered sine waves, largest first, so the surface moves without a shader.
  const base = useMemo(() => {
    const pos = (geo.attributes.position as THREE.BufferAttribute).array;
    return Float32Array.from(pos);
  }, [geo]);

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const t = clock.getElapsedTime();
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      const z = base[i * 3 + 2];
      const y =
        Math.sin(x * 0.16 + t * 0.55) * 0.11 +
        Math.sin(z * 0.21 - t * 0.42) * 0.09 +
        Math.sin((x + z) * 0.34 + t * 0.9) * 0.045;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  });

  return (
    <group>
      <mesh ref={mesh} geometry={geo} position={[0, -0.06, 0]}>
        <meshStandardMaterial
          color={night ? "#08152b" : "#10496e"}
          roughness={night ? 0.5 : 0.28}
          metalness={0.42}
          transparent
          opacity={0.97}
        />
      </mesh>

      {/* Pale shallows hugging the shoreline. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <ringGeometry args={[5.6, 9.2, 96]} />
        <meshBasicMaterial
          color={night ? "#12406a" : "#3f9fc4"}
          transparent
          opacity={night ? 0.18 : 0.3}
          depthWrite={false}
        />
      </mesh>

      {/* Surf line right at the sand. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <ringGeometry args={[5.35, 6.1, 96]} />
        <meshBasicMaterial
          color="#cfeaf5"
          transparent
          opacity={night ? 0.12 : 0.26}
          depthWrite={false}
        />
      </mesh>
    </group>
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
  detail,
}: {
  site: Site;
  y: number;
  active: boolean;
  intensity: number;
  detail: string[];
}) {
  const [hovered, setHovered] = useState(false);
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

      {/* Generous invisible hit area, so a 0.12 sphere is still easy to hover. */}
      <mesh
        position={[0, h + 0.1, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "";
        }}
      >
        <sphereGeometry args={[0.42, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <mesh position={[0, h + 0.1, 0]}>
        <sphereGeometry args={[hovered ? 0.17 : 0.12, 16, 16]} />
        <meshStandardMaterial
          color={active ? site.color : "#39434f"}
          emissive={active ? site.color : "#5a6577"}
          emissiveIntensity={active ? 1.1 + intensity * 1.6 : 0.35}
        />
      </mesh>

      {hovered && (
        <Html
          center
          distanceFactor={9}
          position={[out.x * 0.5, h + 0.72, out.z * 0.5]}
          zIndexRange={[60, 0]}
        >
          <div className="scene-tip">
            <span className="scene-tip-name">
              <span className="scene-tip-dot" style={{ background: site.color }} />
              {site.label}
            </span>
            {detail.map((d) => (
              <span key={d} className="scene-tip-row">
                {d}
              </span>
            ))}
          </div>
        </Html>
      )}
    </group>
  );
}

/** Sun and moon ride the same arc, half a day apart, so the hour reads at a glance. */
function Celestial({ hour }: { hour: number }) {
  const sunAngle = ((hour - 6) / 12) * Math.PI;
  const moonAngle = sunAngle + Math.PI;

  // Far enough that it reads as sky rather than a nearby sphere, and low
  // enough that the whole arc stays inside the frame.
  const R = 26;
  const H = 9;
  const place = (a: number): [number, number, number] => [
    Math.cos(a) * R,
    Math.sin(a) * H + 1.8,
    -3,
  ];

  const sunPos = place(sunAngle);
  const moonPos = place(moonAngle);
  const altitude = Math.max(0, Math.sin(sunAngle));

  const sunColor = new THREE.Color().lerpColors(
    new THREE.Color("#ff8a4c"),
    new THREE.Color("#fff2cf"),
    Math.min(1, altitude * 1.6),
  );

  return (
    <>
      {sunPos[1] > 0 && (
        <group position={sunPos}>
          <mesh>
            <sphereGeometry args={[0.62, 28, 28]} />
            <meshBasicMaterial color={sunColor} toneMapped={false} fog={false} />
          </mesh>
          <mesh>
            <sphereGeometry args={[1.05, 24, 24]} />
            <meshBasicMaterial
              color={sunColor}
              transparent
              opacity={0.18}
              depthWrite={false}
              toneMapped={false}
              fog={false}
            />
          </mesh>
          <pointLight color={sunColor} intensity={11} distance={52} decay={2} />
        </group>
      )}

      {moonPos[1] > 0 && (
        <group position={moonPos}>
          <mesh>
            <sphereGeometry args={[0.44, 26, 26]} />
            <meshBasicMaterial color="#e3e9f7" toneMapped={false} fog={false} />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.8, 22, 22]} />
            <meshBasicMaterial
              color="#9fb4dd"
              transparent
              opacity={0.16}
              depthWrite={false}
              toneMapped={false}
              fog={false}
            />
          </mesh>
          <pointLight color="#9fb4dd" intensity={4} distance={42} decay={2} />
        </group>
      )}
    </>
  );
}

/** A scatter of stars, faded in as the sun drops. */
function Stars({ visible }: { visible: number }) {
  const positions = useMemo(() => {
    const pts: number[] = [];
    let seed = 7;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 240; i++) {
      const theta = rand() * Math.PI * 2;
      const phi = rand() * Math.PI * 0.4;
      const r = 44;
      pts.push(
        Math.cos(theta) * Math.sin(phi + 0.1) * r,
        Math.cos(phi) * r * 0.7 + 4,
        Math.sin(theta) * Math.sin(phi + 0.1) * r,
      );
    }
    return new Float32Array(pts);
  }, []);

  if (visible <= 0.01) return null;

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.3}
        color="#dce6ff"
        transparent
        opacity={visible * 0.9}
        sizeAttenuation
        depthWrite={false}
        fog={false}
      />
    </points>
  );
}

function Scene({
  plan,
  terrain,
  sites,
  island,
}: {
  plan: HourPlan;
  terrain: TerrainModel;
  sites: Site[];
  island: IslandConfig;
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

      <Celestial hour={hour} />
      <Stars visible={Math.max(0, 1 - Math.max(0, Math.sin(angle)) * 2.4)} />

      <Terrain t={terrain} />
      <Ocean night={!day} />

      {sites.map((s) => {
        const isSource = s.kind === "source";
        const p = sourcePower[s.id] ?? 0;
        const load = island.loads.find((l) => l.id === s.id);
        const served = plan.servedLoadIds.includes(s.id);

        const detail = isSource
          ? [
              p > 1 ? `${Math.round(p)} kW right now` : "Idle right now",
              s.id === "battery"
                ? `Charge ${Math.round(plan.batterySoc * 100)}%`
                : s.id === "generator"
                  ? `${Math.round(plan.fuelRemainingL)} L fuel left`
                  : "Renewable source",
            ]
          : [
              load ? `${Math.round(loadKw(load, plan.hour))} kW draw` : "",
              load ? `Priority tier ${load.tier}` : "",
              served ? "Powered" : "Paused to save fuel",
            ].filter(Boolean);

        return (
          <Marker
            key={s.id}
            site={s}
            y={siteY(terrain, s)}
            active={isSource ? p > 1 : served}
            intensity={isSource ? Math.min(1, p / 900) : 0.25}
            detail={detail}
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
        target={[0, 1.05, 0]}
        enablePan={false}
        minDistance={8}
        maxDistance={26}
        minPolarAngle={Math.PI / 5}
        maxPolarAngle={Math.PI / 2.06}
        autoRotate
        autoRotateSpeed={0.16}
      />
    </>
  );
}

export default function IslandScene({
  plan,
  terrain,
  sites,
  island,
}: {
  plan: HourPlan;
  terrain: TerrainModel;
  sites: Site[];
  island: IslandConfig;
}) {
  return (
    <Canvas camera={{ position: [10.2, 5.4, 11.2], fov: 37 }} dpr={[1, 2]}>
      <color attach="background" args={["#080b11"]} />
      <fog attach="fog" args={["#080b11", 22, 52]} />
      <Scene plan={plan} terrain={terrain} sites={sites} island={island} />
    </Canvas>
  );
}
