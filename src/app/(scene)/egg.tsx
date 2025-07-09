'use client'

import { Float } from '@react-three/drei'
import { useControls } from 'leva'

export default function Egg() {
  const { eggColor, eggEmissiveColor, emissiveIntensity } = useControls('Egg', {
    eggColor: { value: '#f8f1e4' },
    eggEmissiveColor: { value: '#ffeaa7' },
    emissiveIntensity: { value: 0.05 }
  })

  return (
    <Float rotationIntensity={0} floatIntensity={1} speed={2}>
      <mesh scale={[0.8, 1.2, 0.8]} castShadow receiveShadow>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          color={eggColor}
          roughness={0.2}
          metalness={0.1}
          emissive={eggEmissiveColor}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>
    </Float>
  )
}
