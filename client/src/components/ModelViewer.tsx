import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid, Environment, PerspectiveCamera, useGLTF, Html, Center, useProgress } from "@react-three/drei";
import { Suspense, useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Maximize2, Minimize2, Home, RotateCcw, Grid3X3, Eye, EyeOff, RefreshCw, Download, ExternalLink } from "lucide-react";
import * as THREE from "three";

interface ModelViewerProps {
  modelUrl: string;
  modelFormat?: string; // Add format prop to determine rendering strategy
  annotations?: Array<{
    id: number;
    title: string;
    position: { x: number; y: number; z: number };
    type: string;
  }>;
  onAnnotationClick?: (annotationId: number) => void;
  height?: string;
}

// Helper function to determine if format is natively supported by Three.js
function isNativelySupported(format?: string): boolean {
  if (!format) return false;
  const supported = ['glb', 'gltf'];
  return supported.includes(format.toLowerCase());
}

// Helper function to determine if format needs conversion
function needsConversion(format?: string): boolean {
  if (!format) return false;
  const conversionFormats = ['rvt', 'rfa', 'dwg', 'dxf', 'skp', 'fbx', 'obj'];
  return conversionFormats.includes(format.toLowerCase());
}

// Loading progress component with visibility awareness
function Loader({ onVisibilityIssue }: { onVisibilityIssue?: () => void }) {
  const { progress, active, errors, item, loaded, total } = useProgress();
  const [stalled, setStalled] = useState(false);
  const lastProgressRef = useRef(progress);
  const stallTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Detect stalled loading (no progress for 5 seconds while still active)
  useEffect(() => {
    if (active && progress < 100) {
      // Clear existing timer
      if (stallTimerRef.current) {
        clearTimeout(stallTimerRef.current);
      }

      // If progress hasn't changed, start stall detection
      if (progress === lastProgressRef.current) {
        stallTimerRef.current = setTimeout(() => {
          setStalled(true);
          onVisibilityIssue?.();
        }, 5000);
      } else {
        setStalled(false);
        lastProgressRef.current = progress;
      }
    }

    return () => {
      if (stallTimerRef.current) {
        clearTimeout(stallTimerRef.current);
      }
    };
  }, [progress, active, onVisibilityIssue]);

  return (
    <Html center>
      <div className="flex flex-col items-center gap-2 bg-card/90 backdrop-blur-sm p-4 rounded-lg border">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Loading model... {progress.toFixed(0)}%
        </p>
        {stalled && (
          <p className="text-xs text-amber-500">
            Loading may have stalled. Try refreshing if it doesn't complete.
          </p>
        )}
      </div>
    </Html>
  );
}

// Error fallback component
function ErrorFallback({ error }: { error: string }) {
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2 bg-destructive/10 backdrop-blur-sm p-4 rounded-lg border border-destructive max-w-md">
        <p className="text-sm text-destructive font-medium">Failed to load model</p>
        <p className="text-xs text-muted-foreground text-center">{error}</p>
      </div>
    </Html>
  );
}

