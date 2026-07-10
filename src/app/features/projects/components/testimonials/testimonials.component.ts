import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChildren,
  QueryList
} from '@angular/core';
import { gsap } from 'gsap';

export interface Testimonial {
  name: string;
  role: string;
  company: string;
  avatar: string;
  content: string;
  rating: number;
}

@Component({
  selector: 'app-testimonials',
  templateUrl: './testimonials.component.html',
  styleUrls: ['./testimonials.component.scss']
})
export class TestimonialsComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChildren('column') columnRefs!: QueryList<ElementRef<HTMLElement>>;

  // Column durations in seconds (different = dynamic feel)
  private durations = [22, 28, 25];
  private tweens: gsap.core.Tween[] = [];

  readonly allTestimonials: Testimonial[] = [
    {
      name: 'Briana Patton',
      role: 'Senior Engineer',
      company: 'Stripe',
      avatar: 'BP',
      content: 'DevTrack completely changed how I manage my sprints. The analytics dashboard gives me insights I never had before — I shipped 30% faster last quarter.',
      rating: 5
    },
    {
      name: 'Bilal Ahmed',
      role: 'Fullstack Developer',
      company: 'Shopify',
      avatar: 'BA',
      content: 'The project tracking is seamlessly integrated with my Git workflow. I open DevTrack every morning before I touch a single line of code.',
      rating: 5
    },
    {
      name: 'Sarah Kim',
      role: 'Lead Developer',
      company: 'Vercel',
      avatar: 'SK',
      content: 'Finally a tool that understands how developers actually work. The burnout alerts saved me from overcommitting twice already. Genuinely impressive.',
      rating: 5
    },
    {
      name: 'Marcus Chen',
      role: 'CTO',
      company: 'StartupHub',
      avatar: 'MC',
      content: 'We rolled this out across our entire engineering org. Onboarding took under an hour and our velocity reporting has never been more accurate.',
      rating: 5
    },
    {
      name: 'Elena Vasquez',
      role: 'DevOps Engineer',
      company: 'AWS',
      avatar: 'EV',
      content: 'The scope creep detection is worth the subscription price alone. DevTrack caught a feature bloat issue in week two that would have delayed our launch.',
      rating: 5
    },
    {
      name: 'James Okafor',
      role: 'Software Architect',
      company: 'Microsoft',
      avatar: 'JO',
      content: 'I\'ve tried six different tracking tools. DevTrack is the only one I\'ve kept using after the free trial. The glassmorphism UI is just chef\'s kiss.',
      rating: 5
    },
    {
      name: 'Priya Nair',
      role: 'Mobile Developer',
      company: 'Airbnb',
      avatar: 'PN',
      content: 'Team insights are a game-changer for our distributed team across 4 timezones. Stand-ups are shorter, blockers surface faster. 10/10.',
      rating: 5
    },
    {
      name: 'Tom Fischer',
      role: 'Backend Engineer',
      company: 'Netflix',
      avatar: 'TF',
      content: 'The hourly rate tracker integrated with Jira and I finally stopped leaving money on the table. Recovered $2,400 in unbilled hours the first month.',
      rating: 5
    },
    {
      name: 'Amara Diallo',
      role: 'Freelance Developer',
      company: 'Independent',
      avatar: 'AD',
      content: 'As a solo freelancer this replaces three separate apps — time tracking, invoicing notes, and project management. Incredible product.',
      rating: 5
    }
  ];

  // Split into 3 columns in a round-robin pattern
  get column1(): Testimonial[] { return this.allTestimonials.filter((_, i) => i % 3 === 0); }
  get column2(): Testimonial[] { return this.allTestimonials.filter((_, i) => i % 3 === 1); }
  get column3(): Testimonial[] { return this.allTestimonials.filter((_, i) => i % 3 === 2); }

  // Duplicated arrays feed the infinite scroll (real items + clone)
  get col1Items(): Testimonial[] { return [...this.column1, ...this.column1]; }
  get col2Items(): Testimonial[] { return [...this.column2, ...this.column2]; }
  get col3Items(): Testimonial[] { return [...this.column3, ...this.column3]; }

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    // Small defer so the DOM has measured correctly
    setTimeout(() => this.initScrollAnimations(), 80);
  }

  private initScrollAnimations(): void {
    this.columnRefs.forEach((colRef, idx) => {
      const el = colRef.nativeElement;
      // Height of the first half (the real set) — scroll exactly that far then loop
      const halfH = el.scrollHeight / 2;

      const tween = gsap.fromTo(
        el,
        { y: 0 },
        {
          y: -halfH,
          duration: this.durations[idx],
          ease: 'none',
          repeat: -1,   // infinite
          repeatDelay: 0
        }
      );

      this.tweens.push(tween);
    });
  }

  getStars(rating: number): number[] {
    return Array(rating).fill(0);
  }

  ngOnDestroy(): void {
    this.tweens.forEach(t => t.kill());
  }
}
