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
import * as XLSX from 'xlsx';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { ErrorService } from '../core/error.service';
import { Asociado, AsociadosService, HistoricoAsociado } from './asociados.service';

type TabKey = 'adultos' | 'infantiles';
type DetailTabKey = 'informacion' | 'historico';

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
  detailTab: DetailTabKey = 'informacion';
  selectedAsociado: Asociado | null = null;
  selectedHistorico: HistoricoAsociado[] = [];
  loading = false;
  error = '';

  @ViewChild('paginatorAdultos') paginatorAdultos!: MatPaginator;
  @ViewChild('paginatorInfantiles') paginatorInfantiles!: MatPaginator;
  @ViewChild('sortAdultos') sortAdultos!: MatSort;
  @ViewChild('sortInfantiles') sortInfantiles!: MatSort;

  constructor(
    private readonly asociadosService: AsociadosService,
    private readonly errorService: ErrorService
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

  closeDetails(): void {
    this.selectedAsociado = null;
    this.selectedHistorico = [];
    this.detailTab = 'informacion';
  }

  setDetailTab(tab: DetailTabKey): void {
    this.detailTab = tab;
  }

  detalleRows(asociado: Asociado): Array<[string, string]> {
    const rows: Array<[string, string]> = [
      ['Tipo', asociado.tipo === 'adulto' ? 'Adulto' : 'Infantil'],
      ['DNI/NIF', asociado.dni ?? ''],
      ['SIP', asociado.sip ?? ''],
      ['Fecha de alta', asociado.fechaAlta ?? ''],
      ['Fecha de nacimiento', asociado.fechaNacimiento ?? ''],
      ['Dirección', asociado.direccion ?? ''],
      ['Código postal', asociado.codigoPostal ?? asociado.codigo_postal ?? asociado.cp ?? ''],
      ['Email', asociado.email ?? ''],
      ['Teléfono', asociado.telefono ?? '']
    ];

    return rows.filter(([, value]) => value);
  }

  historicoAgrupado(): Array<{ ejercicio: string; cargos: string }> {
    const grouped = this.selectedHistorico.reduce((acc, item) => {
      const ejercicio = String(item.ejercicio || 'Sin ejercicio');
      const cargos = acc.get(ejercicio) ?? new Set<string>();
      if (item.cargo) {
        cargos.add(item.cargo);
      }
      acc.set(ejercicio, cargos);
      return acc;
    }, new Map<string, Set<string>>());

    return Array.from(grouped.entries())
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([ejercicio, cargos]) => ({
        ejercicio,
        cargos: Array.from(cargos).join(' / ') || '-'
      }));
  }

  isInactive(asociado: Asociado): boolean {
    return this.esBaja(asociado) || String(asociado.estado || '').toLowerCase() === 'inactivo';
  }

  stateText(asociado: Asociado): string {
    return this.isInactive(asociado) ? 'Inactivo' : 'Activo';
  }

  initials(asociado: Asociado): string {
    const first = asociado.nombre?.trim()?.[0] || '';
    const second = asociado.apellidos?.trim()?.[0] || '';
    return `${first}${second}`.toUpperCase();
  }

  private openDetailsDialog(asociado: Asociado, historico: HistoricoAsociado[]): void {
    this.selectedAsociado = asociado;
    this.selectedHistorico = historico;
    this.detailTab = 'informacion';
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
