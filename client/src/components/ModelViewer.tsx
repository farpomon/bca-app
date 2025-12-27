import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid, Environment, PerspectiveCamera, useGLTF, Html, Center, useProgress } from "@react-three/drei";
import { Suspense, useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Maximize2, Minimize2, Home, RotateCcw, Grid3X3, Eye, EyeOff } from "lucide-react";
import * as THREE from "three";

interface ModelViewerProps {
  modelUrl: string;
  annotations?: Array<{
    id: number;
    title: string;
    position: { x: number; y: number; z: number };
    type: string;
  }>;
  onAnnotationClick?: (annotationId: number) => void;
  height?: string;
}

// Loading progress component
function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2 bg-card/90 backdrop-blur-sm p-4 rounded-lg border">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading model... {progress.toFixed(0)}%</p>
      </div>
    </Html>
  );
}

// Error fallback component
function ErrorFallback({ error }: { error: string }) {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2 bg-destructive/10 backdrop-blur-sm p-4 rounded-lg border border-destructive">
        <p className="text-sm text-destructive font-medium">Failed to load model</p>
        <p className="text-xs text-muted-foreground">{error}</p>
      </div>
    </Html>
  );
}

// The actual 3D model component that loads GLB/GLTF files
function Model({ url, onLoad }: { url: string; onLoad?: () => void }) {
  const { scene } = useGLTF(url);
  const modelRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (scene) {
      // Center and scale the model
      const box = new THREE.Box3().setFromObject(scene);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      
      // Scale to fit within a reasonable size
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = maxDim > 10 ? 10 / maxDim : 1;
      
      scene.scale.setScalar(scale);
      scene.position.sub(center.multiplyScalar(scale));
      
      // Enable shadows on all meshes
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      
      onLoad?.();
    }
  }, [scene, onLoad]);

  return <primitive ref={modelRef} object={scene} />;
}

// Placeholder box when no model is loaded
function PlaceholderModel() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.2;
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="#3b82f6" wireframe />
    </mesh>
  );
}

