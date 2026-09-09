import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

export interface StructuredLocation { direccion: string; codigoPostal: string; localidad: string; provincia: string; latitud: number | null; longitud: number | null; }

@Component({ selector: 'app-location-picker', standalone: true, imports: [CommonModule, ReactiveFormsModule], template: `
<div class="mb-3"><label class="form-label">{{label}}</label><div class="input-group"><input class="form-control" readonly [value]="value.direccion"><button type="button" class="ux-btn ux-btn-secondary" (click)="open()">{{value.direccion ? 'Cambiar ubicación' : 'Seleccionar ubicación'}}</button></div><small class="text-muted" *ngIf="value.localidad || value.codigoPostal">{{value.codigoPostal}} {{value.localidad}} {{value.provincia}}</small><div class="border rounded p-2 mt-2" *ngIf="editing"><div class="input-group"><input class="form-control" [formControl]="query" placeholder="Buscar dirección"><button class="btn btn-outline-secondary" type="button" (click)="search()">Buscar</button></div><button class="btn btn-link px-0" type="button" (click)="current()">Usar mi ubicación actual</button><button class="list-group-item list-group-item-action text-start" type="button" *ngFor="let result of results" (click)="select(result)">{{result.display_name}}</button></div></div>` })
export class LocationPickerComponent {
 @Input() label='Ubicación'; @Input() value: StructuredLocation={direccion:'',codigoPostal:'',localidad:'',provincia:'',latitud:null,longitud:null}; @Output() locationChange=new EventEmitter<StructuredLocation>();
 query=new FormControl(''); editing=false; results:any[]=[]; constructor(private http:HttpClient){}
 open(){this.editing=true;this.query.setValue(this.value.direccion);}
 search(){const q=String(this.query.value||'').trim();if(!q)return;this.http.get<any[]>('https://nominatim.openstreetmap.org/search',{params:{q,format:'jsonv2',addressdetails:'1',limit:'5'}}).subscribe({next:r=>this.results=r,error:()=>this.results=[]});}
 select(r:any){const a=r.address||{};this.value={direccion:r.display_name||'',codigoPostal:a.postcode||'',localidad:a.city||a.town||a.village||a.municipality||'',provincia:a.state||a.province||'',latitud:Number(r.lat)||null,longitud:Number(r.lon)||null};this.locationChange.emit(this.value);this.editing=false;}
 current(){navigator.geolocation?.getCurrentPosition(p=>{this.value={...this.value,latitud:p.coords.latitude,longitud:p.coords.longitude};this.locationChange.emit(this.value);});}
}
