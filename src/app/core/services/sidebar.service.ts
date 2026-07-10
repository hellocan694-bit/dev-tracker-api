import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {

  constructor() { }

  private isOpen = new BehaviorSubject<boolean>(false);

  // 2. ده الـ Observable اللي السايد بار هتعمل عليه "Subscribe" عشان تراقب التغيير
  isOpen$ = this.isOpen.asObservable();

  // 3. فنكشن بنناديها من زرار الـ Navbar عشان تعكس الحالة
  toggle() {
    this.isOpen.next(!this.isOpen.value);
  }

  // 4. فنكشن بنناديها لما المستخدم يدوس على "الخلفية المظلمة" عشان يقفل المنيو
  close() {
    this.isOpen.next(false);
  }
}
