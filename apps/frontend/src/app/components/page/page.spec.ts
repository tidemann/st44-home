import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PageComponent } from './page';

describe('PageComponent', () => {
  let component: PageComponent;
  let fixture: ComponentFixture<PageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PageComponent);
    component = fixture.componentInstance;
  });

  describe('title input', () => {
    it('should display the title in the header', () => {
      fixture.componentRef.setInput('title', 'Test Title');
      fixture.detectChanges();

      const title = fixture.debugElement.query(By.css('.page-title'));
      expect(title.nativeElement.textContent).toBe('Test Title');
    });

    it('should use h1 element for title', () => {
      fixture.componentRef.setInput('title', 'Title');
      fixture.detectChanges();

      const h1 = fixture.debugElement.query(By.css('h1.page-title'));
      expect(h1).toBeTruthy();
    });
  });

  describe('subtitle input', () => {
    it('should display subtitle when provided', () => {
      fixture.componentRef.setInput('title', 'Title');
      fixture.componentRef.setInput('subtitle', 'Subtitle text');
      fixture.detectChanges();

      const subtitle = fixture.debugElement.query(By.css('.page-subtitle'));
      expect(subtitle).toBeTruthy();
      expect(subtitle.nativeElement.textContent).toBe('Subtitle text');
    });

    it('should not render subtitle element when not provided', () => {
      fixture.componentRef.setInput('title', 'Title');
      fixture.detectChanges();

      const subtitle = fixture.debugElement.query(By.css('.page-subtitle'));
      expect(subtitle).toBeNull();
    });
  });

  describe('showGradient input', () => {
    it('should apply gradient class when true (default)', () => {
      fixture.componentRef.setInput('title', 'Title');
      fixture.componentRef.setInput('showGradient', true);
      fixture.detectChanges();

      const header = fixture.debugElement.query(By.css('.page-header'));
      expect(header.nativeElement.classList.contains('page-header--gradient')).toBe(true);
      expect(header.nativeElement.classList.contains('page-header--plain')).toBe(false);
    });

    it('should apply plain class when false', () => {
      fixture.componentRef.setInput('title', 'Title');
      fixture.componentRef.setInput('showGradient', false);
      fixture.detectChanges();

      const header = fixture.debugElement.query(By.css('.page-header'));
      expect(header.nativeElement.classList.contains('page-header--plain')).toBe(true);
      expect(header.nativeElement.classList.contains('page-header--gradient')).toBe(false);
    });
  });

  describe('maxWidth input', () => {
    it('should apply narrow width class', () => {
      fixture.componentRef.setInput('title', 'Title');
      fixture.componentRef.setInput('maxWidth', 'narrow');
      fixture.detectChanges();

      const page = fixture.debugElement.query(By.css('.page'));
      expect(page.nativeElement.classList.contains('page-container--narrow')).toBe(true);
    });

    it('should apply medium width class (default)', () => {
      fixture.componentRef.setInput('title', 'Title');
      fixture.detectChanges();

      const page = fixture.debugElement.query(By.css('.page'));
      expect(page.nativeElement.classList.contains('page-container--medium')).toBe(true);
    });

    it('should apply wide width class', () => {
      fixture.componentRef.setInput('title', 'Title');
      fixture.componentRef.setInput('maxWidth', 'wide');
      fixture.detectChanges();

      const page = fixture.debugElement.query(By.css('.page'));
      expect(page.nativeElement.classList.contains('page-container--wide')).toBe(true);
    });
  });

  describe('showHeader input', () => {
    it('should show header when true (default)', () => {
      fixture.componentRef.setInput('title', 'Title');
      fixture.componentRef.setInput('showHeader', true);
      fixture.detectChanges();

      const header = fixture.debugElement.query(By.css('.page-header'));
      expect(header).toBeTruthy();
    });

    it('should hide header when false', () => {
      fixture.componentRef.setInput('title', 'Title');
      fixture.componentRef.setInput('showHeader', false);
      fixture.detectChanges();

      const header = fixture.debugElement.query(By.css('.page-header'));
      expect(header).toBeNull();
    });
  });

  describe('accessibility', () => {
    it('should use semantic h1 for page title', () => {
      fixture.componentRef.setInput('title', 'Accessible Title');
      fixture.detectChanges();

      const h1 = fixture.debugElement.query(By.css('h1'));
      expect(h1).toBeTruthy();
      expect(h1.nativeElement.textContent).toBe('Accessible Title');
    });

    it('should use main element for content area', () => {
      fixture.componentRef.setInput('title', 'Title');
      fixture.detectChanges();

      const main = fixture.debugElement.query(By.css('main.page-content'));
      expect(main).toBeTruthy();
    });

    it('should use header element for header area', () => {
      fixture.componentRef.setInput('title', 'Title');
      fixture.detectChanges();

      const header = fixture.debugElement.query(By.css('header.page-header'));
      expect(header).toBeTruthy();
    });
  });

  describe('page structure', () => {
    it('should have page container as root element', () => {
      fixture.componentRef.setInput('title', 'Title');
      fixture.detectChanges();

      const page = fixture.debugElement.query(By.css('.page'));
      expect(page).toBeTruthy();
    });

    it('should have header actions container', () => {
      fixture.componentRef.setInput('title', 'Title');
      fixture.detectChanges();

      const actions = fixture.debugElement.query(By.css('.page-header-actions'));
      expect(actions).toBeTruthy();
    });

    it('should have content area even without header', () => {
      fixture.componentRef.setInput('title', 'Title');
      fixture.componentRef.setInput('showHeader', false);
      fixture.detectChanges();

      const content = fixture.debugElement.query(By.css('.page-content'));
      expect(content).toBeTruthy();
    });
  });
});
