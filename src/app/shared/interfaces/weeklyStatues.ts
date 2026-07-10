export interface ProductivityStats {
  date: string;  
  hours: number;
}

export interface ChartData {
  name: string; 
  value: number; 
}

export interface ApiResponse {
  status: string;
  count: number;
  data: ProductivityStats[];
}