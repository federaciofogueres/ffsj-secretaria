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
import { FfsjDialogAlertService, AlertButtonType } from 'ffsj-web-components';
import * as XLSX from 'xlsx';
import { ErrorService } from '../core/error.service';
import { Asociado, AsociadosService } from './asociados.service';

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
    MatMenuModule
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
        this.configureFilter(this.dataSources.adultos);
        this.attachPaginator();
        this.attachSort();
      },
      error: () => this.handleLoadError()
    });

    this.asociadosService.getInfantiles().subscribe({
      next: infantiles => {
        this.dataSources.infantiles.data = infantiles;
        this.configureFilter(this.dataSources.infantiles);
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
    const normalized = value.trim().toLowerCase();
    const ds = this.dataSources[this.activeTab];
    ds.filter = normalized;
    if (ds.paginator) {
      ds.paginator.firstPage();
    }
  }

  openDetails(asociado: Asociado): void {
    this.dialogService.openDialogAlert({
      title: 'Detalles del asociado',
      content: `Nombre: ${asociado.nombre} ${asociado.apellidos}\nCargo: ${asociado.cargo}\nTipo: ${
        asociado.tipo === 'adulto' ? 'Adulto' : 'Infantil'
      }`,
      innerHtml: `
        <p><strong>Nombre:</strong> ${asociado.nombre} ${asociado.apellidos}</p>
        <p><strong>Cargo:</strong> ${asociado.cargo}</p>
        <p><strong>Tipo:</strong> ${asociado.tipo === 'adulto' ? 'Adulto' : 'Infantil'}</p>
        ${asociado.fechaNacimiento ? `<p><strong>Fecha de nacimiento:</strong> ${asociado.fechaNacimiento}</p>` : ''}
      `,
      buttonsAlert: [AlertButtonType.Entendido]
    });
  }

  downloadExcel(): void {
    this.asociadosService.getTodos().subscribe(data => {
      const rows = data.map(a => ({
        Nombre: a.nombre,
        Apellidos: a.apellidos,
        Cargo: a.cargo,
        Tipo: a.tipo
      }));
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Asociados');
      XLSX.writeFile(workbook, 'asociados.xlsx');
    });
  }

  private configureFilter(ds: MatTableDataSource<Asociado>): void {
    ds.filterPredicate = (data, filter) => {
      const full = `${data.nombre} ${data.apellidos} ${data.cargo}`.toLowerCase();
      return full.includes(filter);
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
    }

    if (this.sortInfantiles) {
      this.dataSources.infantiles.sort = this.sortInfantiles;
    }
  }

  private handleLoadError(): void {
    this.loading = false;
    this.error = 'No se han podido cargar los asociados desde la API de censo.';
    this.errorService.show(this.error);
  }
}
