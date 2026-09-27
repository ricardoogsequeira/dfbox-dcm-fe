import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../environments/environment';
import { HomePageComponent } from './home-page.component';

describe('HomePageComponent', () => {
  it('creates the dashboard shell and loads empty operational data', () => {
    TestBed.configureTestingModule({
      imports: [HomePageComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });

    const fixture = TestBed.createComponent(HomePageComponent);
    const http = TestBed.inject(HttpTestingController);

    http.expectOne(`${environment.apiBaseUrl}/health`).flush({
      status: 'ok',
      service: 'dfbox-dcm-be',
      timestamp: '2026-09-20T00:00:00Z',
    });
    http.expectOne(`${environment.apiBaseUrl}/projects`).flush([]);
    http.expectOne(`${environment.apiBaseUrl}/resources`).flush([]);
    http.expectOne(`${environment.apiBaseUrl}/capacity/weeks`).flush([]);
    http.expectOne(`${environment.apiBaseUrl}/allocations`).flush([]);
    http.expectOne(`${environment.apiBaseUrl}/projects/dependencies`).flush([]);

    fixture.detectChanges();

    expect(fixture.componentInstance.dashboard()?.projects.length).toBe(0);
    expect(fixture.componentInstance.health()).toBe('available');
    http.verify();
  });
});
