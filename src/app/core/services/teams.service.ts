import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environment/environment';

@Injectable({
  providedIn: 'root'
})
export class TeamsService {
  private baseUrl = `${environment.apiUrl}/invitations`; 

  constructor(private http: HttpClient) { }

  // إرسال دعوة لمطور جديد
  sendInvite(email: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/sendinvitaions`, { email });
  }

  // جلب كل الدعوات الخاصة بي (للمطور المسجل حالياً)
  getMyInvitations(): Observable<any> {
    return this.http.get(`${this.baseUrl}/getallinetations`);
  }

  // الرد على دعوة (قبول أو رفض)
  respondToInvitation(invitationId: string, decision: 'accept' | 'reject'): Observable<any> {
    return this.http.post(`${this.baseUrl}/respond/${invitationId}`, { decision });
  }

  // جلب أعضاء الفريق (للأدمن)
  getTeamMembers(): Observable<any> {
    return this.http.get(`${this.baseUrl}/members`);
  }

  // حذف عضو من الفريق (للأدمن)
  removeMember(memberId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/members/${memberId}`);
  }

  /**
   * تحديث صلاحية معينة لعضو في الفريق (للأدمن فقط)
   * @param memberId معرف المطور
   * @param key اسم الصلاحية (e.g., 'canDeleteProjects')
   * @param value القيمة الجديدة (true / false)
   */
  updateMemberPermission(memberId: string, key: string, value: boolean): Observable<any> {
    return this.http.patch(`${this.baseUrl}/members/${memberId}/permissions`, { key, value });
  }
}