import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FfsjDialogAlertService, AlertButtonType } from 'ffsj-web-components';
import * as XLSX from 'xlsx';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { ErrorService } from '../core/error.service';
import { Asociado, AsociadosService, HistoricoAsociado } from './asociados.service';

type TabKey = 'adultos' | 'infantiles';

@Component({
  selector: 'app-asociados',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatTabsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatRippleModule,
    MatMenuModule,
    MatTooltipModule
  ],
  templateUrl: './asociados.component.html',
  styleUrls: ['./asociados.component.scss']
})
export class AsociadosComponent implements OnInit, AfterViewInit {
  readonly displayedColumns = ['nombre', 'cargo'];
  readonly tabs: { key: TabKey; label: string }[] = [
    { key: 'adultos', label: 'Adultos' },
    { key: 'infantiles', label: 'Infantiles' }
  ];

  dataSources: Record<TabKey, MatTableDataSource<Asociado>> = {
    adultos: new MatTableDataSource<Asociado>([]),
    infantiles: new MatTableDataSource<Asociado>([])
  };

  activeTab: TabKey = 'adultos';
  loading = false;
  error = '';

  @ViewChild('paginatorAdultos') paginatorAdultos!: MatPaginator;
  @ViewChild('paginatorInfantiles') paginatorInfantiles!: MatPaginator;
  @ViewChild('sortAdultos') sortAdultos!: MatSort;
  @ViewChild('sortInfantiles') sortInfantiles!: MatSort;

  constructor(
    private readonly asociadosService: AsociadosService,
    private readonly errorService: ErrorService,
    private readonly dialogService: FfsjDialogAlertService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    this.attachPaginator();
    this.attachSort();
  }

  loadData(): void {
    this.loading = true;
    this.error = '';
    this.asociadosService.getAdultos().subscribe({
      next: adultos => {
        this.dataSources.adultos.data = adultos;
        this.configureDataSource(this.dataSources.adultos);
        this.attachPaginator();
        this.attachSort();
      },
      error: () => this.handleLoadError()
    });

    this.asociadosService.getInfantiles().subscribe({
      next: infantiles => {
        this.dataSources.infantiles.data = infantiles;
        this.configureDataSource(this.dataSources.infantiles);
        this.attachPaginator();
        this.attachSort();
        this.loading = false;
      },
      error: () => this.handleLoadError()
    });
  }

  onTabChange(key: TabKey): void {
    this.activeTab = key;
    this.attachPaginator();
  }

  applyFilter(event: Event): void {
    const value = (event.target as HTMLInputElement).value ?? '';
    const normalized = this.normalizeSearchText([value.trim()]);
    const ds = this.dataSources[this.activeTab];
    ds.filter = normalized;
    if (ds.paginator) {
      ds.paginator.firstPage();
    }
  }

  openDetails(asociado: Asociado): void {
    this.asociadosService.getHistorico(asociado.id).subscribe({
      next: historico => this.openDetailsDialog(asociado, historico),
      error: () => {
        this.errorService.show('No se ha podido cargar el historico del asociado.');
        this.openDetailsDialog(asociado, []);
      }
    });
  }

  esBaja(asociado: Asociado): boolean {
    return String(asociado.estado || '').toLowerCase() === 'baja';
  }

  private openDetailsDialog(asociado: Asociado, historico: HistoricoAsociado[]): void {
    const rowCandidates: Array<[string, string]> = [
      ['Nombre', `${asociado.nombre} ${asociado.apellidos}`],
      ['Cargo', asociado.cargo ?? ''],
      ['Tipo', asociado.tipo === 'adulto' ? 'Adulto' : 'Infantil'],
      ['DNI/NIF', asociado.dni ?? ''],
      ['SIP', asociado.sip ?? ''],
      ['Estado', asociado.estado ?? ''],
      ['Fecha de alta', asociado.fechaAlta ?? ''],
      ['Fecha de nacimiento', asociado.fechaNacimiento ?? ''],
      ['Email', asociado.email ?? ''],
      ['Telefono', asociado.telefono ?? '']
    ];
    const rows = rowCandidates.filter(([, value]) => value);

    this.dialogService.openDialogAlert({
      title: 'Detalles del asociado',
      content: rows.map(([label, value]) => `${label}: ${value}`).join('\n'),
      innerHtml: `
        ${rows
          .map(
            ([label, value]) =>
              `<p><strong>${this.escapeHtml(label)}:</strong> ${this.escapeHtml(String(value))}</p>`
          )
          .join('')}
        ${this.buildHistoricoHtml(historico)}
      `,
      buttonsAlert: [AlertButtonType.Entendido]
    });
  }

