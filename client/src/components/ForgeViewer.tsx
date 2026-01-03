import { useEffect, useRef, useState, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, AlertCircle, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Declare Autodesk global types
declare global {
  interface Window {
    Autodesk: {
      Viewing: {
        Initializer: (options: any, callback: () => void) => void;
        Document: {
          load: (
            urn: string,
            onSuccess: (doc: any) => void,
            onError: (errorCode: number, errorMessage: string) => void
          ) => void;
        };
        Private: {
          GuiViewer3D: new (container: HTMLElement, config?: any) => any;
        };
        OBJECT_TREE_CREATED_EVENT: string;
        GEOMETRY_LOADED_EVENT: string;
        SELECTION_CHANGED_EVENT: string;
        CAMERA_CHANGE_EVENT: string;
      };
    };
  }
}

interface ForgeViewerProps {
  urn: string;
  className?: string;
  onViewerReady?: (viewer: any) => void;
  onSelectionChanged?: (dbIds: number[]) => void;
  onCameraChange?: (camera: { position: any; target: any }) => void;
  showToolbar?: boolean;
  enableMarkup?: boolean;
}

interface ViewerState {
  status: 'loading' | 'ready' | 'error';
  message: string;
  progress?: number;
}

export function ForgeViewer({
  urn,
  className,
  onViewerReady,
  onSelectionChanged,
  onCameraChange,
  showToolbar = true,
  enableMarkup = false,
}: ForgeViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [viewerState, setViewerState] = useState<ViewerState>({
    status: 'loading',
    message: 'Initializing viewer...',
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);

  // Get viewer token
  const { data: tokenData, refetch: refetchToken } = trpc.models.getViewerToken.useQuery(
    undefined,
    { 
      staleTime: 50 * 60 * 1000, // Token valid for ~60 min, refresh at 50
      refetchOnWindowFocus: false,
    }
  );

  // Load Forge Viewer scripts
  useEffect(() => {
    const loadScripts = async () => {
      // Check if already loaded
      if (window.Autodesk?.Viewing) {
        setScriptsLoaded(true);
        return;
      }

      // Load CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/style.min.css';
      document.head.appendChild(link);

      // Load JS
      const script = document.createElement('script');
      script.src = 'https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/viewer3D.min.js';
      script.async = true;
      script.onload = () => setScriptsLoaded(true);
      script.onerror = () => {
        setViewerState({
          status: 'error',
          message: 'Failed to load Forge Viewer scripts',
        });
      };
      document.head.appendChild(script);
    };

    loadScripts();
  }, []);

  // Initialize viewer when scripts and token are ready
  useEffect(() => {
    if (!scriptsLoaded || !tokenData?.accessToken || !containerRef.current || !urn) {
      return;
    }

    const initViewer = () => {
      setViewerState({ status: 'loading', message: 'Initializing viewer...' });

      const options = {
        env: 'AutodeskProduction2',
        api: 'streamingV2',
        accessToken: tokenData.accessToken,
      };

      window.Autodesk.Viewing.Initializer(options, () => {
        if (!containerRef.current) return;

        // Create viewer
        const config = {
          extensions: enableMarkup
            ? ['Autodesk.Viewing.MarkupsCore', 'Autodesk.Viewing.MarkupsGui']
            : [],
        };

        const viewer = new window.Autodesk.Viewing.Private.GuiViewer3D(
          containerRef.current,
          config
        );
        viewer.start();
        viewerRef.current = viewer;

        // Set up event listeners
        viewer.addEventListener(window.Autodesk.Viewing.GEOMETRY_LOADED_EVENT, () => {
          setViewerState({ status: 'ready', message: 'Model loaded' });
          onViewerReady?.(viewer);
        });

        viewer.addEventListener(window.Autodesk.Viewing.SELECTION_CHANGED_EVENT, (event: any) => {
          onSelectionChanged?.(event.dbIdArray || []);
        });

        viewer.addEventListener(window.Autodesk.Viewing.CAMERA_CHANGE_EVENT, () => {
          const camera = viewer.getCamera();
          onCameraChange?.({
            position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
            target: { x: camera.target.x, y: camera.target.y, z: camera.target.z },
          });
        });

        // Load document
        loadDocument(viewer, urn);
      });
    };

    initViewer();

    return () => {
      if (viewerRef.current) {
        viewerRef.current.finish();
        viewerRef.current = null;
      }
    };
  }, [scriptsLoaded, tokenData?.accessToken, urn, enableMarkup]);

  const loadDocument = useCallback((viewer: any, documentUrn: string) => {
    setViewerState({ status: 'loading', message: 'Loading model...', progress: 0 });

    const documentId = `urn:${documentUrn}`;

    window.Autodesk.Viewing.Document.load(
      documentId,
      (doc: any) => {
        // Get default viewable
        const viewables = doc.getRoot().getDefaultGeometry();
        if (!viewables) {
          setViewerState({
            status: 'error',
            message: 'No viewable geometry found in document',
          });
          return;
        }

        viewer.loadDocumentNode(doc, viewables, {
          keepCurrentModels: false,
        });
      },
      (errorCode: number, errorMessage: string) => {
        console.error('Failed to load document:', errorCode, errorMessage);
        setViewerState({
          status: 'error',
          message: `Failed to load model: ${errorMessage}`,
        });
      }
    );
  }, []);

  const handleRefresh = useCallback(async () => {
    await refetchToken();
    if (viewerRef.current && urn) {
      loadDocument(viewerRef.current, urn);
    }
  }, [refetchToken, urn, loadDocument]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div className={cn('relative w-full h-full min-h-[400px] bg-gray-900 rounded-lg overflow-hidden', className)}>
      {/* Viewer container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Loading overlay */}
      {viewerState.status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 text-white">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <p className="text-sm">{viewerState.message}</p>
          {viewerState.progress !== undefined && (
            <div className="w-48 h-2 bg-gray-700 rounded-full mt-2">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${viewerState.progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Error overlay */}
      {viewerState.status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 text-white">
          <AlertCircle className="h-8 w-8 text-red-500 mb-4" />
          <p className="text-sm text-red-400 mb-4">{viewerState.message}</p>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      )}

      {/* Toolbar */}
      {showToolbar && viewerState.status === 'ready' && (
        <div className="absolute top-4 right-4 flex gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={toggleFullscreen}
            className="bg-gray-800/80 hover:bg-gray-700/80"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4 text-white" />
            ) : (
              <Maximize2 className="h-4 w-4 text-white" />
            )}
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={handleRefresh}
            className="bg-gray-800/80 hover:bg-gray-700/80"
          >
            <RefreshCw className="h-4 w-4 text-white" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default ForgeViewer;
