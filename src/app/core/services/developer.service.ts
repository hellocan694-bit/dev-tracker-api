import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environment/environment';

@Injectable({
  providedIn: 'root'
})
export class DeveloperService {

  constructor(private http:HttpClient) { }
   private baseUrl = environment.apiUrl;
  changeUserName(name:string){
    return this.http.patch(`${this.baseUrl}/developerSettings/changeusername` , name);
  }
}