  downloadExcel(): void {
    this.asociadosService
      .getTodos()
      .pipe(
        switchMap(data => {
          if (data.length === 0) {
            return of({ data, historicos: [] as Array<{ asociado: Asociado; historico: HistoricoAsociado[] }> });
          }

          return forkJoin(
            data.map(asociado =>
              this.asociadosService.getHistorico(asociado.id).pipe(
                map(historico => ({ asociado, historico })),
                catchError(() => of({ asociado, historico: [] as HistoricoAsociado[] }))
              )
            )
          ).pipe(map(historicos => ({ data, historicos })));
        })
      )
      .subscribe({
        next: ({ data, historicos }) => this.writeExcel(data, historicos),
        error: () => this.errorService.show('No se ha podido generar el Excel de asociados.')
      });
  }

  private configureDataSource(ds: MatTableDataSource<Asociado>): void {
    ds.filterPredicate = (data, filter) => {
      const full = this.normalizeSearchText([
        data.id,
        data.nombre,
        data.apellidos,
        data.cargo,
        data.dni,
        data.sip,
        data.email,
        data.telefono,
        data.estado
      ]);
      return full.includes(filter);
    };

    ds.sortingDataAccessor = (item, property) => {
      if (property === 'nombre') {
        return this.normalizeSearchText([item.nombre, item.apellidos]);
      }

      if (property === 'cargo') {
        return this.normalizeSearchText([item.cargo]);
      }

      return this.normalizeSearchText([(item as any)[property]]);
    };

    ds.sortData = (data, sort) => {
      const active = sort.active || 'nombre';
      const direction = sort.direction || 'asc';

      return data.slice().sort((a, b) => {
        const valueA = String(ds.sortingDataAccessor(a, active));
        const valueB = String(ds.sortingDataAccessor(b, active));
        const result = valueA.localeCompare(valueB, 'es', { sensitivity: 'base' });
        return direction === 'desc' ? -result : result;
      });
    };
  }

  private attachPaginator(): void {
    if (this.paginatorAdultos) {
      this.dataSources.adultos.paginator = this.paginatorAdultos;
    }

    if (this.paginatorInfantiles) {
      this.dataSources.infantiles.paginator = this.paginatorInfantiles;
    }
  }

  private attachSort(): void {
    if (this.sortAdultos) {
      this.dataSources.adultos.sort = this.sortAdultos;
      this.applyDefaultSort(this.sortAdultos);
    }

    if (this.sortInfantiles) {
      this.dataSources.infantiles.sort = this.sortInfantiles;
      this.applyDefaultSort(this.sortInfantiles);
    }
  }

  private applyDefaultSort(sort: MatSort): void {
    if (!sort.active) {
      sort.active = 'nombre';
      sort.direction = 'asc';
      sort.sortChange.emit({ active: 'nombre', direction: 'asc' });
    }
  }

  private handleLoadError(): void {
    this.loading = false;
    this.error = 'No se han podido cargar los asociados desde la API de censo.';
    this.errorService.show(this.error);
  }

  private writeExcel(
    data: Asociado[],
    historicos: Array<{ asociado: Asociado; historico: HistoricoAsociado[] }>
  ): void {
    const rows = data.map(a => ({
      ID: a.id,
      Nombre: a.nombre,
      Apellidos: a.apellidos,
      Cargo: a.cargo,
      Tipo: a.tipo,
      'DNI/NIF': a.dni ?? '',
      SIP: a.sip ?? '',
      Estado: a.estado ?? '',
      'Fecha de alta': a.fechaAlta ?? '',
      'Fecha de nacimiento': a.fechaNacimiento ?? '',
      Email: a.email ?? '',
      Telefono: a.telefono ?? ''
    }));

    const historicoRows = historicos.flatMap(({ asociado, historico }) =>
      historico.map(item => ({
        ID: asociado.id,
        Nombre: asociado.nombre,
        Apellidos: asociado.apellidos,
        Ejercicio: item.ejercicio,
        Cargo: item.cargo,
        Asociacion: item.nombreAsociacion,
        'ID cargo': item.idCargo,
        'ID ejercicio': item.idEjercicio,
        'ID asociacion': item.idAsociacion
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Asociados');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(historicoRows), 'Historico');
    XLSX.writeFile(workbook, 'asociados.xlsx');
  }

  private buildHistoricoHtml(historico: HistoricoAsociado[]): string {
    if (historico.length === 0) {
      return '<hr /><p><strong>Historico:</strong> sin registros.</p>';
    }

    const rows = historico
      .map(
        item => `
          <tr>
            <td>${this.escapeHtml(String(item.ejercicio))}</td>
            <td>${this.escapeHtml(item.cargo)}</td>
            <td>${this.escapeHtml(item.nombreAsociacion)}</td>
          </tr>
        `
      )
      .join('');

    return `
      <hr />
      <p><strong>Historico de cargos</strong></p>
      <table class="table table-sm">
        <thead>
          <tr>
            <th>Ejercicio</th>
            <th>Cargo</th>
            <th>Asociacion</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, char => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      };
      return entities[char];
    });
  }

  private normalizeSearchText(values: unknown[]): string {
    return values
      .filter(value => value !== null && value !== undefined)
      .map(value => String(value))
      .join(' ')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
}
