import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { TaskService } from 'src/app/core/services/task.service';
import { ProjectService } from 'src/app/core/services/project.service';
import { TeamsService } from 'src/app/core/services/teams.service';
import { Project } from 'src/app/shared/interfaces/project';
import { Task } from 'src/app/shared/interfaces/task';
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
  editProjectForm: FormGroup;
  editTaskForm: FormGroup;
  tasks: any[] = []; 
  isLoading: boolean = false;
  financials: any;
  currentFilter: 'all' | 'completed' | 'progress' = 'all'; 
  taskMonitors: { [key: string]: Subscription } = {};
  
  // Project details & Team members
  project: Project | null = null;
  teamMembers: any[] = [];

  // Modals state
  showEditProjectModal: boolean = false;
  showEditTaskModal: boolean = false;
  selectedTask: any = null;

  // ⚡ صلاحيات الوصول
  currentUser: any = null;
  canManage: boolean = false;
  canSeeFinancials: boolean = false;
  canEditProject: boolean = false;
  isAdmin: boolean = false;
  isOwner: boolean = false;

  now$: Observable<number>;

  constructor(
    private fb: FormBuilder,
    private router: ActivatedRoute,
    private taskService: TaskService,
    private projectService: ProjectService,
    private teamsService: TeamsService,
    private toaster: ToastrService
  ) {
    this.formData = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      estimatedHours: ['', [Validators.required, Validators.min(1)]],
      deadline: ['', [Validators.required]],
    });

    this.editProjectForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      clientName: ['', [Validators.required, Validators.minLength(2)]],
      hourlyRate: [0, [Validators.required, Validators.min(0)]],
      description: [''],
      status: ['active', [Validators.required]]
    });

    this.editTaskForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      estimatedHours: [0, [Validators.required, Validators.min(0)]],
      deadline: ['', [Validators.required]],
      assignedTo: [''],
      status: ['todo', [Validators.required]],
      progress: [0, [Validators.required, Validators.min(0), Validators.max(100)]]
    });

    this.now$ = timer(0, 1000).pipe(
      map(() => Date.now()),
      shareReplay(1)
    );
  }

  ngOnInit(): void {
    // ⚡ لازم ننادي على دي أول حاجة عشان هي اللي بتحدد مين اليوزر وبتفتح الصلاحيات
    this.checkPermissionsAndLoadData();
    this.loadTeamMembers();
  }

  loadTeamMembers(): void {
    this.teamsService.getTeamMembers().subscribe({
      next: (res: any) => {
        this.teamMembers = res.data?.members || [];
      },
      error: (err) => {
        console.error('Failed to load team members:', err);
      }
    });
  }

  checkPermissionsAndLoadData() {
    const projectId = this.router.snapshot.paramMap.get('id');
    const currentUser = JSON.parse(localStorage.getItem('user') || localStorage.getItem('developerProfile') || '{}');
    this.currentUser = currentUser;

    if (projectId) {
      this.isLoading = true;
      
      this.taskService.getAllTasks(projectId).subscribe({
        next: (res: any) => {
          this.tasks = res.tasks;
          this.isLoading = false;

          // 1. استخراج الـ Owner ID من الداتا اللي راجعة من الباك إند
          const projectOwnerId = res.projectOwnerId; 
          
          // 2. هل اليوزر الحالي هو صاحب المشروع؟
          this.isOwner = (currentUser._id === projectOwnerId || currentUser.id === projectOwnerId);
          this.isAdmin = currentUser.role === 'admin';

          // 3. ندور في تيمات اليوزر عن التيم اللي "المدير" بتاعه هو صاحب المشروع ده
          const userTeamMembership = currentUser.teams?.find((t: any) => t.adminId === projectOwnerId);

          // --- ⚡ توزيع الصلاحيات الصارم ⚡ ---
          this.canEditProject = this.isOwner || this.isAdmin;

          // canManage تبقى true في حالتين بس:
          // إما إنه المالك (Owner)
          // أو ديفلوبر مضاف ومعاه TRUE في الـ canManageTasks
          this.canManage = this.isOwner || this.isAdmin || (userTeamMembership && userTeamMembership.permissions?.canManageTasks === true);

          // canSeeFinancials تبقى true في حالتين بس:
          // إما إنه المالك (Owner)
          // أو ديفلوبر مضاف ومعاه TRUE في الـ canSeeFinancials
          this.canSeeFinancials = this.isOwner || this.isAdmin || (userTeamMembership && userTeamMembership.permissions?.canSeeFinancials === true);

          // تنفيذ الطلبات بناءً على النتيجة الجديدة
          if (this.canSeeFinancials) {
            this.getAllFinancials();
          }

          this.loadTasksStatus(projectId);
          this.loadProjectDetails(projectId, currentUser);
        },
        error: (err) => {
          this.isLoading = false;
          this.toaster.error('Error loading project');
        }
      });
    }
  }

  loadProjectDetails(projectId: string, currentUser: any) {
    this.projectService.getAllProjects(1, 100).subscribe({
      next: (res: any) => {
        const list = res.Projects || [];
        const found = list.find((p: any) => p._id === projectId);
        if (found) {
          this.project = found;
        } else {
          // Check completed/archived projects as fallback
          this.projectService.getCompletedProjects(1).subscribe({
            next: (resComp: any) => {
              const listComp = resComp.Projects || [];
              const foundComp = listComp.find((p: any) => p._id === projectId);
              if (foundComp) {
                this.project = foundComp;
              }
            }
          });
        }
      }
    });
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

  // Project editing methods
  openEditProjectModal() {
    if (!this.canEditProject || !this.project) return;
    this.editProjectForm.setValue({
      name: this.project.name || '',
      clientName: this.project.clientName || '',
      hourlyRate: this.project.hourlyRate || 0,
      description: this.project.description || '',
      status: this.project.status || 'active'
    });
    this.showEditProjectModal = true;
  }

  closeEditProjectModal() {
    this.showEditProjectModal = false;
  }

  submitEditProject() {
    if (this.editProjectForm.invalid || !this.project) return;
    this.isLoading = true;
    this.projectService.updateProject(this.project._id, this.editProjectForm.value).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.showEditProjectModal = false;
        this.showToast('success', 'Project details updated');
        this.checkPermissionsAndLoadData();
      },
      error: (err) => {
        this.isLoading = false;
        this.toaster.error(err.message || 'Failed to update project');
      }
    });
  }

  // Task editing methods
  openEditTaskModal(task: any) {
    this.selectedTask = task;
    
    // Set form values
    let formattedDeadline = '';
    if (task.deadline) {
      formattedDeadline = new Date(task.deadline).toISOString().split('T')[0];
    }
    
    // Get assigned developer ID
    let assignedDevId = '';
    if (task.assignedTo) {
      assignedDevId = typeof task.assignedTo === 'object' ? task.assignedTo._id : task.assignedTo;
    }

    this.editTaskForm.setValue({
      title: task.title || '',
      estimatedHours: task.estimatedHours || 0,
      deadline: formattedDeadline,
      assignedTo: assignedDevId || '',
      status: task.status || 'todo',
      progress: task.progress || 0
    });

    // Reset controls state
    this.editTaskForm.enable();

    // Role/Permission-based control disabling
    const currentUser = JSON.parse(localStorage.getItem('user') || localStorage.getItem('developerProfile') || '{}');
    const isOwnerOrAdmin = this.isOwner || this.isAdmin;
    const canManageTasks = this.canManage;
    const isAssigned = (assignedDevId === currentUser._id || assignedDevId === currentUser.id);

    if (!isOwnerOrAdmin && !canManageTasks) {
      if (isAssigned) {
        // Restricted access: only status and progress allowed
        this.editTaskForm.get('title')?.disable();
        this.editTaskForm.get('estimatedHours')?.disable();
        this.editTaskForm.get('deadline')?.disable();
        this.editTaskForm.get('assignedTo')?.disable();
      } else {
        // No access/read-only
        this.editTaskForm.disable();
      }
    }

    this.showEditTaskModal = true;
  }

  closeEditTaskModal() {
    this.showEditTaskModal = false;
    this.selectedTask = null;
  }

  submitEditTask() {
    const projectId = this.router.snapshot.paramMap.get('id');
    if (!projectId || !this.selectedTask) return;

    this.isLoading = true;
    const payload = this.editTaskForm.value;

    this.taskService.updateTask(projectId, this.selectedTask._id, payload).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.showEditTaskModal = false;
        this.showToast('success', 'Task successfully updated');
        this.checkPermissionsAndLoadData();
      },
      error: (err: any) => {
        this.isLoading = false;
        this.toaster.error(err.error?.message || 'Failed to update task');
      }
    });
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