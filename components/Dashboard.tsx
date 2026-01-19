import React, { useState, useMemo, useRef, useEffect } from 'react';
import { DashboardData, PlotStatus, EnrichedPlot } from '../types';
import { User, DollarSign, Maximize2, Grid, Tag, ZoomIn, ZoomOut, RotateCcw, Move, MousePointerClick, Edit2 } from 'lucide-react';

interface DashboardProps {
  data: DashboardData;
  onStatusChange: (plotId: string, status: PlotStatus) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ data, onStatusChange }) => {
  // Store IDs instead of objects to ensure we always render the latest data from props
  const [hoveredPlotId, setHoveredPlotId] = useState<string | null>(null);
  const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<PlotStatus | 'All'>('All');
  
  // Transform State for Zoom/Pan
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Ref to distinguish between a click and a drag operation
  const hasDragged = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Tooltip State
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // SVG Coordinate system is 0-1000 based on the AI prompt request
  const SVG_SIZE = 1000;

  // Derive objects from IDs
  const hoveredPlot = useMemo(() => 
    data.plots.find(p => p.id === hoveredPlotId) || null
  , [data.plots, hoveredPlotId]);

  const selectedPlot = useMemo(() => 
    data.plots.find(p => p.id === selectedPlotId) || null
  , [data.plots, selectedPlotId]);

  const getStatusColor = (status: PlotStatus) => {
    switch (status) {
      case PlotStatus.AVAILABLE: return 'fill-green-500/30 stroke-green-500';
      case PlotStatus.BOOKED: return 'fill-orange-500/30 stroke-orange-500';
      case PlotStatus.SOLD: return 'fill-red-500/30 stroke-red-500';
      default: return 'fill-gray-500/30 stroke-gray-500';
    }
  };

  const getStatusBadgeColor = (status: PlotStatus) => {
    switch (status) {
      case PlotStatus.AVAILABLE: return 'bg-green-100 text-green-800 border-green-200';
      case PlotStatus.BOOKED: return 'bg-orange-100 text-orange-800 border-orange-200';
      case PlotStatus.SOLD: return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredPlots = useMemo(() => {
    if (filterStatus === 'All') return data.plots;
    return data.plots.filter(p => p.inventory?.status === filterStatus);
  }, [data.plots, filterStatus]);

  // Statistics
  const stats = useMemo(() => {
    const total = data.plots.length;
    const available = data.plots.filter(p => p.inventory?.status === PlotStatus.AVAILABLE).length;
    const booked = data.plots.filter(p => p.inventory?.status === PlotStatus.BOOKED).length;
    const sold = data.plots.filter(p => p.inventory?.status === PlotStatus.SOLD).length;
    return { total, available, booked, sold };
  }, [data.plots]);

  // Determine which plot to display in the side panel
  // Hover takes precedence for quick preview, otherwise show selected
  const displayPlot = hoveredPlot || selectedPlot;

  // --- Zoom & Pan Handlers ---

  const handleWheel = (e: React.WheelEvent) => {
    // Zoom centered on pointer
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate mouse position in "content" coordinates before zoom
    const contentX = (mouseX - transform.x) / transform.scale;
    const contentY = (mouseY - transform.y) / transform.scale;

    const scaleSensitivity = 0.001;
    const delta = -e.deltaY * scaleSensitivity;
    const newScale = Math.min(Math.max(0.5, transform.scale + delta), 8);

    // Calculate new translation to keep content point at mouse position
    const newX = mouseX - (contentX * newScale);
    const newY = mouseY - (contentY * newScale);

    setTransform({ scale: newScale, x: newX, y: newY });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    hasDragged.current = false;
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Update tooltip position regardless of dragging
    if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }

    if (isDragging) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // If moved more than a tiny amount, consider it a drag
      if (Math.abs(newX - transform.x) > 2 || Math.abs(newY - transform.y) > 2) {
        hasDragged.current = true;
      }

      setTransform(prev => ({
        ...prev,
        x: newX,
        y: newY
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Click on background clears selection if not dragging
  const handleBackgroundClick = () => {
    if (!hasDragged.current) {
      setSelectedPlotId(null);
    }
  };

  const handlePlotClick = (e: React.MouseEvent, plot: EnrichedPlot) => {
    e.stopPropagation(); // Prevent background click
    // Only select if we haven't been dragging the map
    if (!hasDragged.current) {
      setSelectedPlotId(plot.id);
    }
  };

  const resetZoom = () => {
    setTransform({ scale: 1, x: 0, y: 0 });
  };

  const zoomIn = () => {
     setTransform(prev => ({ ...prev, scale: Math.min(prev.scale * 1.2, 8) }));
  };

  const zoomOut = () => {
     setTransform(prev => ({ ...prev, scale: Math.max(prev.scale / 1.2, 0.5) }));
  };

  // Dynamic stroke width calculation for snapping/crisp lines
  // Base stroke is 2px. As we zoom in (scale increases), we divide stroke width
  // to maintain consistent visual thickness on screen.
  const dynamicStrokeWidth = Math.max(0.5, 2 / transform.scale);
  const selectedStrokeWidth = dynamicStrokeWidth * 2; // Thicker for selected
  const dynamicFontSize = Math.max(14, 24 / transform.scale);

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6 p-6">
      
      {/* Left Panel: Map */}
      <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative group">
        
        {/* Map Header / Toolbar */}
        <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50 z-10 relative shadow-sm">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2 text-sm">
              <Grid size={16} /> Layout Map
            </h2>
            <div className="h-4 w-px bg-slate-300 mx-2"></div>
            <div className="flex gap-2">
               <button onClick={zoomIn} className="p-1 hover:bg-white rounded border border-transparent hover:border-slate-200 text-slate-600" title="Zoom In">
                  <ZoomIn size={16} />
               </button>
               <button onClick={zoomOut} className="p-1 hover:bg-white rounded border border-transparent hover:border-slate-200 text-slate-600" title="Zoom Out">
                  <ZoomOut size={16} />
               </button>
               <button onClick={resetZoom} className="p-1 hover:bg-white rounded border border-transparent hover:border-slate-200 text-slate-600" title="Reset View">
                  <RotateCcw size={16} />
               </button>
            </div>
          </div>
          
          <div className="flex gap-2 text-xs">
            {Object.values(PlotStatus).map(status => (
              <div key={status} className="flex items-center gap-1 px-2 py-1 bg-white rounded border border-slate-200 shadow-sm">
                <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(status).replace('/30', '')} border-none`}></div>
                <span>{status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Map Container - Handles Zoom/Pan */}
        <div 
          ref={containerRef}
          className={`relative w-full h-full bg-slate-100 overflow-hidden ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleBackgroundClick}
        >
          <div 
            className="origin-top-left transition-transform duration-75 ease-out"
            style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}
          >
            <div className="relative inline-block shadow-xl">
              <img 
                src={data.layoutImage} 
                alt="Layout" 
                className="block max-w-none rounded select-none pointer-events-none"
                style={{ width: '1000px' }} // Fixed width basis for the coordinate system
                draggable={false}
              />
              
              {/* SVG Overlay */}
              <svg 
                viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`} 
                preserveAspectRatio="none"
                className="absolute top-0 left-0 w-full h-full"
                shapeRendering="geometricPrecision"
              >
                {filteredPlots.map((plot) => {
                  const [ymin, xmin, ymax, xmax] = plot.box_2d;
                  const width = xmax - xmin;
                  const height = ymax - ymin;
                  const status = plot.inventory?.status || PlotStatus.AVAILABLE;
                  const isSelected = selectedPlotId === plot.id;

                  return (
                    <g key={plot.id} 
                       className="cursor-pointer transition-all duration-200"
                       onMouseEnter={() => setHoveredPlotId(plot.id)}
                       onMouseLeave={() => setHoveredPlotId(null)}
                       onClick={(e) => handlePlotClick(e, plot)}
                    >
                      {/* Selection Glow/Highlight behind the rect */}
                      {isSelected && (
                         <rect
                           x={xmin - 4}
                           y={ymin - 4}
                           width={width + 8}
                           height={height + 8}
                           fill="none"
                           stroke="#3b82f6"
                           strokeWidth={dynamicStrokeWidth * 2}
                           strokeOpacity={0.5}
                           rx="2"
                         />
                      )}
                      
                      <rect
                        x={xmin}
                        y={ymin}
                        width={width}
                        height={height}
                        strokeWidth={isSelected ? selectedStrokeWidth : dynamicStrokeWidth}
                        className={`
                          ${getStatusColor(status)} 
                          ${isSelected ? 'stroke-blue-600 fill-opacity-50' : 'hover:fill-opacity-60'}
                          transition-all duration-200
                        `}
                      />
                      {/* Label - Hide when zoomed out too much to avoid clutter */}
                      {width * transform.scale > 30 && height * transform.scale > 20 && (
                        <text 
                          x={xmin + width / 2} 
                          y={ymin + height / 2} 
                          textAnchor="middle" 
                          dominantBaseline="middle"
                          className={`
                            font-extrabold pointer-events-none drop-shadow-sm
                            ${isSelected ? 'fill-blue-900 opacity-100' : 'fill-slate-900 opacity-70'}
                          `}
                          style={{ 
                              fontSize: dynamicFontSize, 
                              textShadow: '0px 0px 2px rgba(255,255,255,0.9)' 
                          }}
                        >
                          {plot.id}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Floating Tooltip - Only show if not selected (or show basic info if selected but hovering another) */}
          {hoveredPlot && hoveredPlot.id !== selectedPlotId && (
            <div 
              className="absolute pointer-events-none z-50 bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-xl border border-slate-200 w-56 animate-in fade-in zoom-in-95 duration-150"
              style={{ 
                left: mousePos.x + 15, 
                top: mousePos.y + 15 
              }}
            >
              <div className="flex justify-between items-start mb-2 border-b border-slate-100 pb-2">
                <span className="font-bold text-lg text-slate-800">{hoveredPlot.id}</span>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${getStatusBadgeColor(hoveredPlot.inventory?.status || PlotStatus.AVAILABLE)}`}>
                  {hoveredPlot.inventory?.status || 'Unknown'}
                </span>
              </div>
              <div className="space-y-1 text-xs text-slate-600">
                <div className="flex justify-between">
                    <span>Size:</span>
                    <span className="font-medium">{hoveredPlot.inventory?.sqFt || '-'} sqft</span>
                </div>
                <div className="flex justify-between">
                    <span>Price:</span>
                    <span className="font-medium text-slate-900">
                      {hoveredPlot.inventory?.price ? `$${hoveredPlot.inventory.price.toLocaleString()}` : '-'}
                    </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Info & Stats */}
      <div className="w-full lg:w-96 flex flex-col gap-6">
        
        {/* Stats Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Inventory Summary</h3>
          <div className="grid grid-cols-2 gap-4">
             <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-xs text-blue-400 font-medium">Total Plots</div>
             </div>
             <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.available}</div>
                <div className="text-xs text-green-400 font-medium">Available</div>
             </div>
             <div className="p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{stats.booked}</div>
                <div className="text-xs text-orange-400 font-medium">Booked</div>
             </div>
             <div className="p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{stats.sold}</div>
                <div className="text-xs text-red-400 font-medium">Sold</div>
             </div>
          </div>
          
          <div className="mt-6">
            <label className="text-xs font-semibold text-slate-500 mb-2 block">Filter View</label>
            <select 
              className="w-full p-2 border border-slate-200 rounded-md text-sm bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
            >
              <option value="All">Show All</option>
              <option value={PlotStatus.AVAILABLE}>Available Only</option>
              <option value={PlotStatus.BOOKED}>Booked Only</option>
              <option value={PlotStatus.SOLD}>Sold Only</option>
            </select>
          </div>
        </div>

        {/* Detail Card - Sticky if needed, or static */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-semibold text-slate-700">
               {selectedPlot ? 'Selected Plot' : (hoveredPlot ? 'Previewing Plot' : 'Plot Details')}
            </h3>
            {selectedPlot && (
              <button 
                onClick={() => setSelectedPlotId(null)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear Selection
              </button>
            )}
          </div>
          <div className="p-6 flex-1 flex flex-col justify-center">
            {displayPlot ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-slate-400 text-xs font-bold uppercase">Plot Number</span>
                    <h1 className="text-4xl font-bold text-slate-800">{displayPlot.id}</h1>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeColor(displayPlot.inventory?.status || PlotStatus.AVAILABLE)}`}>
                    {displayPlot.inventory?.status || 'Unknown'}
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <Maximize2 className="text-slate-400" size={20} />
                    <div>
                      <p className="text-xs text-slate-500">Area Size</p>
                      <p className="font-medium text-slate-700">{displayPlot.inventory?.sqFt ? `${displayPlot.inventory.sqFt} sq.ft` : 'N/A'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <DollarSign className="text-slate-400" size={20} />
                    <div>
                      <p className="text-xs text-slate-500">Price</p>
                      <p className="font-medium text-slate-700">
                        {displayPlot.inventory?.price 
                          ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(displayPlot.inventory.price) 
                          : 'Contact for Price'}
                      </p>
                    </div>
                  </div>

                  {(displayPlot.inventory?.status === PlotStatus.SOLD || displayPlot.inventory?.status === PlotStatus.BOOKED) && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <User className="text-slate-400" size={20} />
                      <div>
                        <p className="text-xs text-slate-500">Customer</p>
                        <p className="font-medium text-slate-700">{displayPlot.inventory?.customerName || 'Private'}</p>
                      </div>
                    </div>
                  )}

                  {/* Status Editor - Only Visible when Plot is Selected */}
                  {selectedPlot && selectedPlot.id === displayPlot.id && (
                    <div className="pt-4 mt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2 mb-3 text-slate-700">
                        <Edit2 size={16} />
                        <span className="text-sm font-semibold">Change Status</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {Object.values(PlotStatus).map(status => (
                          <button
                            key={status}
                            onClick={() => onStatusChange(displayPlot.id, status)}
                            className={`
                              flex items-center justify-between px-3 py-2 rounded-md text-sm border transition-all
                              ${(displayPlot.inventory?.status || PlotStatus.AVAILABLE) === status 
                                ? getStatusBadgeColor(status) + ' ring-1 ring-offset-1'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}
                            `}
                          >
                            <span>{status}</span>
                            {(displayPlot.inventory?.status || PlotStatus.AVAILABLE) === status && (
                              <div className={`w-2 h-2 rounded-full ${status === PlotStatus.AVAILABLE ? 'bg-green-500' : status === PlotStatus.BOOKED ? 'bg-orange-500' : 'bg-red-500'}`}></div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-400">
                <MousePointerClick size={48} className="mx-auto mb-3 opacity-20" />
                <p>Click a plot to view details or edit status.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};