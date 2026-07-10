import { Component, ChangeDetectionStrategy, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { gsap } from 'gsap';

export interface Task {
  id: string;
  title: string;
  priority: 'Low' | 'Medium' | 'High';
  dueDate: string;
  assignedMember: string;
  status: 'To-Do' | 'In-Progress' | 'Completed';
}

@Component({
  selector: 'app-task-management-master',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './task-management-master.component.html',
  styleUrls: ['./task-management-master.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskManagementMasterComponent implements AfterViewInit, OnDestroy {
  searchTerm = '';
  
  tasks: Task[] = [
    { id: '1', title: 'Design Landing Page', priority: 'High', dueDate: '2026-04-10', assignedMember: 'Alice', status: 'To-Do' },
    { id: '2', title: 'Setup CI/CD', priority: 'High', dueDate: '2026-04-12', assignedMember: 'Bob', status: 'In-Progress' },
    { id: '3', title: 'Fix Login Bug', priority: 'Medium', dueDate: '2026-04-05', assignedMember: 'Charlie', status: 'Completed' },
    { id: '4', title: 'Write Tests', priority: 'Low', dueDate: '2026-04-15', assignedMember: 'Diana', status: 'To-Do' },
    { id: '5', title: 'Optimize GSAP Animations', priority: 'Medium', dueDate: '2026-04-16', assignedMember: 'Eve', status: 'In-Progress' }
  ];

  private ctx!: gsap.Context;

  constructor(private cdr: ChangeDetectorRef) {}

  ngAfterViewInit() {
    this.ctx = gsap.context(() => {
      gsap.from('.task-card', {
        y: 40,
        opacity: 0,
        stagger: 0.1,
        duration: 0.5,
        ease: 'power3.out',
        clearProps: 'all'
      });
    });
  }

  ngOnDestroy() {
    if (this.ctx) {
      this.ctx.revert();
    }
  }

  get filteredTasks() {
    if (!this.searchTerm) {
      return this.tasks;
    }
    const lowerTerm = this.searchTerm.toLowerCase();
    return this.tasks.filter(t => 
      t.title.toLowerCase().includes(lowerTerm) || 
      t.assignedMember.toLowerCase().includes(lowerTerm)
    );
  }

  getTasksByStatus(status: Task['status']) {
    return this.filteredTasks.filter(t => t.status === status);
  }

  moveTask(task: Task, newStatus: Task['status'], event: Event) {
    const card = (event.target as HTMLElement).closest('.task-card');
    if (card) {
      gsap.to(card, {
        scale: 0.9,
        opacity: 0,
        duration: 0.3,
        onComplete: () => {
          task.status = newStatus;
          this.cdr.markForCheck();
        }
      });
    } else {
      task.status = newStatus;
      this.cdr.markForCheck();
    }
  }

  deleteTask(task: Task, event: Event) {
    const card = (event.target as HTMLElement).closest('.task-card');
    if (card) {
      gsap.to(card, {
        x: 50,
        opacity: 0,
        duration: 0.3,
        onComplete: () => {
          this.tasks = this.tasks.filter(t => t.id !== task.id);
          this.cdr.markForCheck();
        }
      });
    } else {
      this.tasks = this.tasks.filter(t => t.id !== task.id);
      this.cdr.markForCheck();
    }
  }

  editTask(task: Task) {
    // Placeholder edit logic
  }

  onHoverIn(event: MouseEvent) {
    gsap.to(event.currentTarget, { 
      scale: 1.02, 
      boxShadow: '0 8px 25px rgba(0, 195, 255, 0.2)', 
      duration: 0.3, 
      ease: 'power2.out' 
    });
  }

  onHoverOut(event: MouseEvent) {
    gsap.to(event.currentTarget, { 
      scale: 1, 
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)', 
      duration: 0.3, 
      ease: 'power2.inOut' 
    });
  }

  trackByTaskId(index: number, task: Task): string {
    return task.id;
  }

  getPriorityClass(priority: string): string {
    switch(priority) {
      case 'High': return 'bg-danger text-white';
      case 'Medium': return 'bg-warning text-dark';
      case 'Low': return 'bg-info text-dark';
      default: return 'bg-secondary text-white';
    }
  }
}
