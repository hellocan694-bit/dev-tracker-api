import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Project } from 'src/app/shared/interfaces/project';
import { ProjectResponse } from 'src/app/shared/interfaces/ProjectResponse';
import { environment } from 'src/environment/environment';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  private baseUrl = environment.apiUrl;
  constructor(private http: HttpClient) {}

  private historyCountSource = new BehaviorSubject<number>(0);
historyCount$ = this.historyCountSource.asObservable();

updateHistoryCount(count: number) {
  this.historyCountSource.next(count);
}
getAllProjects(page: number = 1, limit: number = 10): Observable<ProjectResponse> {
  
  let params = new HttpParams()
    .set('page', page.toString())
    .set('limit', limit.toString());

  return this.http.get<ProjectResponse>(`${this.baseUrl}/developer/dev/projectdev/projects`, { params });
}
  completeProject(projectId:string){
    return this.http.patch(`${this.baseUrl}/developer/dev/projectdev/archiveprojectdev/${projectId}` , {})
  }

  createProject(data:any){
    return this.http.post(`${this.baseUrl}/developer/dev/projectdev/createprojectdev` , data);
  }

  getCompletedProjects(page:number = 0):Observable<ProjectResponse>{
    let params = new HttpParams().set('page', page.toString());
    return this.http.get<ProjectResponse>(`${this.baseUrl}/developer/dev/projectdev/archivedprojects/history` , { params })
  }
  
  clearAllhistory(){
    return this.http.delete(`${this.baseUrl}/developer/dev/projectdev/clearhistory` , {})
  }
  deleteOneProject(projectId:string){
    return this.http.delete(`${this.baseUrl}/developer/dev/projectdev/deleteProject/${projectId}`)
  }


  getWeeklyStats(): Observable<any> {
  return this.http.get<any>(`${this.baseUrl}/activityproject/my-weekly-hours`);
}



}
