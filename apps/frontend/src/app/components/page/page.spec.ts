import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PageComponent } from './page';

describe('PageComponent', () => {
  let fixture: ComponentFixture<PageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PageComponent);
  });

  describe('titleMenu (ST-1065)', () => {
    it('is a plain title without the caret by default', () => {
      fixture.componentRef.setInput('title', 'Familien Dahl');
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('.page-title-menu'))).toBeNull();
      expect(fixture.debugElement.query(By.css('.page-title-caret'))).toBeNull();
    });

    it('makes the title a button with the caret, and a tap emits titleMenuOpen', () => {
      fixture.componentRef.setInput('title', 'Familien Dahl');
      fixture.componentRef.setInput('titleMenu', true);
      fixture.detectChanges();
      let opened = 0;
      fixture.componentInstance.titleMenuOpen.subscribe(() => opened++);

      const button = fixture.debugElement.query(By.css('h1.page-title .page-title-menu'));
      expect(button.nativeElement.textContent).toContain('Familien Dahl');
      expect(fixture.debugElement.query(By.css('.page-title-caret'))).toBeTruthy();

      button.nativeElement.click();
      expect(opened).toBe(1);
    });

    it('keeps the last household-name word with the caret', () => {
      fixture.componentRef.setInput('title', 'Hytta på Geilo og Familien Dahl-Pettersen');
      fixture.componentRef.setInput('titleMenu', true);
      fixture.detectChanges();

      const button = fixture.debugElement.query(By.css('h1.page-title .page-title-menu'));
      const last = button.query(By.css('.page-title-last'));
      expect(last).toBeTruthy();
      expect(last.nativeElement.textContent).toMatch(/^Dahl-Pettersen/);
      expect(last.query(By.css('.page-title-caret'))).toBeTruthy();
      expect(button.nativeElement.textContent).toContain(
        'Hytta på Geilo og Familien Dahl-Pettersen',
      );
    });
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

    it('should render subtitle on the page surface, not in the gradient header', () => {
      fixture.componentRef.setInput('title', 'Title');
      fixture.componentRef.setInput('subtitle', 'Subtitle text');
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('.page-content .page-subtitle'))).toBeTruthy();
      expect(fixture.debugElement.query(By.css('.page-header .page-subtitle'))).toBeNull();
    });

    it('should not render subtitle when header is hidden', () => {
      fixture.componentRef.setInput('title', 'Title');
      fixture.componentRef.setInput('subtitle', 'Subtitle text');
      fixture.componentRef.setInput('showHeader', false);
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('.page-subtitle'))).toBeNull();
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

  describe('band input (A, the yellow top)', () => {
    it('should keep the plain title row when band is off', () => {
      fixture.componentRef.setInput('title', 'Title');
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('.page-header--band'))).toBeNull();
      expect(fixture.debugElement.query(By.css('.page-band'))).toBeNull();
    });

    it('should put the title row and the sub-line on the band', () => {
      fixture.componentRef.setInput('title', 'Hjemme');
      fixture.componentRef.setInput('subtitle', 'mandag 12. oktober – 2 av 7 gjort');
      fixture.componentRef.setInput('band', true);
      fixture.detectChanges();

      const header = fixture.debugElement.query(By.css('header.page-header--band'));
      expect(header).toBeTruthy();
      expect(header.query(By.css('.page-title')).nativeElement.textContent).toBe('Hjemme');
      expect(header.query(By.css('.page-band .page-subtitle')).nativeElement.textContent).toBe(
        'mandag 12. oktober – 2 av 7 gjort',
      );
      expect(fixture.debugElement.query(By.css('.page-content .page-subtitle'))).toBeNull();
    });

    it('should keep the h1 as the only heading on the band', () => {
      fixture.componentRef.setInput('title', 'Oppgaver');
      fixture.componentRef.setInput('band', true);
      fixture.detectChanges();

      expect(fixture.debugElement.queryAll(By.css('.page-header--band h1')).length).toBe(1);
    });
  });
});
