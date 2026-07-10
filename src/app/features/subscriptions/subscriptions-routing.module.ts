import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PricingComponent } from './pages/pricing/pricing.component';
import { PaymobIframeComponent } from './pages/paymob-iframe/paymob-iframe.component';
import { PaymentSuccessComponent } from './pages/payment-success/payment-success.component';

const routes: Routes = [
  { path: 'pricing', component: PricingComponent },
  { path: 'paymob-checkout', component: PaymobIframeComponent },
  { path: 'success', component: PaymentSuccessComponent },
  { path: '', redirectTo: 'pricing', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SubscriptionsRoutingModule { }
