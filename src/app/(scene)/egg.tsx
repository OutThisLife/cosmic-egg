'use client'

import { Float } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useControls } from 'leva'
import { useRef } from 'react'
import * as THREE from 'three'
import CustomShaderMaterial from 'three-custom-shader-material'

const vertexShader = /*glsl*/ `
uniform float uTime;
uniform float uDistortionAmount;
uniform float uDistortionFrequency;

varying vec3 vWorldPosition;
varying vec3 vViewDirection;
varying float vDisplacement;
varying vec3 vLightningDir;
varying vec3 vReflect;
varying vec3 vRefract;
varying float vFresnel;
varying vec3 vLocalPosition;

vec3 hash3(vec3 p) {
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)),
             dot(p, vec3(269.5, 183.3, 246.1)),
             dot(p, vec3(113.5, 271.9, 124.6)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

mat3 rotation3d(vec3 axis, float angle) {
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    
    return mat3(
        oc * axis.x * axis.x + c, oc * axis.x * axis.y - axis.z * s, oc * axis.z * axis.x + axis.y * s,
        oc * axis.x * axis.y + axis.z * s, oc * axis.y * axis.y + c, oc * axis.y * axis.z - axis.x * s,
        oc * axis.z * axis.x - axis.y * s, oc * axis.y * axis.z + axis.x * s, oc * axis.z * axis.z + c
    );
}

float voronoi(vec3 p) {
    vec3 pi = floor(p);
    vec3 pf = fract(p);
    
    float d = 1.0;
    vec3 closestPoint = vec3(0.0);
    
    for (int z = -1; z <= 1; z++) {
        for (int y = -1; y <= 1; y++) {
            for (int x = -1; x <= 1; x++) {
                vec3 offset = vec3(float(x), float(y), float(z));
                vec3 h = hash3(pi + offset) * 0.5 + 0.5;
                h += offset;
                vec3 d2 = pf - h;
                float dist = dot(d2, d2);
                if (dist < d) {
                    d = dist;
                    closestPoint = h;
                }
            }
        }
    }
    
    return 1.0 - smoothstep(0.0, 1.414, sqrt(d));
}

float lightning(vec3 p, float time) {
    // Rotate space for swirling effect
    mat3 rot1 = rotation3d(vec3(0.7, 0.3, 0.5), time * 0.3);
    mat3 rot2 = rotation3d(vec3(0.2, 0.8, 0.4), time * 0.7);
    
    vec3 p1 = rot1 * p;
    vec3 p2 = rot2 * p;
    
    // Multiple lightning layers with different frequencies and movement
    float bolt1 = voronoi(p1 * uDistortionFrequency + vec3(sin(time * 2.1), cos(time * 1.7), sin(time * 3.3)));
    float bolt2 = voronoi(p2 * uDistortionFrequency * 1.7 + vec3(cos(time * 1.5), sin(time * 2.8), cos(time * 1.2)));
    float bolt3 = voronoi(p * uDistortionFrequency * 0.5 + vec3(sin(time * 3.7), sin(time * 1.3), cos(time * 2.4)));
    
    // Branching pattern
    float branches = pow(bolt1, 2.0) * bolt2;
    
    // Temporal flickering
    float flicker = sin(time * 30.0 + p.x * 10.0) * 0.5 + 0.5;
    flicker *= sin(time * 47.0 + p.y * 15.0) * 0.5 + 0.5;
    
    // Combine with chaotic pulsing
    float pulse = sin(time * 5.0 + bolt3 * 20.0) * 0.3 + 0.7;
    
    return (branches + bolt3 * 0.3) * flicker * pulse;
}

void main() {
    vec3 pos = position;
    vLocalPosition = pos; // Pass local position to fragment shader
    
    // Calculate lightning with spatial variation
    float distortion = lightning(pos, uTime) * uDistortionAmount;
    
    // Add secondary displacement for more chaos
    vec3 noiseDir = hash3(pos * 5.0 + uTime);
    distortion += length(noiseDir) * 0.1 * sin(uTime * 10.0 + dot(pos, noiseDir) * 20.0) * uDistortionAmount * 0.3;
    
    vDisplacement = distortion;
    vLightningDir = normalize(noiseDir + normal * 0.5);
    
    pos += normal * distortion * 0.1;
    pos += noiseDir * distortion * 0.02;
    
    // Pass world space data to fragment shader
    vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
    vViewDirection = normalize(cameraPosition - vWorldPosition);
    
    // Calculate glass vectors
    vec3 worldNormal = normalize(mat3(modelMatrix) * normal);
    vec3 viewDir = normalize(vWorldPosition - cameraPosition);
    vReflect = reflect(viewDir, worldNormal);
    vRefract = refract(viewDir, worldNormal, 0.66); // Glass IOR ~1.5, so 1/1.5 = 0.66
    vFresnel = pow(1.0 - max(0.0, dot(-viewDir, worldNormal)), 2.0);
    
    csm_Position = pos;
}
`

