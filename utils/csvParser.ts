import { InventoryItem, PlotStatus } from '../types';

export const parseCSV = async (file: File): Promise<InventoryItem[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) {
        resolve([]);
        return;
      }

      const lines = text.split('\n');
      if (lines.length < 2) {
        resolve([]);
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const data: InventoryItem[] = [];

      // Helper to find column index loosely
      const findCol = (terms: string[]) => headers.findIndex(h => terms.some(t => h.includes(t)));

      const idIdx = findCol(['plot', 'id', 'number', 'no']);
      const statusIdx = findCol(['status', 'state']);
      const priceIdx = findCol(['price', 'cost', 'amount']);
      const sqFtIdx = findCol(['sqft', 'area', 'size']);
      const nameIdx = findCol(['customer', 'buyer', 'name']);

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = line.split(',').map(v => v.trim());
        
        if (values[idIdx]) {
          let status = PlotStatus.AVAILABLE;
          const rawStatus = values[statusIdx]?.toLowerCase() || '';
          
          if (rawStatus.includes('sold')) status = PlotStatus.SOLD;
          else if (rawStatus.includes('book')) status = PlotStatus.BOOKED;

          data.push({
            plotId: values[idIdx],
            status,
            price: priceIdx > -1 ? parseFloat(values[priceIdx]) : undefined,
            sqFt: sqFtIdx > -1 ? parseFloat(values[sqFtIdx]) : undefined,
            customerName: nameIdx > -1 ? values[nameIdx] : undefined,
          });
        }
      }
      resolve(data);
    };
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
