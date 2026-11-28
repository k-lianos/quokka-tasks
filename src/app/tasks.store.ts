import { Injectable, signal } from '@angular/core';
import { todayLocal } from '../domain/dates';
import { rollover } from '../domain/rollover';
import { sinkCompleted } from '../domain/tickets';
import type { Ticket } from '../shared/types';

const DATE_CHECK_MS = 60_000;

/** Single source of truth for tickets in the UI. Every change enforces rollover and the completed-at-bottom order and saves the whole file. */
@Injectable({ providedIn: 'root' })
export class TasksStore {
    private readonly _loaded = signal(false);
    private readonly _tickets = signal<Ticket[]>([]);
    private readonly _today = signal(todayLocal());
    private readonly _notice = signal<string | null>(null);
    private readonly _saveError = signal(false);
    private readonly _loadError = signal<string | null>(null);

    readonly loaded = this._loaded.asReadonly();
    readonly tickets = this._tickets.asReadonly();
    readonly today = this._today.asReadonly();
    readonly notice = this._notice.asReadonly();
    readonly saveError = this._saveError.asReadonly();
    /** Set when the data file exists but could not be read; nothing is saved in that state. */
    readonly loadError = this._loadError.asReadonly();

    async init(): Promise<void> {
        let result;
        try {
            result = await window.api.load();
        } catch (e) {
            this._loadError.set(
                `Couldn't read your data file (${e instanceof Error ? e.message : String(e)}). Nothing will be saved until this is fixed.`,
            );
            return;
        }
        this._notice.set(result.notice);
        const loaded = result.data.tickets;
        const rolled = sinkCompleted(rollover(loaded, this._today(), new Date().toISOString()));
        this._tickets.set(rolled);
        this._loaded.set(true);
        if (rolled !== loaded) await this.persist();

        setInterval(() => this.checkDate(), DATE_CHECK_MS);
        window.addEventListener('focus', () => this.checkDate());
    }

    async change(fn: (tickets: Ticket[]) => Ticket[]): Promise<void> {
        if (!this._loaded()) return;
        const before = this._tickets();
        const next = sinkCompleted(rollover(fn(before), this._today(), new Date().toISOString()));
        if (next === before) return;
        this._tickets.set(next);
        await this.persist();
    }

    dismissNotice(): void {
        this._notice.set(null);
    }

    private checkDate(): void {
        const now = todayLocal();
        if (now === this._today()) return;
        this._today.set(now);
        void this.change(t => t);
    }

    private async persist(): Promise<void> {
        try {
            await window.api.save({ version: 3, tickets: this._tickets() });
            this._saveError.set(false);
        } catch {
            this._saveError.set(true);
        }
    }
}
