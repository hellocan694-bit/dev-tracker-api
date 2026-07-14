import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from 'src/environment/environment';
import { Task, TaskResponse } from 'src/app/shared/interfaces/task';
import { ApiResponse, ChartData } from 'src/app/shared/interfaces/weeklyStatues';
@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  createTask(projectId: string, data: Partial<Task>): Observable<TaskResponse> {
    return this.http.post<TaskResponse>(
      `${this.baseUrl}/project/dev/tasks/createtask/${projectId}`, 
      data
    );
  }

  getAllTasks(projectId:string){
    return this.http.get(`${this.baseUrl}/project/dev/tasks/getalltasks/${projectId}`)
  }

  updateTask(projectId: string, taskId: string, data: Partial<Task>): Observable<TaskResponse> {
    return this.http.patch<TaskResponse>(
      `${this.baseUrl}/project/dev/tasks/updatetask/${projectId}/${taskId}`,
      data
    );
  }

  completeTask(projectId:string  , taskId:string){
    return this.http.patch(`${this.baseUrl}/project/dev/${projectId}/tasks/${taskId}/complete`, {})
  } 

  getFinancal(projectId:string){
    return this.http.get(`${this.baseUrl}/project/dev/${projectId}/financials`)
  }

  deleteAllTasks(projectId:string){
    return this.http.delete(`${this.baseUrl}/project/dev/tasks/deletealltasks/${projectId}`)
  }

  // task.service.ts

startTask(projectId: string, taskId: string): Observable<any> {
  return this.http.post(`${this.baseUrl}/activityproject/projects/${projectId}/tasks/${taskId}/start`, {});
}

pauseTask(projectId: string, taskId: string): Observable<any> {
  return this.http.post(`${this.baseUrl}/activityproject/projects/${projectId}/tasks/${taskId}/pause`, {});
}

resumeTask(projectId: string, taskId: string): Observable<any> {
  return this.http.post(`${this.baseUrl}/activityproject/projects/${projectId}/tasks/${taskId}/resume`, {});
}

getTaskStatus(projectId: string, taskId: string): Observable<any> {
  return this.http.get(`${this.baseUrl}/activityproject/projects/${projectId}/tasks/${taskId}/status`);
}

getTaskSessions(projectId: string, taskId: string): Observable<any> {
  return this.http.get(`${this.baseUrl}/activityproject/projects/${projectId}/tasks/${taskId}/sessions`);
}

getWeeklyStats(): Observable<ChartData[]> {

    return this.http.get<ApiResponse>(`${this.baseUrl}/activityproject/productivity-stats`).pipe(
      map(response => {
        return response.data.map(item => ({
        
          name: new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' }),
          value: item.hours
        }));
      })
    );
  }
}