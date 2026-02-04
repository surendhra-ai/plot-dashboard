import React, { useState, useEffect } from 'react';
import { DashboardData, FileUploadState, ViewState, EnrichedPlot, PlotStatus, InventoryItem } from './types';
import { analyzeLayoutImage } from './services/geminiService';
import { parseCSV, fileToBase64, exportToCSV } from './utils/csvParser';
import { UploadWizard } from './components/UploadWizard';
import { Dashboard } from './components/Dashboard';
import { Directory } from './components/Directory';
import { FolderOpen, Save, RotateCcw, Layout, ArrowLeft, Download } from 'lucide-react';

const STORAGE_KEY = 'estatevision_dashboards';

export default function App() {
  const [view, setView] = useState<ViewState>('DIRECTORY');
  const [dashboards, setDashboards] = useState<DashboardData[]>([]);
  const [currentDashboard, setCurrentDashboard] = useState<DashboardData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setDashboards(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load dashboards", e);
      }
    }
  }, []);

  const handleProcessFiles = async (files: FileUploadState) => {
    if (!files.imageFile || !files.inventoryFile) return;

    setIsProcessing(true);
    try {
      // 1. Convert Image to Base64
      const base64Img = await fileToBase64(files.imageFile);

      // 2. Parse CSV
      const inventoryData = await parseCSV(files.inventoryFile);

      // 3. AI Analysis of Image
      const plotsGeometry = await analyzeLayoutImage(base64Img);

      // 4. Merge Data
      const enrichedPlots: EnrichedPlot[] = plotsGeometry.map(geom => {
        // Simple matching logic: Clean IDs and find exact match
        const matchingInventory = inventoryData.find(inv => 
          inv.plotId.toString().toLowerCase() === geom.id.toString().toLowerCase()
        );
        return {
          ...geom,
          inventory: matchingInventory
        };
      });

      // 5. Create Dashboard Object
      const newDashboard: DashboardData = {
        id: crypto.randomUUID(),
        name: files.imageFile.name.split('.')[0] + ' Dashboard',
        createdAt: Date.now(),
        layoutImage: base64Img,
        plots: enrichedPlots
      };

      setCurrentDashboard(newDashboard);
      setView('DASHBOARD');

    } catch (error) {
      console.error("Processing error:", error);
      alert("An error occurred while processing the files. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdatePlotStatus = (plotId: string, newStatus: PlotStatus) => {
    if (!currentDashboard) return;

    const updatedPlots = currentDashboard.plots.map(plot => {
      if (plot.id === plotId) {
        // Create inventory object if it doesn't exist (e.g., plot detected by AI but not in CSV)
        const updatedInventory = plot.inventory 
          ? { ...plot.inventory, status: newStatus }
          : { plotId: plot.id, status: newStatus };
          
        return { ...plot, inventory: updatedInventory };
      }
      return plot;
    });

    setCurrentDashboard({
      ...currentDashboard,
      plots: updatedPlots
    });
  };

  const handleSave = () => {
    if (!currentDashboard) return;
    
    // Check if updating existing or saving new (for this logic, we always append new if ID doesn't exist)
    const existingIdx = dashboards.findIndex(d => d.id === currentDashboard.id);
    let updatedDashboards;
    
    if (existingIdx >= 0) {
      updatedDashboards = [...dashboards];
      updatedDashboards[existingIdx] = currentDashboard;
    } else {
      updatedDashboards = [...dashboards, currentDashboard];
    }
    
    setDashboards(updatedDashboards);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedDashboards));
    alert("Dashboard saved successfully!");
  };

  const handleExport = () => {
    if (!currentDashboard) return;

    // Collect all inventory items. 
    // If a plot has no inventory object (detected by AI but not in orig CSV and untouched), 
    // we create a default entry so it's included in the dump.
    const exportData: InventoryItem[] = currentDashboard.plots.map(plot => {
      if (plot.inventory) {
        return plot.inventory;
      } else {
        return {
          plotId: plot.id,
          status: PlotStatus.AVAILABLE,
          price: undefined,
          sqFt: undefined,
          customerName: undefined
        };
      }
    });

    const filename = `${currentDashboard.name.replace(/\s+/g, '_')}_Inventory.csv`;
    exportToCSV(exportData, filename);
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset? Unsaved changes will be lost.")) {
      setCurrentDashboard(null);
      setView('WIZARD');
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Delete this dashboard?")) {
      const updated = dashboards.filter(d => d.id !== id);
      setDashboards(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans">
      
      {/* App Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('DIRECTORY')}>
            <div className="bg-blue-600 text-white p-1.5 rounded-lg">
               <Layout size={20} />
            </div>
            <span className="font-bold text-lg tracking-tight">EstateVision AI</span>
          </div>

          <div className="flex items-center gap-3">
            {view === 'DASHBOARD' && (
              <>
                 <button 
                  onClick={() => setView('DIRECTORY')}
                  className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-md text-sm font-medium transition-colors"
                >
                  <FolderOpen size={16} /> Directory
                </button>
                <div className="h-6 w-px bg-slate-200 mx-1"></div>
                
                <button 
                  onClick={handleExport}
                  className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-md text-sm font-medium transition-colors"
                  title="Export current inventory status to CSV"
                >
                  <Download size={16} /> Export
                </button>

                <button 
                  onClick={handleReset}
                  className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-md text-sm font-medium transition-colors"
                >
                  <RotateCcw size={16} /> Reset
                </button>
                <button 
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Save size={16} /> Save
                </button>
              </>
            )}
            
            {view === 'WIZARD' && (
               <button 
                onClick={() => setView('DIRECTORY')}
                className="flex items-center gap-2 px-3 py-1.5 text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors"
              >
                <ArrowLeft size={16} /> Back to Directory
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {view === 'DIRECTORY' && (
          <Directory 
            dashboards={dashboards} 
            onSelect={(id) => {
              const dash = dashboards.find(d => d.id === id);
              if (dash) {
                setCurrentDashboard(dash);
                setView('DASHBOARD');
              }
            }}
            onDelete={handleDelete}
            onCreateNew={() => setView('WIZARD')}
          />
        )}

        {view === 'WIZARD' && (
          <UploadWizard onProcess={handleProcessFiles} isProcessing={isProcessing} />
        )}

        {view === 'DASHBOARD' && currentDashboard && (
          <Dashboard 
            data={currentDashboard} 
            onStatusChange={handleUpdatePlotStatus}
          />
        )}
      </main>

    </div>
  );
}