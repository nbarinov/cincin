import { Component } from '@angular/core';
import { Toaster, toast } from 'cincin-angular';
import { initFixture } from '../../shared/params';
import { createScenarios } from '../../shared/scenarios';

@Component({
  selector: 'app-root',
  imports: [Toaster],
  template: `
    <main>
      <h1>cincin e2e · angular</h1>

      @for (scenario of scenarios; track scenario.id) {
        <button
          type="button"
          [attr.data-testid]="scenario.id"
          (click)="scenario.run()"
        >
          {{ scenario.label }}
        </button>
      }

      <cincin-toaster [position]="position" />
    </main>
  `,
})
class App {
  readonly params = initFixture();
  readonly position = this.params.position;
  readonly scenarios = createScenarios(toast, {
    duration: this.params.duration,
  });
}

export { App };
