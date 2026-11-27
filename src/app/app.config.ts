import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withHashLocation } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
        // Hash URLs: Electron loads the UI from file://, where path URLs break on reload.
        provideRouter(routes, withHashLocation(), withComponentInputBinding()),
    ],
};
