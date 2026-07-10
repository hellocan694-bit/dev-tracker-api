import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { TaskService } from 'src/app/core/services/task.service';
import Swal from 'sweetalert2';
import { timer, Subscription, Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
@Component({
  selector: 'app-view-main-project',
  templateUrl: './view-main-project.component.html',
  styleUrls: ['./view-main-project.component.scss'],
})
export class ViewMainProjectComponent implements OnInit, OnDestroy {
  formData: FormGroup;
  tasks: any[] = []; 
  isLoading: boolean = false;
  financials: any;
  currentFilter: 'all' | 'completed' | 'progress' = 'all'; 
  taskMonitors: { [key: string]: Subscription } = {};
  
  // ⚡ صلاحيات الوصول
  canManage: boolean = false;
  canSeeFinancials: boolean = false;

  now$: Observable<number>;

  constructor(
    private fb: FormBuilder,
    private router: ActivatedRoute,
    private taskService: TaskService,
    private toaster: ToastrService
  ) {
    this.formData = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      estimatedHours: ['', [Validators.required, Validators.min(1)]],
      deadline: ['', [Validators.required]],
    });

    this.now$ = timer(0, 1000).pipe(
      map(() => Date.now()),
      shareReplay(1)
    );
  }

  ngOnInit(): void {
    // ⚡ لازم ننادي على دي أول حاجة عشان هي اللي بتحدد مين اليوزر وبتفتح الصلاحيات
    this.checkPermissionsAndLoadData();
  }

