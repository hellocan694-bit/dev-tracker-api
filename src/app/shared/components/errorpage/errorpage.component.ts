import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-errorpage',
  templateUrl: './errorpage.component.html',
  styleUrls: ['./errorpage.component.scss']
})
export class ErrorpageComponent {
  constructor(private router:Router){}
  gotoDashboard(){
    this.router.navigate(['home/masterhome'])
  }
}
