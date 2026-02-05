import React from 'react';
import { DashboardData } from '../types';
import { Map, Calendar, ArrowRight, Trash2, Download } from 'lucide-react';

interface DirectoryProps {
  dashboards: DashboardData[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (id: string) => void;
  onCreateNew: () => void;
}

export const Directory: React.FC<DirectoryProps> = ({ dashboards, onSelect, onDelete, onExport, onCreateNew }) => {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Saved Dashboards</h1>
          <p className="text-slate-500">Access your saved real estate inventory maps.</p>
        </div>
        <button 
          onClick={onCreateNew}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
        >
          + Create New
        </button>
      </div>

      {dashboards.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
          <Map className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700">No dashboards found</h3>
          <p className="text-slate-400 mb-6">Upload a layout to get started.</p>
          <button onClick={onCreateNew} className="text-blue-600 font-medium hover:underline">
            Start a new project
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboards.map((dash) => (
            <div key={dash.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
              <div className="h-40 bg-slate-100 relative overflow-hidden">
                <img 
                  src={dash.layoutImage} 
                  alt={dash.name} 
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-4">
                  <span className="text-white font-bold text-lg drop-shadow-md">{dash.name}</span>
                </div>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(dash.createdAt).toLocaleDateString()}
                  </div>
                  <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                    {dash.plots.length} Plots
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button 
                    onClick={() => onSelect(dash.id)}
                    className="flex-1 text-sm font-medium text-blue-600 hover:bg-blue-50 py-2 rounded text-center flex items-center justify-center gap-1"
                  >
                    Open Dashboard <ArrowRight size={14} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onExport(dash.id); }}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Export Inventory CSV"
                  >
                    <Download size={16} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(dash.id); }}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete Dashboard"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};