checkPermissionsAndLoadData() {
  const projectId = this.router.snapshot.paramMap.get('id');
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  if (projectId) {
    this.isLoading = true;
    
    this.taskService.getAllTasks(projectId).subscribe({
      next: (res: any) => {
        this.tasks = res.tasks;
        this.isLoading = false;

        // 1. استخراج الـ Owner ID من الداتا اللي راجعة من الباك إند
        const projectOwnerId = res.projectOwnerId; 
        
        // 2. هل اليوزر الحالي هو صاحب المشروع؟
        const isOwner = (currentUser._id === projectOwnerId);

        // 3. ندور في تيمات اليوزر عن التيم اللي "المدير" بتاعه هو صاحب المشروع ده
        const userTeamMembership = currentUser.teams?.find((t: any) => t.adminId === projectOwnerId);

        // --- ⚡ توزيع الصلاحيات الصارم ⚡ ---

        // canManage تبقى true في حالتين بس:
        // إما إنه المالك (Owner)
        // أو ديفلوبر مضاف ومعاه TRUE في الـ canManageTasks
        this.canManage = isOwner || (userTeamMembership && userTeamMembership.permissions?.canManageTasks === true);

        // canSeeFinancials تبقى true في حالتين بس:
        // إما إنه المالك (Owner)
        // أو ديفلوبر مضاف ومعاه TRUE في الـ canSeeFinancials
        this.canSeeFinancials = isOwner || (userTeamMembership && userTeamMembership.permissions?.canSeeFinancials === true);

        // تنفيذ الطلبات بناءً على النتيجة الجديدة
        if (this.canSeeFinancials) {
          this.getAllFinancials();
        }

        this.loadTasksStatus(projectId);
      },
      error: (err) => {
        this.isLoading = false;
        this.toaster.error('Error loading project');
      }
    });
  }
}

  loadTasksStatus(projectId: string) {
    this.tasks.forEach(task => {
      this.taskService.getTaskStatus(projectId, task._id).subscribe({
        next: (statusRes: any) => task.statusActivity = statusRes.status,
        error: () => task.statusActivity = { isWorking: false, duration: "0h 0m" }
      });
    });
  }

  getAllFinancials() {
    const projectId = this.router.snapshot.paramMap.get('id');
    if (projectId) {
      this.taskService.getFinancal(projectId).subscribe({
        next: (res: any) => this.financials = res.financials,
        error: (err) => console.error('Financials Access Denied', err),
      });
    }
  }

  creatTask() {
    if (this.formData.valid && this.canManage) {
      this.isLoading = true;
      const id = this.router.snapshot.paramMap.get('id');
      if (id) {
        this.taskService.createTask(id, this.formData.value).subscribe({
          next: () => {
            // ريفريش للداتا بعد الإضافة
            this.checkPermissionsAndLoadData();
            this.formData.reset();
            this.isLoading = false;
            this.showToast('success', 'Mission Launched');
          },
          error: (err) => {
            this.isLoading = false;
            this.toaster.error(err.error?.message);
          },
        });
      }
    }
  }

  toggleTaskActivity(task: any) {
    if (!this.canManage) return; // حماية زيادة

    const projectId = this.router.snapshot.paramMap.get('id');
    const isRunning = task.statusActivity?.isWorking;
    
    if (!isRunning) {
      const duration = task.statusActivity?.duration || "0h 0m";
      const hasStartedBefore = duration !== "0h 0m";
      const action = hasStartedBefore ? 'resumeTask' : 'startTask';
      
      this.taskService[action](projectId!, task._id).subscribe({
        next: () => {
          task.statusActivity = { ...task.statusActivity, isWorking: true };
          this.showToast('success', hasStartedBefore ? 'Mission Resumed' : 'Mission Started');
          this.startMonitoring(task);
        },
        error: (err) => this.showAlertNotification('error', 'System Error', err.error?.message)
      });
    } else {
      this.taskService.pauseTask(projectId!, task._id).subscribe({
        next: () => {
          task.statusActivity = { ...task.statusActivity, isWorking: false };
          this.stopMonitoring(task._id);
          this.showToast('info', 'Mission Paused');
        },
        error: (err) => this.showAlertNotification('error', 'System Error', err.error?.message)
      });
    }
  }

  // --- الميثودز الحسابية (Progress Bars) ---
  calculateTimeProgress(task: any): number {
    if (!task.statusActivity || !task.estimatedHours) return 0;
    const match = task.statusActivity.duration?.match(/(\d+)h\s+(\d+)m/);
    if (match) {
      const currentMinutes = parseInt(match[1]) * 60 + parseInt(match[2]);
      return Math.min((currentMinutes / (task.estimatedHours * 60)) * 100, 100);
    }
    return 0;
  }

  calculateDeadlineProgress(task: any, nowTime: number): number {
    if (!task.createdAt || !task.deadline) return 0;
    const start = new Date(task.createdAt).getTime();
    const end = new Date(task.deadline).getTime();
    if (nowTime >= end) return 100;
    return Math.max(0, Math.min(((nowTime - start) / (end - start)) * 100, 100));
  }

  // --- Monitoring & Alerts ---
  startMonitoring(task: any) {
    if (this.taskMonitors[task._id]) return;
    this.taskMonitors[task._id] = timer(0, 60000).subscribe(() => {
      const match = task.statusActivity?.duration?.match(/(\d+)h\s+(\d+)m/);
      if (match) {
        let h = parseInt(match[1]), m = parseInt(match[2]) + 1;
        if (m >= 60) { h++; m = 0; }
        task.statusActivity = { ...task.statusActivity, duration: `${h}h ${m}m` };
        
        const progress = ((h * 60 + m) / (task.estimatedHours * 60)) * 100;
        if (progress >= 90 && progress < 100) {
          this.showAlertNotification('warning', 'Fuel Alert', `${task.title} is at 90%!`);
        } else if (progress >= 100) {
          this.showAlertNotification('error', 'Time Over', `${task.title} limit exceeded!`);
          this.stopMonitoring(task._id);
        }
      }
    });
  }

  stopMonitoring(taskId: string) {
    if (this.taskMonitors[taskId]) {
      this.taskMonitors[taskId].unsubscribe();
      delete this.taskMonitors[taskId];
    }
  }

  completetask(taskId: string) {
    const projectId = this.router.snapshot.paramMap.get('id');
    if (projectId && this.canManage) {
      this.taskService.completeTask(projectId, taskId).subscribe({
        next: () => {
          this.checkPermissionsAndLoadData();
          this.showToast('success', 'Mission Accomplished!');
        }
      });
    }
  }

  deleteAllProjectTasks() {
    const projectId = this.router.snapshot.paramMap.get('id');
    if (projectId && this.canManage) {
      this.taskService.deleteAllTasks(projectId).subscribe({
        next: () => this.checkPermissionsAndLoadData()
      });
    }
  }

  // --- Getters ---
  get filteredTasks(): any[] {
    if (this.currentFilter === 'completed') return this.tasks.filter(t => t.status === 'done');
    if (this.currentFilter === 'progress') return this.tasks.filter(t => t.status !== 'done');
    return this.tasks;
  }

  get completionRate(): number {
    if (!this.tasks.length) return 0;
    return Math.round((this.tasks.filter(t => t.status === 'done').length / this.tasks.length) * 100);
  }

  get completedTasksCount(): number {
    return this.tasks.filter(t => t.status === 'done').length;
  }

  get upcomingDeadlines(): any[] {
    return this.tasks.filter(t => t.status !== 'done' && t.deadline)
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()).slice(0, 3);
  }

  getRemainingTime(deadline: any, nowTime?: number): string {
    const timeToUse = nowTime || Date.now();
    const diff = new Date(deadline).getTime() - timeToUse;
    if (diff < 0) return 'Overdue';
    const hours = Math.floor(diff / 3600000);
    return hours < 24 ? `In ${hours}h` : `In ${Math.floor(hours / 24)}d`;
  }

  private showToast(icon: any, title: string) {
    Swal.mixin({
      toast: true, position: 'bottom-end', showConfirmButton: false, timer: 2000,
      background: 'rgba(18, 18, 18, 0.9)', color: '#fff'
    }).fire({ icon, title });
  }

  private showAlertNotification(icon: 'warning' | 'error', title: string, text: string) {
    Swal.fire({
      title: `<span style="color: ${icon === 'warning' ? '#f59e0b' : '#ef4444'}">${title}</span>`,
      html: `<span style="color: #cbd5e1">${text}</span>`,
      icon, toast: true, position: 'top-end', showConfirmButton: false, timer: 6000,
      background: 'rgba(15, 23, 42, 0.95)'
    });
  }

  ngOnDestroy() {
    Object.values(this.taskMonitors).forEach(sub => sub.unsubscribe());
  }
}