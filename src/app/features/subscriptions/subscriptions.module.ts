import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';



import { SubscriptionsRoutingModule } from './subscriptions-routing.module';
import { PricingComponent } from './pages/pricing/pricing.component';
import { PaymentSuccessComponent } from './pages/payment-success/payment-success.component';
import { PaymobIframeComponent } from './pages/paymob-iframe/paymob-iframe.component';
// If you're using forms in pricing component, import FormsModule/ReactiveFormsModule here

@NgModule({
  declarations: [
    PricingComponent,
    PaymentSuccessComponent,
    PaymobIframeComponent
  ],
  imports: [
    CommonModule,
    SubscriptionsRoutingModule
  ]
})
export class SubscriptionsModule { }
