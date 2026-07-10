import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';
import { environment } from '../../../environment/environment';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket | undefined;

  constructor() {}

  connect() {
    // Guard: don't create duplicate connections
    if (this.socket?.connected) return;
    this.socket?.disconnect();

    // withCredentials forwards the HttpOnly cookie automatically.
    // No manual token read from localStorage needed.
    this.socket = io(environment.socketUrl, {
      withCredentials: true,
      // Force WebSocket transport — skips XHR polling entirely,
      // which is the root cause of all the CORS preflight errors.
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000
    });

    this.socket.on('connect', () => {
      console.log('Socket Connected');
    });

    this.socket.on('connect_error', (err) => {
      console.error('Socket Error:', err.message);
    });

    this.listenToEvents();
  }

  private listenToEvents() {
    this.socket?.on('new_invitation', (data: any) => {
      this.showNotification('info', 'New Invitation', data.message);
    });

    this.socket?.on('invitation_accepted', (data: any) => {
      this.showNotification('success', 'Team Update', data.message);
    });

    this.socket?.on('invitation_rejected', (data: any) => {
      this.showNotification('warning', 'Team Update', data.message);
    });

    this.socket?.on('removed_from_team', (data: any) => {
      this.showNotification('error', 'Team Update', data.message);
    });

    this.socket?.on('permissions_updated', (data: any) => {
      this.showNotification('info', 'Permissions Updated', data.message);
    });
  }

  /**
   * FIX #5 — WebSocket Memory Leak resolved.
   *
   * BEFORE: socket.on(eventName, handler) was registered but NEVER removed.
   * When a component unsubscribed from the returned Observable, the socket
   * listener kept running — accumulating more listeners on every component
   * re-creation until the app was refreshed.
   *
   * AFTER: The Observable's subscriber function returns a teardown callback.
   * RxJS calls this automatically when the Observable is unsubscribed from,
   * which calls socket.off(eventName, handler) to cleanly deregister the listener.
   */
  onEvent(eventName: string): Observable<any> {
    return new Observable(observer => {
      // Define the handler so we can reference it for cleanup
      const handler = (data: any) => observer.next(data);

      // Register the socket listener
      this.socket?.on(eventName, handler);

      // Return the teardown logic — RxJS calls this on unsubscribe
      return () => {
        this.socket?.off(eventName, handler);
      };
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = undefined;
    }
  }

  private showNotification(icon: any, title: string, text: string) {
    Swal.fire({
      toast: true,
      position: 'bottom-end',
      showConfirmButton: false,
      timer: 4000,
      timerProgressBar: true,
      icon: icon,
      title: title,
      text: text,
      background: 'rgba(15, 23, 42, 0.9)',
      color: '#fff',
      didOpen: (toast) => {
        toast.style.backdropFilter = 'blur(10px)';
        toast.style.borderRadius = '12px';
        toast.style.border = '1px solid rgba(255,255,255,0.1)';
        toast.style.marginBottom = '20px';
      }
    });
  }
}