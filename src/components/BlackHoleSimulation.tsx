

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { canvasVertexShader } from '../shaders/canvasVertexShader';
import { canvasFragmentShader } from '../shaders/canvasFragmentShader';

// Define the properties we expect from the UI
interface SimulationProps {
  cameraY: number;
  speed: number;
  showDisk: boolean;
  showCalibration: boolean; 
}

const BlackHoleSimulation: React.FC<SimulationProps> = ({ cameraY, speed, showDisk, showCalibration }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const uniformsRef = useRef({
    uShowCalibration: { value: showCalibration ? 1 : 0 }, // NEW: Add showCalibration to uniforms
    uResolution: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0.0 },
    uCameraY: { value: cameraY },
    uSpeed: { value: speed },
    uShowDisk: { value: showDisk ? 1 : 0 },
    uBackgroundTexture: { value: null as THREE.Texture | null }, // NEW
    uCameraPos: { value: new THREE.Vector3(0, 0, 0) } // NEW: 3D camera position
  });

  useEffect(() => {
    uniformsRef.current.uCameraY.value = cameraY;
    uniformsRef.current.uSpeed.value = speed;
    uniformsRef.current.uShowDisk.value = showDisk ? 1 : 0;
    uniformsRef.current.uShowCalibration.value = showCalibration ? 1 : 0; // NEW
  }, [cameraY, speed, showDisk]);

  useEffect(() => {
    if (!containerRef.current) return;
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('/galaxy.jpg', (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace; 
      texture.wrapS = THREE.RepeatWrapping; 
      texture.wrapT = THREE.RepeatWrapping;
      uniformsRef.current.uBackgroundTexture.value = texture;
    });

    // Scene, Camera, and Renderer
    const container = containerRef.current;
    const scene = new THREE.Scene();
    
    // We use an Orthographic camera because we are just doing 2D math on a flat screen right now
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Shader Material
    // Initialize the resolution inside our ref now that the container exists
    uniformsRef.current.uResolution.value.set(container.clientWidth, container.clientHeight);

    const material = new THREE.ShaderMaterial({
      vertexShader: canvasVertexShader,
      fragmentShader: canvasFragmentShader,
      uniforms: uniformsRef.current, 
    });

    // plane to draw the shader on
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // 4. Handle Window Resizing
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      rendererRef.current.setSize(width, height);
      uniformsRef.current.uResolution.value.set(width, height); 
      rendererRef.current.render(scene, camera);
    };
    window.addEventListener('resize', handleResize);

    // Initial Render
    renderer.render(scene, camera);
    let animationFrameId: number;
    const clock = new THREE.Clock();
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();
      
      // Orbital position
      // We use the 'speed' prop to control how fast the camera orbits
      const orbitSpeed = time * speed * 0.5; 
      const radius = 6.0;
      const camX = Math.sin(orbitSpeed) * radius;
      const camZ = Math.cos(orbitSpeed) * radius;

      uniformsRef.current.uTime.value = time;
      uniformsRef.current.uCameraPos.value.set(camX, cameraY, camZ);
      
      rendererRef.current?.render(scene, camera);
    };
    animate();
 
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId); //new
      if (rendererRef.current && container.contains(rendererRef.current.domElement)) {
        container.removeChild(rendererRef.current.domElement);
      }
      rendererRef.current?.dispose();
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      style={{ width: '100vw', height: '100vh', overflow: 'hidden', margin: 0, padding: 0 }} 
    />
  );
};

export default BlackHoleSimulation;