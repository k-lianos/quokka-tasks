import { inject } from '@angular/core';
import { Router, type CanActivateFn, type Routes } from '@angular/router';
import { isValidDate, startOfWeek } from '../domain/dates';
import { todayView, viewUrl } from '../domain/views';
import { DayPage } from './day-page';
import { TasksStore } from './tasks.store';
import { WeekPage } from './week-page';

// Hash URLs (see app.config.ts): #/day/2026-11-26, #/week/2026-11-23.

/** Call only inside an injection context (guards, redirect functions). */
const todayUrl = (kind: 'day' | 'week'): string => viewUrl(todayView(kind, inject(TasksStore).today()));

/** An invalid date goes to today's day. */
const validDay: CanActivateFn = (route) =>
  isValidDate(route.paramMap.get('date') ?? '') || inject(Router).parseUrl(todayUrl('day'));

/** An invalid date goes to this week; any other day goes to the Monday of its week. */
const validWeek: CanActivateFn = (route) => {
  const router = inject(Router);
  const param = route.paramMap.get('weekStart') ?? '';
  if (!isValidDate(param)) return router.parseUrl(todayUrl('week'));
  const monday = startOfWeek(param);
  return monday === param || router.parseUrl(viewUrl({ kind: 'week', weekStart: monday }));
};

export const routes: Routes = [
  { path: 'day/:date', component: DayPage, canActivate: [validDay] },
  { path: 'week/:weekStart', component: WeekPage, canActivate: [validWeek] },
  // The app opens on today's Day view; anything unknown goes there too.
  { path: '**', redirectTo: () => todayUrl('day') },
];