// Camera controller for reset functionality
function CameraController({ 
  controlsRef, 
  resetTrigger 
}: { 
  controlsRef: React.RefObject<any>;
  resetTrigger: number;
}) {
  const { camera } = useThree();
  
  useEffect(() => {
    if (resetTrigger > 0 && controlsRef.current) {
      camera.position.set(5, 5, 5);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, [resetTrigger, camera, controlsRef]);

  return null;
}

// Annotation marker component
function AnnotationMarker({ 
  annotation, 
  onClick 
}: { 
  annotation: { id: number; title: string; position: { x: number; y: number; z: number }; type: string };
  onClick?: (id: number) => void;
}) {
  const [hovered, setHovered] = useState(false);
  
  const getColor = () => {
    switch (annotation.type) {
      case 'deficiency': return '#ef4444';
      case 'assessment': return '#3b82f6';
      case 'maintenance': return '#f59e0b';
      case 'issue': return '#dc2626';
      default: return '#6b7280';
    }
  };

  return (
    <group position={[annotation.position.x, annotation.position.y, annotation.position.z]}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(annotation.id);
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial color={getColor()} transparent opacity={hovered ? 1 : 0.8} />
      </mesh>
      {hovered && (
        <Html distanceFactor={10}>
          <div className="bg-card/95 backdrop-blur-sm border rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
            <p className="text-sm font-medium">{annotation.title}</p>
            <p className="text-xs text-muted-foreground capitalize">{annotation.type}</p>
          </div>
        </Html>
      )}
    </group>
  );
}

export function ModelViewer({ modelUrl, annotations = [], onAnnotationClick, height = "600px" }: ModelViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const controlsRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  const handleResetCamera = useCallback(() => {
    setResetTrigger((prev) => prev + 1);
  }, []);

  const handleModelLoad = useCallback(() => {
    setModelLoaded(true);
    setLoadError(null);
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Determine if we have a valid model URL
  const hasValidModel = modelUrl && modelUrl.length > 0 && !modelUrl.includes('placeholder');

  return (
    <div
      ref={containerRef}
      className={`relative bg-muted/30 rounded-lg overflow-hidden ${
        isFullscreen ? "fixed inset-0 z-50" : ""
      }`}
      style={{ height: isFullscreen ? '100vh' : height }}
    >
      {/* Controls Overlay */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <Button
          size="icon"
          variant="secondary"
          onClick={handleFullscreen}
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
        <Button
          size="icon"
          variant="secondary"
          onClick={handleResetCamera}
          title="Reset Camera"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          onClick={() => setShowGrid(!showGrid)}
          title={showGrid ? "Hide Grid" : "Show Grid"}
        >
          <Grid3X3 className={`h-4 w-4 ${showGrid ? '' : 'opacity-50'}`} />
        </Button>
        {annotations.length > 0 && (
          <Button
            size="icon"
            variant="secondary"
            onClick={() => setShowAnnotations(!showAnnotations)}
            title={showAnnotations ? "Hide Annotations" : "Show Annotations"}
          >
            {showAnnotations ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {/* Info Overlay */}
      <div className="absolute bottom-4 left-4 z-10 bg-card/90 backdrop-blur-sm border rounded-lg p-3 text-sm max-w-[200px]">
        <div className="space-y-1">
          <div className="font-medium">Controls</div>
          <div className="text-xs text-muted-foreground space-y-0.5">
            <div>Left click + drag: Rotate</div>
            <div>Right click + drag: Pan</div>
            <div>Scroll: Zoom</div>
            {annotations.length > 0 && <div>Click markers: View details</div>}
          </div>
        </div>
      </div>

      {/* Model info */}
      {hasValidModel && modelLoaded && (
        <div className="absolute top-4 left-4 z-10 bg-card/90 backdrop-blur-sm border rounded-lg px-3 py-2">
          <p className="text-xs text-muted-foreground">Model loaded successfully</p>
        </div>
      )}

      {/* 3D Canvas */}
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[5, 5, 5]} fov={50} />
        
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={50}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        <directionalLight position={[-5, 5, -5]} intensity={0.3} />
        
        {/* Environment */}
        <Environment preset="city" />
        
        {/* Grid */}
        {showGrid && (
          <Grid 
            infiniteGrid 
            fadeDistance={30} 
            fadeStrength={5}
            cellSize={1}
            cellThickness={0.5}
            cellColor="#6b7280"
            sectionSize={5}
            sectionThickness={1}
            sectionColor="#374151"
          />
        )}
        
        {/* Model */}
        <Suspense fallback={<Loader />}>
          <Center>
            {hasValidModel ? (
              <Model url={modelUrl} onLoad={handleModelLoad} />
            ) : (
              <PlaceholderModel />
            )}
          </Center>
        </Suspense>
        
        {/* Annotations */}
        {showAnnotations && annotations.map((annotation) => (
          <AnnotationMarker
            key={annotation.id}
            annotation={annotation}
            onClick={onAnnotationClick}
          />
        ))}
        
        {/* Controls */}
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.05}
          minDistance={1}
          maxDistance={100}
          maxPolarAngle={Math.PI * 0.9}
          enablePan
          panSpeed={0.5}
          rotateSpeed={0.5}
          zoomSpeed={0.8}
        />
        
        {/* Camera controller for reset */}
        <CameraController controlsRef={controlsRef} resetTrigger={resetTrigger} />
      </Canvas>

      {/* No model placeholder overlay */}
      {!hasValidModel && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center bg-card/80 backdrop-blur-sm rounded-lg p-6 border">
            <p className="text-sm text-muted-foreground">
              No 3D model uploaded yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Upload a GLB, GLTF, SketchUp, Revit, or DWG/DXF file to view your building model
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Preload hook for better performance
useGLTF.preload;
