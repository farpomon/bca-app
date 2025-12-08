import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Environment, PerspectiveCamera } from "@react-three/drei";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Maximize2, Minimize2, Home, ZoomIn, ZoomOut } from "lucide-react";

interface ModelViewerProps {
  modelUrl: string;
  annotations?: Array<{
    id: number;
    title: string;
    position: { x: number; y: number; z: number };
    type: string;
  }>;
  onAnnotationClick?: (annotationId: number) => void;
}

function Model({ url }: { url: string }) {
  // This is a placeholder - actual model loading would use GLTFLoader
  // For now, we'll show a simple box as a demonstration
  return (
    <mesh>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="lightblue" />
    </mesh>
  );
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial wireframe color="gray" />
    </mesh>
  );
}

export function ModelViewer({ modelUrl, annotations = [], onAnnotationClick }: ModelViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGrid, setShowGrid] = useState(true);

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleResetCamera = () => {
    // Camera reset logic would go here
    console.log("Reset camera");
  };

  return (
    <div
      className={`relative bg-muted/30 rounded-lg overflow-hidden ${
        isFullscreen ? "fixed inset-0 z-50" : "h-[600px]"
      }`}
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
          <Home className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          onClick={() => setShowGrid(!showGrid)}
          title="Toggle Grid"
        >
          {showGrid ? "Grid" : "No Grid"}
        </Button>
      </div>

      {/* Info Overlay */}
      <div className="absolute bottom-4 left-4 z-10 bg-card/90 backdrop-blur-sm border rounded-lg p-3 text-sm">
        <div className="space-y-1">
          <div className="font-medium">Controls:</div>
          <div className="text-muted-foreground">
            • Left click + drag: Rotate
            <br />
            • Right click + drag: Pan
            <br />
            • Scroll: Zoom
            <br />• Click objects: Select/Annotate
          </div>
        </div>
      </div>

      {/* 3D Canvas */}
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[5, 5, 5]} />
        
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        
        {/* Environment */}
        <Environment preset="city" />
        
        {/* Grid */}
        {showGrid && <Grid infiniteGrid fadeDistance={50} fadeStrength={5} />}
        
        {/* Model */}
        <Suspense fallback={<LoadingFallback />}>
          <Model url={modelUrl} />
        </Suspense>
        
        {/* Annotations - placeholder markers */}
        {annotations.map((annotation) => (
          <mesh
            key={annotation.id}
            position={[annotation.position.x, annotation.position.y, annotation.position.z]}
            onClick={() => onAnnotationClick?.(annotation.id)}
          >
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshBasicMaterial color="red" />
          </mesh>
        ))}
        
        {/* Controls */}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={2}
          maxDistance={50}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>

      {/* Loading State */}
      {!modelUrl && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <div className="text-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading 3D model...</p>
          </div>
        </div>
      )}
    </div>
  );
}
