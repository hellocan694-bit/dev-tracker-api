import { Component, OnInit, OnDestroy } from '@angular/core';
import { TeamsService } from 'src/app/core/services/teams.service';
import { SocketService } from 'src/app/core/services/socket.service'; // استيراد السيرفس
import Swal from 'sweetalert2';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-teamleader',
  templateUrl: './teamleader.component.html',
  styleUrls: ['./teamleader.component.scss'],
})
export class TeamleaderComponent implements OnInit, OnDestroy {
  email: string = '';
  members: any[] = [];
  isLoadingMembers: boolean = false;
  isSending: boolean = false;

  // لحفظ الاشتراك في السوكيت عشان نقفله لما نسيب الصفحة
  private socketSub: Subscription | undefined;

  constructor(
    private _teamsService: TeamsService,
    private _socketService: SocketService // حقن سيرفس السوكيت
  ) {}

private subscriptions: Subscription = new Subscription();

ngOnInit(): void {
  this.loadTeamMembers();

  // 2. استخدم .add() عشان تضيف أي اشتراك جديد للمجموعة
  this.subscriptions.add(
    this._socketService.onEvent('invitation_accepted').subscribe({
      next: (data) => {
        this.loadTeamMembers();
        this.showToast('success', `${data.developerName} joined!`);
      },
    })
  );

  this.subscriptions.add(
    this._socketService.onEvent('removed_from_team').subscribe({
      next: () => this.loadTeamMembers(),
    })
  );
  
  // أي إيفنت زيادة حطه هنا بنفس الطريقة .add(...)
}

ngOnDestroy(): void {
  // 3. بكلمة واحدة، بتفصل كل اللي فوق مرة واحدة
  this.subscriptions.unsubscribe();
  console.log('All socket listeners cleaned up safely.');
}

  // إرسال دعوة لمطور جديد
  onSendInvite(): void {
    if (!this.email) return;

    this.isSending = true;
    this._teamsService.sendInvite(this.email).subscribe({
      next: (res) => {
        this.showToast('success', 'Invitation Dispatched');
        this.email = '';
        this.isSending = false;
        // ملاحظة: العضو مش هيظهر هنا غير لما السوكيت يبعت خبر إنه "Accepted"
      },
      error: (err) => {
        this.isSending = false;
        this.showAlertNotification(
          'error',
          'Transmission Failed',
          err.error?.message || 'Check connection'
        );
      },
    });
  }

  // تحميل قائمة أعضاء الفريق
  loadTeamMembers(): void {
    this.isLoadingMembers = true;
    this._teamsService.getTeamMembers().subscribe({
      next: (res) => {
        // بناءً على الـ Backend بتاعك بنوصل للـ data.members
        this.members = res.data?.members || [];
        this.isLoadingMembers = false;
      },
      error: (err) => {
        this.isLoadingMembers = false;
        console.error('Failed to load team members:', err);
      },
    });
  }

  // --- ميثود الـ Toast الزجاجي ---
  private showToast(
    icon: 'success' | 'info' | 'warning' | 'error',
    title: string
  ) {
    Swal.mixin({
      toast: true,
      position: 'bottom-end',
      showConfirmButton: false,
      timer: 4000,
      timerProgressBar: true,
      background: 'rgba(15, 23, 42, 0.9)',
      color: '#fff',
      didOpen: (toast) => {
        toast.style.backdropFilter = 'blur(10px)';
        toast.style.border = '1px solid rgba(255, 255, 255, 0.1)';
        toast.style.borderRadius = '12px';
      },
    }).fire({ icon, title });
  }

  // --- ميثود التنبيهات الاحترافية ---
  private showAlertNotification(
    icon: 'warning' | 'error',
    title: string,
    text: string
  ) {
    const alertColor = icon === 'warning' ? '#f59e0b' : '#ef4444';

    Swal.fire({
      title: `<span style="color: ${alertColor}; font-family: 'Plus Jakarta Sans', sans-serif; text-transform: uppercase; letter-spacing: 2px; font-weight:800;">${title}</span>`,
      html: `<span style="color: #cbd5e1; font-size: 0.9rem;">${text}</span>`,
      icon: icon,
      background: 'rgba(15, 23, 42, 0.95)',
      backdrop: `rgba(0,0,0,0.4)`,
      confirmButtonColor: '#3b82f6',
      customClass: {
        popup: 'glass-alert-popup',
      },
      didOpen: (popup) => {
        popup.style.backdropFilter = 'blur(15px)';
        popup.style.border = `1px solid ${alertColor}44`;
        popup.style.borderRadius = '24px';
      },
    });
  }

  onRemoveMember(memberId: string, memberName: string): void {
    Swal.fire({
      title: 'Are you sure?',
      text: `You are about to remove ${memberName} from the team.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Remove!',
      cancelButtonText: 'Abort',
      background: 'rgba(15, 23, 42, 0.95)',
      color: '#fff',
      confirmButtonColor: '#ef4444', // أحمر للحذف
      cancelButtonColor: '#3b82f6',
      customClass: { popup: 'glass-alert-popup' }
    }).then((result) => {
      if (result.isConfirmed) {
        this._teamsService.removeMember(memberId).subscribe({
          next: () => {
            this.showToast('success', `${memberName} has been removed.`);
            this.loadTeamMembers(); // تحديث يدوي للقائمة بعد الحذف الناجح
          },
          error: (err) => {
            this.showAlertNotification('error', 'Operation Failed', err.error?.message || 'Could not remove member');
          }
        });
      }
    });
  }

  // مثال سريع في الـ Component
onPermissionChange(memberId: string, key: string, event: any): void {
  const newValue = event.target.checked;
  const member = this.members.find(m => m.id === memberId);
  const memberName = member ? member.name : 'Developer';

  // 1. إظهار Swal التحميل (Pending)
  Swal.fire({
    title: 'Updating Permissions...',
    html: `Setting <b>${key}</b> to <b>${newValue}</b> for ${memberName}`,
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading(); // العلامة اللي بتلف
    },
    background: 'rgba(15, 23, 42, 0.95)',
    color: '#fff',
    customClass: { popup: 'glass-alert-popup' }
  });

  // 2. التنفيذ في السيرفس
  this._teamsService.updateMemberPermission(memberId, key, newValue).subscribe({
    next: (res) => {
      // 3. نجاح العملية -> تحديث الـ Swal لعلامة صح
      Swal.fire({
        icon: 'success',
        title: 'Permission Updated!',
        text: `${memberName} now has ${key} set to ${newValue}`,
        timer: 1500,
        showConfirmButton: false,
        background: 'rgba(15, 23, 42, 0.95)',
        color: '#fff',
        customClass: { popup: 'glass-alert-popup' }
      });

      // تحديث الداتا في الـ Array المحلية عشان الـ UI ميهنجش
      if (member) {
        member.permissions[key] = newValue;
      }
    },
    error: (err) => {
      // 4. فشل العملية -> إظهار خطأ وإرجاع الـ Checkbox لحالته
      event.target.checked = !newValue; 
      
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: err.error?.message || 'Something went wrong',
        background: 'rgba(15, 23, 42, 0.95)',
        color: '#fff',
        confirmButtonColor: '#ef4444',
        customClass: { popup: 'glass-alert-popup' }
      });
    }
  });
}
}
