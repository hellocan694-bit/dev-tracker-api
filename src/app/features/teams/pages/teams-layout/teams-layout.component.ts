import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FooterComponent } from 'src/app/shared/components/footer/footer.component';
import { NavbarComponent } from 'src/app/shared/components/navbar/navbar.component';
import { SidebarComponent } from 'src/app/shared/components/sidebar/sidebar.component';

@Component({
  selector: 'app-teams-layout',
  templateUrl: './teams-layout.component.html',
  standalone: true,
  imports: [NavbarComponent, RouterOutlet , SidebarComponent , FooterComponent],
  styleUrls: ['./teams-layout.component.scss']
})
export class TeamsLayoutComponent {

}
