import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DeveloperService } from 'src/app/core/services/developer.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-developersettings',
  templateUrl: './developersettings.component.html',
  styleUrls: ['./developersettings.component.scss']
})
export class DevelopersettingsComponent implements OnInit {
  formData: FormGroup;
  developer: any;
  developermail: any

  constructor(
    private developerService: DeveloperService, 
    private fb: FormBuilder
  ) {
    // بناء الفورم بالـ Validation المطلوب في السكيما
    this.formData = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]]
    });
  }

  ngOnInit(): void {
   this.developermail = localStorage.getItem('email')
  }

  updateUserName() {
    if (this.formData.valid) {
      const name = this.formData.value; // ده بيبعت { name: 'value' } زي ما الباك إند مستني
      
      this.developerService.changeUserName(name).subscribe({
        next: (res: any) => {
          this.developer = res.developer;
          localStorage.setItem('userName', res.developer.name)
          
          // النجاح - SweetAlert Toast
          const Toast = Swal.mixin({
            toast: true,
            position: 'bottom-end',
            showConfirmButton: false,
            timer: 2500,
            background: '#10b981', // لون أخضر برودكشن شيك
            color: '#fff',
            iconColor: '#fff'
          });

          Toast.fire({
            icon: 'success',
            title: 'Name updated successfully'
          });
        },
        error: (err) => {
          // التعامل مع الأخطاء
          Swal.fire({
            icon: 'error',
            title: 'Update Failed',
            text: err.error?.message || 'Something went wrong!',
            background: '#1f2937',
            color: '#fff'
          });
        }
      });
    } else {
      this.formData.markAllAsTouched(); // تلوين الحقول لو فاضية
    }
  }
}