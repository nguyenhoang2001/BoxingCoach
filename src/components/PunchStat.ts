// /Users/minhhoang/Documents/projects/BoxingCoach/src/components/PunchStat.ts
// Logic-only class extracted from StatContainer.
// Usage: StatContainer should import PunchStat and delegate logic/updates to an instance of this class.

export type PunchType = 'jab' | 'cross' | 'hook' | 'uppercut' | string;

export interface Punch {
    id: string;
    type: PunchType;
    timestamp: number; // ms since epoch
    hit: boolean;
    power?: number; // 0..100
    speed?: number; // any unit
    [key: string]: any;
}

export interface PunchStats {
    total: number;
    hits: number;
    misses: number;
    accuracy: number; // 0..100
    avgPower: number | null;
    avgSpeed: number | null;
    byType: Record<string, { total: number; hits: number; misses: number; accuracy: number }>;
}

export interface PunchStatOptions {
    initialPunches?: Punch[];
    computeOnInit?: boolean;
}

/**
 * PunchStat
 * - Keeps internal punches list and derived stats.
 * - Not tied to React; exposes a simple subscribe API for containers/components to react to changes.
 *
 * Methods:
 * - addPunch / addPunches
 * - updatePunch
 * - removePunch / clear
 * - getPunches / getStats
 * - subscribe(listener) / unsubscribe(listener)
 */
export default class PunchStat {
    private punches: Punch[] = [];
    private stats: PunchStats = PunchStat.emptyStats();
    private listeners: Array<(stats: PunchStats, punches: Punch[]) => void> = [];

    constructor(options?: PunchStatOptions) {
        if (options?.initialPunches) {
            this.punches = [...options.initialPunches];
        }
        if (options?.computeOnInit ?? true) {
            this.recompute();
        }
    }

    // Public getters
    getPunches(): Punch[] {
        return [...this.punches];
    }

    getStats(): PunchStats {
        return { ...this.stats, byType: { ...(this.stats.byType || {}) } };
    }

    // Mutations
    addPunch(p: Punch): void {
        this.punches.push(p);
        this.recomputeAndNotify();
    }

    addPunches(ps: Punch[]): void {
        if (ps.length === 0) return;
        this.punches.push(...ps);
        this.recomputeAndNotify();
    }

    updatePunch(id: string, patch: Partial<Punch>): boolean {
        const idx = this.punches.findIndex(p => p.id === id);
        if (idx === -1) return false;
        this.punches[idx] = { ...this.punches[idx], ...patch };
        this.recomputeAndNotify();
        return true;
    }

    removePunch(id: string): boolean {
        const idx = this.punches.findIndex(p => p.id === id);
        if (idx === -1) return false;
        this.punches.splice(idx, 1);
        this.recomputeAndNotify();
        return true;
    }

    clear(): void {
        this.punches = [];
        this.recomputeAndNotify();
    }

    replaceAll(punches: Punch[]): void {
        this.punches = [...punches];
        this.recomputeAndNotify();
    }

    // Subscribe API for containers/components
    subscribe(listener: (stats: PunchStats, punches: Punch[]) => void): () => void {
        this.listeners.push(listener);
        // call immediately with current state
        listener(this.getStats(), this.getPunches());
        return () => this.unsubscribe(listener);
    }

    unsubscribe(listener: (stats: PunchStats, punches: Punch[]) => void): void {
        this.listeners = this.listeners.filter(l => l !== listener);
    }

    // Internal helpers
    private recomputeAndNotify(): void {
        this.recompute();
        this.notify();
    }

    private recompute(): void {
        this.stats = PunchStat.computeStats(this.punches);
    }

    private notify(): void {
        const s = this.getStats();
        const p = this.getPunches();
        for (const l of this.listeners) {
            try {
                l(s, p);
            } catch (e) {
                // swallow listener errors to avoid breaking flow
                // container should handle its own errors
                // eslint-disable-next-line no-console
                console.error('PunchStat listener error', e);
            }
        }
    }

    // Static utilities
    static emptyStats(): PunchStats {
        return {
            total: 0,
            hits: 0,
            misses: 0,
            accuracy: 0,
            avgPower: null,
            avgSpeed: null,
            byType: {},
        };
    }

    static computeStats(punches: Punch[]): PunchStats {
        const total = punches.length;
        let hits = 0;
        let sumPower = 0;
        let cntPower = 0;
        let sumSpeed = 0;
        let cntSpeed = 0;
        const byType: Record<string, { total: number; hits: number; misses: number; accuracy: number }> = {};

        for (const p of punches) {
            if (!byType[p.type]) {
                byType[p.type] = { total: 0, hits: 0, misses: 0, accuracy: 0 };
            }
            const t = byType[p.type];
            t.total += 1;
            if (p.hit) {
                hits += 1;
                t.hits += 1;
            } else {
                t.misses += 1;
            }

            if (typeof p.power === 'number' && !Number.isNaN(p.power)) {
                sumPower += p.power;
                cntPower += 1;
            }
            if (typeof p.speed === 'number' && !Number.isNaN(p.speed)) {
                sumSpeed += p.speed;
                cntSpeed += 1;
            }
        }

        for (const k of Object.keys(byType)) {
            const t = byType[k];
            t.accuracy = t.total > 0 ? (t.hits / t.total) * 100 : 0;
        }

        const accuracy = total > 0 ? (hits / total) * 100 : 0;
        const avgPower = cntPower > 0 ? sumPower / cntPower : null;
        const avgSpeed = cntSpeed > 0 ? sumSpeed / cntSpeed : null;

        return {
            total,
            hits,
            misses: total - hits,
            accuracy,
            avgPower,
            avgSpeed,
            byType,
        };
    }
}