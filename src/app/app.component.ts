import { Component, OnInit } from '@angular/core';
import { SocketService } from './core/services/socket.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'dev-tracker-web';

  constructor(private socketService: SocketService) { }

  ngOnInit(): void {
    if (localStorage.getItem('token')) {
      this.socketService.connect();
    }
  }
}
