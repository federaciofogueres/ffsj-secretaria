import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';

export interface InscripcionDraftState {
  form: FormGroup;
  participantes: Set<string>;
  busquedasAsociados: Record<string, string>;
}

@Injectable({ providedIn: 'root' })
export class InscripcionDraftStateService {
  private readonly drafts = new Map<string, InscripcionDraftState>();

  getOrCreate(inscripcionId: string, create: () => InscripcionDraftState): InscripcionDraftState {
    const existing = this.drafts.get(inscripcionId);
    if (existing) {
      return existing;
    }

    const draft = create();
    this.drafts.set(inscripcionId, draft);
    return draft;
  }

  save(inscripcionId: string, draft: InscripcionDraftState): void {
    this.drafts.set(inscripcionId, draft);
  }

  clear(inscripcionId?: string): void {
    if (inscripcionId) {
      this.drafts.delete(inscripcionId);
      return;
    }

    this.drafts.clear();
  }
}
