import { Project } from "./project";

export interface ProjectResponse {
  page: number;
  limit: number;
  total:number;
  Projects: Project[]; 
}