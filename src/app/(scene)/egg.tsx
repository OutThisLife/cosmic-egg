'use client'

import { Float } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useControls } from 'leva'
import { useRef } from 'react'
import * as THREE from 'three'
import CustomShaderMaterial from 'three-custom-shader-material'

const vertexShader = /*glsl*/ `
varying vec3 csm_vWorldPosition;
varying vec3 csm_vNormal;
varying vec3 csm_vViewDirection;

void main() {
    csm_vNormal = normal;
    csm_vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    csm_vViewDirection = normalize(cameraPosition - csm_vWorldPosition);
}
`

const fragmentShader = /*glsl*/ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uRoughness;
  
  varying vec3 csm_vNormal;
  varying vec3 csm_vViewDirection;
  
  float fresnel(vec3 viewDir, vec3 surfaceNormal) {
    return pow(1.0 - max(0.0, dot(viewDir, surfaceNormal)), 3.0);
  }
  
  void main() {
    vec3 surfaceNormal = normalize(csm_vNormal);
    vec3 viewDir = normalize(csm_vViewDirection);
    
    float fresnelValue = fresnel(viewDir, surfaceNormal);
    
    vec3 glassColor = uColor;
    
    float alpha = mix(uOpacity * 0.1, uOpacity, fresnelValue);
    
    csm_DiffuseColor = vec4(glassColor, alpha);
    csm_Roughness = uRoughness;
  }
`

export default function Egg() {
  const { color, opacity, roughness } = useControls('Glass Egg', {
    color: { value: '#ffffff' },
    opacity: { value: 0.4, min: 0.1, max: 1.0, step: 0.01 },
    roughness: { value: 0.0, min: 0.0, max: 1.0, step: 0.01 }
  })

  return (
    <Float rotationIntensity={0.2} floatIntensity={1.5} speed={1.5}>
      <mesh scale={[0.8, 1.2, 0.8]} castShadow receiveShadow>
        <sphereGeometry args={[1, 128, 128]} />

        <CustomShaderMaterial
          key={fragmentShader + vertexShader}
          baseMaterial={THREE.MeshStandardMaterial}
          transparent
          uniforms={{
            uColor: { value: new THREE.Color(color) },
            uOpacity: { value: opacity },
            uRoughness: { value: roughness }
          }}
          {...{ fragmentShader, vertexShader }}
        />
      </mesh>
    </Float>
  )
}