const fragmentShader = /*glsl*/ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uRoughness;
  uniform float uTime;
  uniform float uLightningIntensity;
  uniform float uInternalIntensity;
  uniform vec3 uInternalColor;
  
  varying vec3 vWorldPosition;
  varying vec3 vViewDirection;
  varying float vDisplacement;
  varying vec3 vLightningDir;
  varying vec3 vReflect;
  varying vec3 vRefract;
  varying float vFresnel;
  varying vec3 vLocalPosition;
  
  float random(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
  }
  
  vec3 dither(vec3 color, vec2 uv, float time) {
    float noise = random(uv + time * 0.1) - 0.5;
    return color + noise * 0.02;
  }
  
  vec3 lightningColor(float intensity, float time) {
    // Electric blue to purple gradient with temporal variation
    vec3 col1 = vec3(0.2, 0.6, 1.0);
    vec3 col2 = vec3(0.8, 0.4, 1.0);
    vec3 col3 = vec3(1.0, 0.9, 0.7);
    
    float t = sin(time * 13.7 + intensity * 10.0) * 0.5 + 0.5;
    vec3 baseColor = mix(col1, col2, t);
    
    // Add white hot cores
    return mix(baseColor, col3, pow(intensity, 3.0));
  }
  
  // Simple environment map simulation
  vec3 getEnvironment(vec3 dir) {
    float y = dir.y * 0.5 + 0.5;
    vec3 skyColor = vec3(0.6, 0.7, 0.9);
    vec3 groundColor = vec3(0.2, 0.2, 0.25);
    return mix(groundColor, skyColor, pow(y, 0.5));
  }
  
  float internalOrb(vec3 pos, float time) {
    // Simple circle based on XY distance from center
    float dist = length(pos.xy);
    
    // Obvious circle
    float circle = 1.0 - smoothstep(0.0, 0.5, dist);
    
    // Pulsing
    float pulse = sin(time * 2.0) * 0.3 + 0.7;
    
    return circle * pulse;
  }
  
  void main() {
    vec3 surfaceNormal = normalize(vNormal);
    vec3 viewDir = normalize(vViewDirection);
    
    // Internal orb calculation using local position from vertex shader
    float orbStrength = internalOrb(vLocalPosition, uTime);
    orbStrength = orbStrength * uInternalIntensity;
    
    // Create directional lightning effect
    float directionIntensity = max(0.0, dot(vLightningDir, viewDir));
    float lightningStrength = vDisplacement * uLightningIntensity * (1.0 + directionIntensity * 0.5);
    
    // Glass base color with subtle tint
    vec3 glassColor = uColor * vec3(0.95, 0.97, 1.0);
    
    // Environment reflections
    vec3 reflectColor = getEnvironment(vReflect);
    
    // Chromatic aberration for refraction
    vec3 refractR = refract(-viewDir, surfaceNormal, 0.65);
    vec3 refractG = refract(-viewDir, surfaceNormal, 0.66);
    vec3 refractB = refract(-viewDir, surfaceNormal, 0.67);
    
    vec3 refractColor = vec3(
      getEnvironment(refractR).r,
      getEnvironment(refractG).g,
      getEnvironment(refractB).b
    );
    
    // Mix reflection and refraction based on fresnel
    vec3 glassEffect = mix(refractColor * glassColor, reflectColor, vFresnel);
    
    // Surface lightning
    vec3 lColor = lightningColor(lightningStrength, uTime);
    vec3 finalColor = mix(glassEffect, lColor, lightningStrength);
    
    // Internal reflections and caustics
    float internalReflection = pow(vFresnel, 3.0) * 0.5;
    finalColor += vec3(1.0) * internalReflection * (1.0 - lightningStrength);
    
    finalColor = dither(finalColor, gl_FragCoord.xy, uTime);
    
    // Glass-like alpha with fresnel
    float alpha = mix(uOpacity * 0.05, uOpacity * 0.8, vFresnel);
    alpha = mix(alpha, 1.0, lightningStrength * 0.7);
    
    // Internal orb as pure emissive glow
    vec3 internalOrbColor = mix(uInternalColor, vec3(1.0), orbStrength);
    
    csm_DiffuseColor = vec4(finalColor, alpha);
    csm_Roughness = mix(uRoughness * 0.1, uRoughness, lightningStrength);
    csm_Metalness = mix(0.0, 0.5, lightningStrength);
    csm_Emissive = lColor * lightningStrength * 3.0 + internalOrbColor * orbStrength * 20.0;
  }
`

export default function Egg() {
  const materialRef = useRef<any>(null)

  const {
    color,
    opacity,
    roughness,
    distortionAmount,
    distortionFrequency,
    lightningIntensity,
    speed,
    orbIntensity,
    orbColor
  } = useControls('Glass Egg', {
    color: { value: '#ffffff' },
    opacity: { value: 0.3, min: 0.1, max: 1.0, step: 0.01 },
    roughness: { value: 0.1, min: 0.0, max: 1.0, step: 0.01 },
    distortionAmount: { value: 1.25, min: 0.0, max: 2.0, step: 0.01 },
    distortionFrequency: { value: 5.2, min: 0.1, max: 10.0, step: 0.1 },
    lightningIntensity: { value: 0.43, min: 0.0, max: 1.0, step: 0.01 },
    speed: { value: 0.14, min: 0.0, max: 2.0, step: 0.01 },
    orbIntensity: { value: 1.5, min: 0.0, max: 3.0, step: 0.01 },
    orbColor: { value: '#4080ff' }
  })

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime() * speed
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = time
    }
  })

  return (
    <Float rotationIntensity={0.2} floatIntensity={1.5} speed={1.5}>
      <mesh scale={[0.8, 1.2, 0.8]} castShadow receiveShadow>
        <sphereGeometry args={[1, 128, 128]} />

        <CustomShaderMaterial
          ref={materialRef}
          key={fragmentShader + vertexShader}
          baseMaterial={THREE.MeshStandardMaterial}
          transparent
          uniforms={{
            uColor: { value: new THREE.Color(color) },
            uOpacity: { value: opacity },
            uRoughness: { value: roughness },
            uTime: { value: 0 },
            uDistortionAmount: { value: distortionAmount },
            uDistortionFrequency: { value: distortionFrequency },
            uLightningIntensity: { value: lightningIntensity },
            uInternalIntensity: { value: orbIntensity },
            uInternalColor: { value: new THREE.Color(orbColor) }
          }}
          {...{ fragmentShader, vertexShader }}
        />
      </mesh>
    </Float>
  )
}
