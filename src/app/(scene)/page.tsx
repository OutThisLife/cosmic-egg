'use client'

import {
  ContactShadows,
  Environment,
  OrbitControls,
  SoftShadows
} from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useControls } from 'leva'
import { Suspense } from 'react'
import * as THREE from 'three'

import Egg from './egg'

function Env() {
  const {
    ambientColor,
    ambientIntensity,
    backgroundBlur,
    fogColor,
    lightAngle,
    lightColor,
    lightIntensity,
    lightPosition,
    shadowBias,
    shadowBlur,
    shadowColor,
    shadowOpacity,
    shadowScale
  } = useControls('Lighting', {
    ambientColor: { value: '#ffffff' },
    ambientIntensity: { max: 2, min: 0, value: 0.2 },
    backgroundBlur: { max: 1, min: 0, value: 0.8 },

    fogColor: { value: '#000000' },

    lightAngle: { max: 1, min: 0.1, value: 0.3 },
    lightColor: { value: '#ffffff' },
    lightIntensity: { max: 5, min: 0, value: 2 },
    lightPosition: { step: 0.1, value: [0, 5, 0] },
    shadowBias: { max: 0.001, min: -0.001, value: -0.0001 },

    shadowBlur: { max: 10, min: 0, value: 2 },
    shadowColor: { value: '#000000' },
    shadowOpacity: { max: 1, min: 0, value: 0.6 },
    shadowScale: { max: 50, min: 1, value: 20 }
  })

  return (
    <>
      <fogExp2 attach="fog" args={[new THREE.Color(fogColor), 0.03]} />
      <SoftShadows samples={17} focus={0.5} size={25} />

      <ambientLight intensity={ambientIntensity} color={ambientColor} />

      <spotLight
        position={lightPosition}
        distance={15}
        angle={lightAngle}
        penumbra={1}
        intensity={lightIntensity}
        color={lightColor}
        castShadow
        shadow-bias={shadowBias}
        shadow-mapSize={[2048, 2048]}
      />

      <ContactShadows
        position={[0, -2, 0]}
        opacity={shadowOpacity}
        scale={shadowScale}
        blur={shadowBlur}
        far={10}
        resolution={256}
        color={shadowColor}
      />

      <Environment
        preset="dawn"
        background
        backgroundBlurriness={backgroundBlur}
        backgroundIntensity={0.5}
        environmentIntensity={0.3}
        backgroundRotation={[0, Math.PI, 0]}
      />

      <OrbitControls
        enablePan={false}
        minDistance={3}
        maxDistance={12}
        maxPolarAngle={Math.PI / 2}
        minPolarAngle={Math.PI / 3}
        maxAzimuthAngle={Math.PI / 1.5}
        minAzimuthAngle={Math.PI / 5}
        enableDamping
      />
    </>
  )
}

export default function Home() {
  return (
    <main className="h-screen w-full">
      <Canvas camera={{ fov: 75, position: [0, 0, 5] }} shadows>
        <Suspense fallback={null}>
          <Egg />
          <Env />
        </Suspense>
      </Canvas>
    </main>
  )
}
