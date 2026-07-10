import { Component, OnInit, OnDestroy } from '@angular/core';
import { TeamsService } from 'src/app/core/services/teams.service';
import { SocketService } from 'src/app/core/services/socket.service'; // استيراد السيرفس
import Swal from 'sweetalert2';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-invitations',
  templateUrl: './invitations.component.html',
  styleUrls: ['./invitations.component.scss']
})
export class InvitationsComponent implements OnInit, OnDestroy {
  myInvitations: any[] = [];
  isLoading: boolean = false;
  private inviteSub: Subscription | undefined;

  constructor(
    private _teamsService: TeamsService,
    private _socketService: SocketService // حقن سيرفس السوكيت
  ) {}

  ngOnInit(): void {
    // 1. تحميل الدعوات الموجودة فعلاً عند فتح الصفحة
    this.loadMyInvitations();

    // 2. الاستماع للسوكيت: لو جت دعوة جديدة وأنا واقف في الصفحة، حدث القائمة فوراً
    this.inviteSub = this._socketService.onEvent('new_invitation').subscribe({
      next: (data) => {
        console.log('Real-time invite received:', data);
        this.loadMyInvitations(); // ريفريش تلقائي للقائمة
      }
    });
  }

  // تنظيف الـ Subscription عشان ميبقاش فيه Memory Leak
  ngOnDestroy(): void {
    if (this.inviteSub) {
      this.inviteSub.unsubscribe();
    }
  }

  // جلب كل الدعوات من الـ API
  loadMyInvitations() {
    this.isLoading = true;
    this._teamsService.getMyInvitations().subscribe({
      next: (res: any) => {
        // تأكدنا من الـ path بناءً على الـ Backend بتاعك
        this.myInvitations = res.invitations || (res.data && res.data.invitations) || [];
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error loading invites:', err);
      }
    });
  }

  // الرد على الدعوة (Accept / Reject)
  handleInvite(id: string, decision: 'accept' | 'reject') {
    const actionText = decision === 'accept' ? 'Accept' : 'Decline';
    const actionIcon = decision === 'accept' ? 'question' : 'warning';
    const confirmBtnColor = decision === 'accept' ? '#3b82f6' : '#ef4444';

    Swal.fire({
      title: `<span style="color: #fff; font-family: 'Plus Jakarta Sans';">Are you sure?</span>`,
      html: `<span style="color: #94a3b8;">You are about to ${actionText.toLowerCase()} this team invitation.</span>`,
      icon: actionIcon,
      showCancelButton: true,
      confirmButtonText: `Yes, ${actionText}`,
      cancelButtonText: 'Cancel',
      background: 'rgba(15, 23, 42, 0.95)',
      confirmButtonColor: confirmBtnColor,
      cancelButtonColor: 'rgba(255,255,255,0.1)',
      reverseButtons: true,
      didOpen: (popup) => {
        popup.style.backdropFilter = 'blur(15px)';
        popup.style.borderRadius = '24px';
        popup.style.border = '1px solid rgba(255,255,255,0.1)';
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this._teamsService.respondToInvitation(id, decision).subscribe({
          next: (res: any) => {
            this.showToast('success', res.message || `Invitation ${decision}ed successfully`);
            this.loadMyInvitations(); // ريفريش بعد الرد
          },
          error: (err) => {
            const errorMsg = err.error?.message || 'Transaction failed';
            this.showToast('error', errorMsg);
          }
        });
      }
    });
  }

  private showToast(icon: 'success' | 'error', title: string) {
    Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      background: 'rgba(15, 23, 42, 0.9)',
      color: '#fff',
      didOpen: (toast) => {
        toast.style.backdropFilter = 'blur(10px)';
        toast.style.borderRadius = '12px';
        toast.style.border = '1px solid rgba(255,255,255,0.1)';
      }
    }).fire({ icon, title });
  }
}