// The actual 3D model component that loads GLB/GLTF files
function Model({ url, onLoad, onError }: { url: string; onLoad?: () => void; onError?: (error: string) => void }) {
  const [loadAttempt, setLoadAttempt] = useState(0);
  
  // Clear cache and reload on visibility restore
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Small delay to let browser recover
        setTimeout(() => {
          setLoadAttempt(prev => prev + 1);
        }, 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return <ModelLoader key={`${url}-${loadAttempt}`} url={url} onLoad={onLoad} onError={onError} />;
}

// Separate component to handle the actual loading
function ModelLoader({ url, onLoad, onError }: { url: string; onLoad?: () => void; onError?: (error: string) => void }) {
  const modelRef = useRef<THREE.Group>(null);
  const hasLoadedRef = useRef(false);
  const [loadError, setLoadError] = useState<Error | null>(null);
  
  // Use try-catch wrapper for useGLTF to handle loading errors
  let scene: THREE.Group | null = null;
  let gltfError: Error | null = null;
  
  try {
    const gltf = useGLTF(url, true); // true enables draco compression support
    scene = gltf.scene;
  } catch (error) {
    gltfError = error as Error;
    console.error('GLTF loading error:', error);
  }

  useEffect(() => {
    if (gltfError && !loadError) {
      setLoadError(gltfError);
      onError?.(gltfError.message || 'Failed to load model');
    }
  }, [gltfError, loadError, onError]);

  useEffect(() => {
    if (scene && !hasLoadedRef.current && !loadError) {
      try {
        hasLoadedRef.current = true;
        
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
      } catch (error) {
        console.error('Error processing model:', error);
        const errorMsg = error instanceof Error ? error.message : 'Failed to process model';
        setLoadError(error as Error);
        onError?.(errorMsg);
      }
    }
  }, [scene, onLoad, onError, loadError]);

  if (loadError) {
    return <ErrorFallback error={loadError.message} />;
  }

  if (!scene) {
    return null;
  }

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

// WebGL context recovery handler
function ContextRecoveryHandler({ onContextLost, onContextRestored }: { 
  onContextLost?: () => void; 
  onContextRestored?: () => void;
}) {
  const { gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      console.warn('WebGL context lost');
      onContextLost?.();
    };

    const handleContextRestored = () => {
      console.log('WebGL context restored');
      onContextRestored?.();
    };

    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, [gl, onContextLost, onContextRestored]);

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

// Conversion notice component for non-native formats
function ConversionNotice({ format, modelUrl }: { format: string; modelUrl: string }) {
  const formatNames: Record<string, string> = {
    rvt: 'Autodesk Revit',
    rfa: 'Revit Family',
    dwg: 'AutoCAD DWG',
    dxf: 'AutoCAD DXF',
    skp: 'SketchUp',
    fbx: 'Autodesk FBX',
    obj: 'Wavefront OBJ'
  };

  const formatName = formatNames[format.toLowerCase()] || format.toUpperCase();

  return (
    <div className="absolute inset-0 flex items-center justify-center p-6">
      <div className="bg-card border rounded-lg p-8 max-w-2xl text-center space-y-6 shadow-lg">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">3D Model Uploaded</h3>
          <p className="text-muted-foreground">
            {formatName} file detected
          </p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>Native CAD Format Detected</strong>
          </p>
          <p className="text-sm text-blue-800 dark:text-blue-200">
            This file format requires conversion to GLB/GLTF for web viewing. To view your model in the 3D viewer:
          </p>
          <ol className="text-sm text-blue-800 dark:text-blue-200 text-left space-y-2 ml-6 list-decimal">
            <li>Download your {formatName} file using the button below</li>
            <li>Convert it to GLB format using tools like:
              <ul className="ml-6 mt-1 list-disc space-y-1">
                <li><a href="https://www.autodesk.com/products/fbx/overview" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600">Autodesk FBX Converter</a> (for Revit, DWG)</li>
                <li><a href="https://www.sketchup.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600">SketchUp Web</a> (for SKP files)</li>
                <li><a href="https://products.aspose.app/3d/conversion" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-600">Online 3D Converter</a> (various formats)</li>
              </ul>
            </li>
            <li>Upload the converted GLB file as a new model version</li>
          </ol>
        </div>

        <div className="flex gap-3 justify-center">
          <Button asChild variant="default">
            <a href={modelUrl} download>
              <Download className="mr-2 h-4 w-4" />
              Download {format.toUpperCase()} File
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href="https://products.aspose.app/3d/conversion" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Open Converter
            </a>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Your file is safely stored and can be downloaded anytime. Once converted to GLB, upload it as a new version to enable 3D visualization.
        </p>
      </div>
    </div>
  );
}

export function ModelViewer({ modelUrl, modelFormat, annotations = [], onAnnotationClick, height = "600px" }: ModelViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [needsReload, setNeedsReload] = useState(false);
  const [modelKey, setModelKey] = useState(0); // Key to force re-mount of model
  const controlsRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Determine rendering strategy based on format
  const showConversionNotice = needsConversion(modelFormat);
  const canRenderNatively = isNativelySupported(modelFormat);

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
    setNeedsReload(false);
  }, []);

  const handleModelError = useCallback((error: string) => {
    setLoadError(error);
    setModelLoaded(false);
  }, []);

  const handleReload = useCallback(() => {
    // Clear the GLTF cache for this URL
    if (modelUrl && canRenderNatively) {
      useGLTF.clear(modelUrl);
    }
    setModelLoaded(false);
    setLoadError(null);
    setNeedsReload(false);
    setModelKey(prev => prev + 1);
  }, [modelUrl, canRenderNatively]);

  const handleVisibilityIssue = useCallback(() => {
    setNeedsReload(true);
  }, []);

  const handleContextLost = useCallback(() => {
    setNeedsReload(true);
  }, []);

  const handleContextRestored = useCallback(() => {
    // Trigger a reload after context is restored
    handleReload();
  }, [handleReload]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Handle visibility changes - pause rendering when tab is not visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      setIsVisible(visible);
      
      if (visible && !modelLoaded && modelUrl && canRenderNatively) {
        // Tab became visible and model wasn't loaded - might need reload
        // Give it a moment to see if loading resumes
        setTimeout(() => {
          if (!modelLoaded) {
            setNeedsReload(true);
          }
        }, 2000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [modelLoaded, modelUrl, canRenderNatively]);

  // Determine if we have a valid model URL
  const hasValidModel = modelUrl && modelUrl.length > 0 && !modelUrl.includes('placeholder');

  // If the format needs conversion, show the conversion notice instead of the 3D viewer
  if (showConversionNotice && hasValidModel && modelFormat) {
    return (
      <div
        ref={containerRef}
        className={`relative bg-muted/30 rounded-lg overflow-hidden ${
          isFullscreen ? "fixed inset-0 z-50" : ""
        }`}
        style={{ height: isFullscreen ? '100vh' : height }}
      >
        <ConversionNotice format={modelFormat} modelUrl={modelUrl} />
      </div>
    );
  }

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
        {hasValidModel && canRenderNatively && (
          <Button
            size="icon"
            variant="secondary"
            onClick={handleReload}
            title="Reload Model"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Reload Banner - shown when loading may have stalled */}
      {needsReload && hasValidModel && !modelLoaded && canRenderNatively && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-amber-500/90 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <span className="text-sm">Model loading interrupted</span>
          <Button size="sm" variant="secondary" onClick={handleReload}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Reload
          </Button>
        </div>
      )}

      {/* Info Overlay */}
      {canRenderNatively && (
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
      )}

      {/* Model info */}
      {hasValidModel && modelLoaded && canRenderNatively && (
        <div className="absolute top-4 left-4 z-10 bg-card/90 backdrop-blur-sm border rounded-lg px-3 py-2">
          <p className="text-xs text-muted-foreground">Model loaded successfully</p>
        </div>
      )}

      {/* 3D Canvas - only render for natively supported formats */}
      {canRenderNatively && (
        <Canvas 
          shadows 
          frameloop={isVisible ? "always" : "demand"}
          key={modelKey}
          gl={{ 
            preserveDrawingBuffer: true,
            powerPreference: "high-performance",
            antialias: true,
          }}
          onCreated={({ gl }) => {
            // Ensure WebGL context is properly configured
            gl.setClearColor(0x000000, 0);
          }}
        >
          <PerspectiveCamera makeDefault position={[5, 5, 5]} fov={50} />
          
          {/* Context recovery handler */}
          <ContextRecoveryHandler 
            onContextLost={handleContextLost}
            onContextRestored={handleContextRestored}
          />
          
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
          <Suspense fallback={<Loader onVisibilityIssue={handleVisibilityIssue} />}>
            <Center>
              {hasValidModel ? (
                <Model url={modelUrl} onLoad={handleModelLoad} onError={handleModelError} />
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
      )}

      {/* No model placeholder overlay */}
      {!hasValidModel && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center bg-card/80 backdrop-blur-sm rounded-lg p-6 border">
            <p className="text-sm text-muted-foreground">
              No 3D model uploaded yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Upload a GLB or GLTF file to view your building model in 3D
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Preload hook for better performance
useGLTF.preload;
