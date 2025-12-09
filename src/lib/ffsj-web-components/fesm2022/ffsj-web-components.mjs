import * as i0 from '@angular/core';
import { Component, Injectable, EventEmitter, Output, Input, Inject } from '@angular/core';
import * as i1 from '@angular/common/http';
import { HttpHeaders, HttpClientModule } from '@angular/common/http';
import * as i3 from '@angular/forms';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, BehaviorSubject } from 'rxjs';
import * as i1$1 from '@angular/router';
import * as CryptoJS from 'crypto-js';
import * as bcrypt from 'bcryptjs';
import * as i4 from 'ngx-cookie-service';
import * as i1$2 from '@angular/common';
import { CommonModule } from '@angular/common';
import * as i1$3 from '@angular/material/dialog';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

class FfsjWebComponentsComponent {
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.12", ngImport: i0, type: FfsjWebComponentsComponent, deps: [], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "20.3.12", type: FfsjWebComponentsComponent, isStandalone: true, selector: "lib-ffsj-web-components", ngImport: i0, template: `
    <p>
      ffsj-web-components works!
    </p>
  `, isInline: true, styles: [""] }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.12", ngImport: i0, type: FfsjWebComponentsComponent, decorators: [{
            type: Component,
            args: [{ selector: 'lib-ffsj-web-components', standalone: true, imports: [], template: `
    <p>
      ffsj-web-components works!
    </p>
  ` }]
        }] });

class FfsjWebComponentsService {
    constructor() { }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.12", ngImport: i0, type: FfsjWebComponentsService, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "20.3.12", ngImport: i0, type: FfsjWebComponentsService, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.12", ngImport: i0, type: FfsjWebComponentsService, decorators: [{
            type: Injectable,
            args: [{
                    providedIn: 'root'
                }]
        }], ctorParameters: () => [] });

var AlertType;
(function (AlertType) {
    AlertType["Success"] = "success";
    AlertType["Danger"] = "danger";
    AlertType["Warning"] = "warning";
    AlertType["Info"] = "info";
})(AlertType || (AlertType = {}));

class FfsjAlertService {
    constructor() {
        // Stream de alertas: el componente se suscribe a esto
        this.alert$ = new Subject();
    }
    success(message, duration = 5000) {
        console.log('Lanzando mensaje: ', message);
        this.alert$.next({ type: AlertType.Success, message, duration });
    }
    danger(message, duration = 5000) {
        console.log('Lanzando mensaje: ', message);
        this.alert$.next({ type: AlertType.Danger, message, duration });
    }
    warning(message, duration = 5000) {
        console.log('Lanzando mensaje: ', message);
        this.alert$.next({ type: AlertType.Warning, message, duration });
    }
    info(message, duration = 5000) {
        console.log('Lanzando mensaje: ', message);
        this.alert$.next({ type: AlertType.Info, message, duration });
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.12", ngImport: i0, type: FfsjAlertService, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "20.3.12", ngImport: i0, type: FfsjAlertService, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.12", ngImport: i0, type: FfsjAlertService, decorators: [{
            type: Injectable,
            args: [{
                    providedIn: 'root'
                }]
        }] });

class FfsjAlertComponent {
    constructor(alertService) {
        this.alertService = alertService;
        this.message = null;
        console.log('FfsjAlertComponent construido');
        this.subscription = this.alertService.alert$.subscribe(alert => {
            this.message = alert.message;
            this.type = alert.type;
            setTimeout(() => this.closeAlert(), alert.duration);
        });
    }
    ngOnDestroy() {
        this.subscription.unsubscribe();
    }
    closeAlert() {
        this.message = null;
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.12", ngImport: i0, type: FfsjAlertComponent, deps: [{ token: FfsjAlertService }], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.0.0", version: "20.3.12", type: FfsjAlertComponent, isStandalone: true, selector: "lib-ffsj-alert", ngImport: i0, template: "@if (message) {\r\n    <div class=\"alert alert-{{type}}\" role=\"alert\">\r\n        {{message}}\r\n        <button type=\"button\" class=\"close\" (click)=\"closeAlert()\">\r\n          <span aria-hidden=\"true\">&times;</span>\r\n        </button>\r\n    </div>\r\n}", styles: [".alert{display:flex;align-items:center;justify-content:space-between;position:absolute;top:0;right:0;padding:10px}.close{font-size:1.5rem;font-weight:700;background:transparent;border:0}.close:hover{color:#000;text-decoration:none}.close:not(:disabled):not(.disabled):hover,.close:not(:disabled):not(.disabled):focus{opacity:.75}\n"] }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.12", ngImport: i0, type: FfsjAlertComponent, decorators: [{
            type: Component,
            args: [{ selector: 'lib-ffsj-alert', standalone: true, imports: [], template: "@if (message) {\r\n    <div class=\"alert alert-{{type}}\" role=\"alert\">\r\n        {{message}}\r\n        <button type=\"button\" class=\"close\" (click)=\"closeAlert()\">\r\n          <span aria-hidden=\"true\">&times;</span>\r\n        </button>\r\n    </div>\r\n}", styles: [".alert{display:flex;align-items:center;justify-content:space-between;position:absolute;top:0;right:0;padding:10px}.close{font-size:1.5rem;font-weight:700;background:transparent;border:0}.close:hover{color:#000;text-decoration:none}.close:not(:disabled):not(.disabled):hover,.close:not(:disabled):not(.disabled):focus{opacity:.75}\n"] }]
        }], ctorParameters: () => [{ type: FfsjAlertService }] });

class Configuration {
    constructor(configurationParameters = {}) {
        this.apiKeys = configurationParameters.apiKeys;
        this.username = configurationParameters.username;
        this.password = configurationParameters.password;
        this.accessToken = configurationParameters.accessToken;
        this.basePath = configurationParameters.basePath;
        this.withCredentials = configurationParameters.withCredentials;
    }
    /**
     * Select the correct content-type to use for a request.
     * Uses {@link Configuration#isJsonMime} to determine the correct content-type.
     * If no content type is found return the first found type if the contentTypes is not empty
     * @param contentTypes - the array of content types that are available for selection
     * @returns the selected content-type or <code>undefined</code> if no selection could be made.
     */
    selectHeaderContentType(contentTypes) {
        if (contentTypes.length == 0) {
            return undefined;
        }
        let type = contentTypes.find(x => this.isJsonMime(x));
        if (type === undefined) {
            return contentTypes[0];
        }
        return type;
    }
    /**
     * Select the correct accept content-type to use for a request.
     * Uses {@link Configuration#isJsonMime} to determine the correct accept content-type.
     * If no content type is found return the first found type if the contentTypes is not empty
     * @param accepts - the array of content types that are available for selection.
     * @returns the selected content-type or <code>undefined</code> if no selection could be made.
     */
    selectHeaderAccept(accepts) {
        if (accepts.length == 0) {
            return undefined;
        }
        let type = accepts.find(x => this.isJsonMime(x));
        if (type === undefined) {
            return accepts[0];
        }
        return type;
    }
    /**
     * Check if the given MIME is a JSON MIME.
     * JSON MIME examples:
     *   application/json
     *   application/json; charset=UTF8
     *   APPLICATION/JSON
     *   application/vnd.company+json
     * @param mime - MIME (Multipurpose Internet Mail Extensions)
     * @return True if the given MIME is JSON, false otherwise.
     */
    isJsonMime(mime) {
        const jsonMime = new RegExp('^(application\/json|[^;/ \t]+\/[^;/ \t]+[+]json)[ \t]*(;.*)?$', 'i');
        return mime != null && (jsonMime.test(mime) || mime.toLowerCase() === 'application/json-patch+json');
    }
}

class CensoService {
    constructor(httpClient) {
        this.httpClient = httpClient;
        this.basePath = 'https://censo-api.hogueras.es/emjf1/Censo-Hogueras/1.0.0';
        this.defaultHeaders = new HttpHeaders();
        this.configuration = new Configuration();
    }
    asociacionesGet(observe = 'body', reportProgress = false) {
        let headers = this.defaultHeaders;
        // authentication (BearerAuth) required
        if (this.configuration.accessToken) {
            const accessToken = typeof this.configuration.accessToken === 'function'
                ? this.configuration.accessToken()
                : this.configuration.accessToken;
            headers = headers.set('Authorization', 'Bearer ' + accessToken);
        }
        // to determine the Accept header
        let httpHeaderAccepts = [
            'application/json'
        ];
        const httpHeaderAcceptSelected = this.configuration.selectHeaderAccept(httpHeaderAccepts);
        if (httpHeaderAcceptSelected != undefined) {
            headers = headers.set('Accept', httpHeaderAcceptSelected);
        }
        // to determine the Content-Type header
        return this.httpClient.request('get', `${this.basePath}/asociaciones`, {
            withCredentials: this.configuration.withCredentials,
            headers: headers,
            observe: observe,
            reportProgress: reportProgress
        });
    }
    doLogin(body, observe = 'body', reportProgress = false) {
        let headers = this.defaultHeaders;
        let httpHeaderAccepts = ['application/json'];
        const httpHeaderAcceptSelected = this.configuration.selectHeaderAccept(httpHeaderAccepts);
        if (httpHeaderAcceptSelected != undefined) {
            headers = headers.set('Accept', httpHeaderAcceptSelected);
        }
        // to determine the Content-Type header
        const consumes = [
            'application/json'
        ];
        const httpContentTypeSelected = this.configuration.selectHeaderContentType(consumes);
        if (httpContentTypeSelected != undefined) {
            headers = headers.set('Content-Type', httpContentTypeSelected);
        }
        return this.httpClient.request('post', `${this.basePath}/login`, {
            body: body,
            withCredentials: this.configuration.withCredentials,
            headers: headers,
            observe: observe,
            reportProgress: reportProgress
        });
    }
    asociadosGetById(asociado, observe = 'body', reportProgress = false) {
        if (asociado === null || asociado === undefined) {
            throw new Error('Required parameter asociado was null or undefined when calling asociadosGetById.');
        }
        let headers = this.defaultHeaders;
        // authentication (BearerAuth) required
        if (this.configuration.accessToken) {
            const accessToken = typeof this.configuration.accessToken === 'function'
                ? this.configuration.accessToken()
                : this.configuration.accessToken;
            headers = headers.set('Authorization', 'Bearer ' + accessToken);
        }
        // to determine the Accept header
        let httpHeaderAccepts = [
            'application/json'
        ];
        const httpHeaderAcceptSelected = this.configuration.selectHeaderAccept(httpHeaderAccepts);
        if (httpHeaderAcceptSelected != undefined) {
            headers = headers.set('Accept', httpHeaderAcceptSelected);
        }
        // to determine the Content-Type header
        const consumes = [];
        return this.httpClient.request('get', `${this.basePath}/asociados/${encodeURIComponent(String(asociado))}`, {
            withCredentials: this.configuration.withCredentials,
            headers: headers,
            observe: observe,
            reportProgress: reportProgress
        });
    }
    asociadosPut(body, asociado, observe = 'body', reportProgress = false) {
        if (body === null || body === undefined) {
            throw new Error('Required parameter body was null or undefined when calling asociadosPut.');
        }
        if (asociado === null || asociado === undefined) {
            throw new Error('Required parameter asociado was null or undefined when calling asociadosPut.');
        }
        let headers = this.defaultHeaders;
        // authentication (BearerAuth) required
        if (this.configuration.accessToken) {
            const accessToken = typeof this.configuration.accessToken === 'function'
                ? this.configuration.accessToken()
                : this.configuration.accessToken;
            headers = headers.set('Authorization', 'Bearer ' + accessToken);
        }
        // to determine the Accept header
        let httpHeaderAccepts = [
            'application/json'
        ];
        const httpHeaderAcceptSelected = this.configuration.selectHeaderAccept(httpHeaderAccepts);
        if (httpHeaderAcceptSelected != undefined) {
            headers = headers.set('Accept', httpHeaderAcceptSelected);
        }
        // to determine the Content-Type header
        const consumes = [
            'application/json'
        ];
        const httpContentTypeSelected = this.configuration.selectHeaderContentType(consumes);
        if (httpContentTypeSelected != undefined) {
            headers = headers.set('Content-Type', httpContentTypeSelected);
        }
        return this.httpClient.request('put', `${this.basePath}/asociados/${encodeURIComponent(String(asociado))}`, {
            body: body,
            withCredentials: this.configuration.withCredentials,
            headers: headers,
            observe: observe,
            reportProgress: reportProgress
        });
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.12", ngImport: i0, type: CensoService, deps: [{ token: i1.HttpClient }], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "20.3.12", ngImport: i0, type: CensoService, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.12", ngImport: i0, type: CensoService, decorators: [{
            type: Injectable,
            args: [{
                    providedIn: 'root'
                }]
        }], ctorParameters: () => [{ type: i1.HttpClient }] });

class EncoderService {
    constructor() {
        this.key = 'eFfFsJ2023*';
        this.iv = CryptoJS.enc.Utf8.parse('1234567890123456');
        this.key = 'eFfFsJ2023*';
        this.iv = CryptoJS.enc.Utf8.parse('1234567890123456');
    }
    encryptPassword(data) {
        const saltRounds = 10;
        let salt = bcrypt.genSaltSync(saltRounds);
        let encodedPassword = bcrypt.hashSync(data, salt);
        return encodedPassword;
    }
    checkPassword(password, encrypted) {
        return bcrypt.compareSync(password, encrypted);
    }
    // Método para encriptar datos de entrada
    encrypt(password) {
        const encrypted = CryptoJS.AES.encrypt(password, this.key, { iv: this.iv });
        return encrypted.toString();
    }
    // Método para desencriptar datos de entrada
    decrypt(passwordToDecrypt) {
        const decrypted = CryptoJS.AES.decrypt(passwordToDecrypt, this.key, { iv: this.iv });
        return decrypted.toString(CryptoJS.enc.Utf8);
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.12", ngImport: i0, type: EncoderService, deps: [], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "20.3.12", ngImport: i0, type: EncoderService, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.12", ngImport: i0, type: EncoderService, decorators: [{
            type: Injectable,
            args: [{
                    providedIn: 'root'
                }]
        }], ctorParameters: () => [] });

class AuthService {
    constructor(router, censoService, encoderService, cookieService) {
        this.router = router;
        this.censoService = censoService;
        this.encoderService = encoderService;
        this.cookieService = cookieService;
        this.loginStatus$ = new BehaviorSubject(false);
        this.loginStatusObservable = this.loginStatus$.asObservable();
    }
    checkToken() {
        return !this.checkExpireDateToken(this.encoderService.decrypt(this.cookieService.get('token')));
    }
    checkExpireDateToken(token) {
        if (token === '' || token === null) {
            return true;
        }
        const expiry = (JSON.parse(atob(token.split('.')[1]))).exp;
        return (Math.floor((new Date).getTime() / 1000)) >= expiry;
    }
    isLocalDomain() {
        return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    }
    saveToken(token) {
        const isLocal = this.isLocalDomain();
        const hostName = isLocal ? undefined : '.hogueras.es';
        const options = {
            domain: hostName,
            path: '/',
            secure: !isLocal // Assuming secure cookies should not be set for localhost
        };
        this.cookieService.set('token', this.encoderService.encrypt(token), options);
    }
    async login(user, password) {
        const usuario = {
            user,
            password: this.encoderService.encrypt(password)
        };
        return new Promise((resolve) => {
            this.censoService.doLogin(usuario).subscribe({
                next: (res) => {
                    console.log(res);
                    // Caso: el backend devuelve 'solicitud' (cambio de contraseña)
                    if (res.solicitud) {
                        this.censoService.configuration.accessToken = res.solicitud.token;
                        this.loginStatus$.next(true);
                        resolve({ code: 201, id: res.solicitud.id });
                        return;
                    }
                    // Caso: login normal con token
                    if (res.token) {
                        this.saveToken(res.token);
                    }
                    this.loginStatus$.next(true);
                    resolve({ code: 200 });
                },
                error: (error) => {
                    console.log(error);
                    this.loginStatus$.next(false);
                    resolve({ code: 400 });
                }
            });
        });
    }
    getToken() {
        let token = '';
        if (this.cookieService.get('token')) {
            token = this.encoderService.decrypt(this.cookieService.get('token'));
            this.loginStatus$.next(true);
        }
        return token;
    }
    getIdUsuario() {
        const token = this.getToken();
        if (token === '' || token === null) {
            return -1;
        }
        return (JSON.parse(atob(token.split('.')[1]))).id;
    }
    logout() {
        const isLocal = this.isLocalDomain();
        const hostName = isLocal ? undefined : '.hogueras.es';
        // Borrar la cookie con los mismos parámetros con los que se creó
        if (isLocal) {
            // En localhost la cookie se creó sin domain, pero sí con path '/'
            this.cookieService.delete('token', '/');
        }
        else {
            // En producción se creó con domain '.hogueras.es' y path '/'
            this.cookieService.delete('token', '/', hostName);
        }
        // Por si existiera alguna variante sin path/domain
        this.cookieService.delete('token');
        this.loginStatus$.next(false);
        this.router.navigateByUrl('login');
    }
    isLoggedIn() {
        const token = this.cookieService.get('token');
        const isLoggedIn = token !== null && token !== '' ? this.checkToken() : false;
        this.loginStatus$.next(isLoggedIn);
        return isLoggedIn;
    }
    getCargos() {
        try {
            // Suponiendo que token es la cadena que quieres decodificar
            const token = this.cookieService.get('token');
            if (!token) {
                throw new Error('Token no encontrado');
            }
            // Asegúrate de que la cadena esté correctamente codificada en base64 antes de decodificarla
            const tokenDecoded = this.encoderService.decrypt(token);
            const base64Payload = tokenDecoded.split('.')[1]; // Asumiendo JWT. Ajusta según sea necesario.
            const payload = atob(base64Payload);
            // Procesa el payload como necesites
            return JSON.parse(payload).cargos; // Ajusta según la estructura de tus datos
        }
        catch (error) {
            // console.log('Error al decodificar la cadena base64:', error);
            // Retorna un valor de respaldo o maneja el error como consideres apropiado
            return [];
        }
    }
    updatePassword(asociado, password) {
        return new Promise((resolve, reject) => {
            this.censoService.asociadosGetById(asociado).subscribe({
                next: (res) => {
                    console.log(res);
                    let usuario = res.asociados[0];
                    usuario.password = this.encoderService.encrypt(password);
                    this.censoService.asociadosPut(usuario, usuario.id).subscribe({
                        next: (res) => {
                            console.log(res);
                            resolve(res); // Resuelve la promesa si la actualización es correcta
                        },
                        error: (error) => {
                            console.log(error);
                            reject(error); // Rechaza la promesa si hay un error en la actualización
                        }
                    });
                },
                error: (error) => {
                    console.log(error);
                    reject(error); // Rechaza la promesa si hay un error al obtener el usuario
                }
            });
        });
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.12", ngImport: i0, type: AuthService, deps: [{ token: i1$1.Router }, { token: CensoService }, { token: EncoderService }, { token: i4.CookieService }], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "20.3.12", ngImport: i0, type: AuthService, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.12", ngImport: i0, type: AuthService, decorators: [{
            type: Injectable,
            args: [{
                    providedIn: 'root'
                }]
        }], ctorParameters: () => [{ type: i1$1.Router }, { type: CensoService }, { type: EncoderService }, { type: i4.CookieService }] });

class FfsjLoginComponent {
    constructor(authService, alertService) {
        this.authService = authService;
        this.alertService = alertService;
        this.title = 'Iniciar Sesión';
        this.subtitle = 'Acceso a administración';
        this.logStatus = new EventEmitter();
        this.username = new FormControl({ value: '', disabled: false });
        this.password = new FormControl('');
        this.repeatPassword = new FormControl('');
        this.loading = false;
        this.showChangePasswordForm = false;
        this.idAsociadoToChangePassword = -1;
    }
    ngOnInit() {
        if (this.authService.isLoggedIn()) {
            this.logStatus.emit(true);
        }
    }
    async login() {
        console.log('Doing Login -> ', this.username.value, this.password.value);
        this.loading = true;
        if (this.username.valid && this.password.valid) {
            console.log(`Username: ${this.username.value} - password: ${this.password.value}`);
            const codeLogin = await this.authService.login(this.username.value, this.password.value);
            if (codeLogin.code === 200) {
                this.loading = false;
                this.alertService.success('Bienvenido!', 5000);
                this.logStatus.emit(true); // el padre sabe que ha ido bien
            }
            else if (codeLogin.code === 400) {
                this.loading = false;
                this.alertService.danger('Datos incorrectos de inicio de sesión.', 5000);
                this.logStatus.emit(false); // el padre sabe que ha fallado
            }
            else if (codeLogin.code === 201) {
                this.idAsociadoToChangePassword = codeLogin.id;
                this.showChangePasswordForm = true;
                this.username.disable();
                this.password.reset();
                this.loading = false;
                this.alertService.info('Debes actualizar tu contraseña.', 5000);
                // aquí podrías emitir algo especial si quisieras
            }
        }
        else {
            this.loading = false;
            this.alertService.danger('Datos incorrectos de inicio de sesión.', 5000);
            this.logStatus.emit(false);
        }
    }
    changePassword() {
        if (this.password.value !== this.repeatPassword.value) {
            this.alertService.danger('Las contraseñas no coinciden.', 5000);
            return;
        }
        this.authService.updatePassword(this.idAsociadoToChangePassword, this.password.value)
            .then((res) => {
            console.log(res);
            this.alertService.success('Contraseña actualizada correctamente.', 5000);
            this.showChangePasswordForm = false;
            this.username.enable();
            this.login();
        })
            .catch((error) => {
            console.log(error);
            this.alertService.danger('Error al actualizar la contraseña.', 5000);
        });
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.12", ngImport: i0, type: FfsjLoginComponent, deps: [{ token: AuthService }, { token: FfsjAlertService }], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.0.0", version: "20.3.12", type: FfsjLoginComponent, isStandalone: true, selector: "lib-ffsj-login", inputs: { title: "title", subtitle: "subtitle" }, outputs: { logStatus: "logStatus" }, ngImport: i0, template: "\r\n    <div class=\"container mt-4 login-container\">\r\n  \r\n      <div class=\"row banner\">\r\n        <h1>\r\n          <img src=\"https://intranet.hogueras.es/wp-content/uploads/2016/12/logofede.png\" class=\"img-fluid\" alt=\"\">\r\n          <span style=\"color: #dd5a43 !important\">{{title}}</span>\r\n        </h1>\r\n        <h4 style=\"color: #478fca !important; text-align: center;\">\u00A9 Federaci\u00F3 de Les Fogueres de Sant Joan</h4>\r\n      </div>\r\n  \r\n      <div class=\"row\">\r\n        <h4 class=\"titulo-consultas\" style=\"color: #478fca !important;\">\r\n          {{subtitle}}\r\n        </h4>\r\n      </div>\r\n      <div class=\"row my-3\">\r\n        <label for=\"username\">Usuario</label>\r\n        <input type=\"text\" id=\"username\" class=\"form-control\" [formControl]=\"username\" value=\"\">\r\n      </div>\r\n      @if (showChangePasswordForm) {\r\n        <div class=\"row mb-3\">\r\n          <label for=\"password\">Nueva contrase\u00F1a</label>\r\n        <input type=\"password\" id=\"password\" class=\"form-control\" [formControl]=\"password\" value=\"\">\r\n        </div>\r\n        <div class=\"row mb-3\">\r\n          <label for=\"repeatPassword\">Repite la nueva contrase\u00F1a</label>\r\n          <input type=\"password\" id=\"repeatPassword\" class=\"form-control\" [formControl]=\"repeatPassword\" value=\"\">\r\n        </div>\r\n      } @else {\r\n        <div class=\"row mb-3\">\r\n            <label for=\"password\">Contrase\u00F1a</label>\r\n          <input type=\"password\" id=\"password\" class=\"form-control\" [formControl]=\"password\" value=\"\">\r\n        </div>\r\n      }\r\n      @if(showChangePasswordForm) {\r\n        <div class=\"row submit-button mt-2\">\r\n          <button (click)=\"changePassword()\">Actualizar contrase\u00F1a</button>\r\n        </div>\r\n      } @else {\r\n        <div class=\"row submit-button mt-2\">\r\n          <button (click)=\"login()\">Iniciar sesi\u00F3n</button>\r\n        </div>\r\n      }\r\n  \r\n    </div>\r\n\r\n    <lib-ffsj-alert></lib-ffsj-alert>", styles: [".login-container{max-width:350px}.login-container .row.banner{text-align:center}.login-container .row.banner img{max-height:75px}.submit-button button{margin:auto;color:#fff;background-color:#0033a0;border:1px solid #0033A0;font-weight:700;padding:10px 20px;border-radius:25px;width:auto;max-width:80%}.row.banner{text-align:center}.row.banner img{max-height:75px}\n"], dependencies: [{ kind: "ngmodule", type: ReactiveFormsModule }, { kind: "directive", type: i3.DefaultValueAccessor, selector: "input:not([type=checkbox])[formControlName],textarea[formControlName],input:not([type=checkbox])[formControl],textarea[formControl],input:not([type=checkbox])[ngModel],textarea[ngModel],[ngDefaultControl]" }, { kind: "directive", type: i3.NgControlStatus, selector: "[formControlName],[ngModel],[formControl]" }, { kind: "directive", type: i3.FormControlDirective, selector: "[formControl]", inputs: ["formControl", "disabled", "ngModel"], outputs: ["ngModelChange"], exportAs: ["ngForm"] }, { kind: "ngmodule", type: HttpClientModule }, { kind: "component", type: FfsjAlertComponent, selector: "lib-ffsj-alert" }] }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.12", ngImport: i0, type: FfsjLoginComponent, decorators: [{
            type: Component,
            args: [{ selector: 'lib-ffsj-login', standalone: true, imports: [
                        ReactiveFormsModule,
                        HttpClientModule,
                        FfsjAlertComponent
                    ], template: "\r\n    <div class=\"container mt-4 login-container\">\r\n  \r\n      <div class=\"row banner\">\r\n        <h1>\r\n          <img src=\"https://intranet.hogueras.es/wp-content/uploads/2016/12/logofede.png\" class=\"img-fluid\" alt=\"\">\r\n          <span style=\"color: #dd5a43 !important\">{{title}}</span>\r\n        </h1>\r\n        <h4 style=\"color: #478fca !important; text-align: center;\">\u00A9 Federaci\u00F3 de Les Fogueres de Sant Joan</h4>\r\n      </div>\r\n  \r\n      <div class=\"row\">\r\n        <h4 class=\"titulo-consultas\" style=\"color: #478fca !important;\">\r\n          {{subtitle}}\r\n        </h4>\r\n      </div>\r\n      <div class=\"row my-3\">\r\n        <label for=\"username\">Usuario</label>\r\n        <input type=\"text\" id=\"username\" class=\"form-control\" [formControl]=\"username\" value=\"\">\r\n      </div>\r\n      @if (showChangePasswordForm) {\r\n        <div class=\"row mb-3\">\r\n          <label for=\"password\">Nueva contrase\u00F1a</label>\r\n        <input type=\"password\" id=\"password\" class=\"form-control\" [formControl]=\"password\" value=\"\">\r\n        </div>\r\n        <div class=\"row mb-3\">\r\n          <label for=\"repeatPassword\">Repite la nueva contrase\u00F1a</label>\r\n          <input type=\"password\" id=\"repeatPassword\" class=\"form-control\" [formControl]=\"repeatPassword\" value=\"\">\r\n        </div>\r\n      } @else {\r\n        <div class=\"row mb-3\">\r\n            <label for=\"password\">Contrase\u00F1a</label>\r\n          <input type=\"password\" id=\"password\" class=\"form-control\" [formControl]=\"password\" value=\"\">\r\n        </div>\r\n      }\r\n      @if(showChangePasswordForm) {\r\n        <div class=\"row submit-button mt-2\">\r\n          <button (click)=\"changePassword()\">Actualizar contrase\u00F1a</button>\r\n        </div>\r\n      } @else {\r\n        <div class=\"row submit-button mt-2\">\r\n          <button (click)=\"login()\">Iniciar sesi\u00F3n</button>\r\n        </div>\r\n      }\r\n  \r\n    </div>\r\n\r\n    <lib-ffsj-alert></lib-ffsj-alert>", styles: [".login-container{max-width:350px}.login-container .row.banner{text-align:center}.login-container .row.banner img{max-height:75px}.submit-button button{margin:auto;color:#fff;background-color:#0033a0;border:1px solid #0033A0;font-weight:700;padding:10px 20px;border-radius:25px;width:auto;max-width:80%}.row.banner{text-align:center}.row.banner img{max-height:75px}\n"] }]
        }], ctorParameters: () => [{ type: AuthService }, { type: FfsjAlertService }], propDecorators: { title: [{
                type: Input
            }], subtitle: [{
                type: Input
            }], logStatus: [{
                type: Output
            }] } });

class AuthGuard {
    constructor(authService, router, censoService) {
        this.authService = authService;
        this.router = router;
        this.censoService = censoService;
    }
    canActivate() {
        if (this.authService.isLoggedIn()) {
            let token = this.authService.getToken();
            this.censoService.configuration.accessToken = token;
            return true;
        }
        else {
            this.router.navigate(['/login']);
            return false;
        }
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.12", ngImport: i0, type: AuthGuard, deps: [{ token: AuthService }, { token: i1$1.Router }, { token: CensoService }], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "20.3.12", ngImport: i0, type: AuthGuard, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.12", ngImport: i0, type: AuthGuard, decorators: [{
            type: Injectable,
            args: [{
                    providedIn: 'root'
                }]
        }], ctorParameters: () => [{ type: AuthService }, { type: i1$1.Router }, { type: CensoService }] });

class FfsjSpinnerComponent {
    constructor() {
        this.fullscreen = false;
        this.imagePath = '../../../assets/img/fede.png';
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.12", ngImport: i0, type: FfsjSpinnerComponent, deps: [], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "14.0.0", version: "20.3.12", type: FfsjSpinnerComponent, isStandalone: true, selector: "lib-ffsj-spinner", inputs: { fullscreen: "fullscreen" }, ngImport: i0, template: "<div class=\"bg-dark preloader\" [ngClass]=\"fullscreen ? ['full-size'] : ['component']\">\r\n    <div class=\"spinner-container\">\r\n        <img [src]=\"imagePath\">\r\n    </div>\r\n    <div class=\"loader\">\r\n        <span></span>\r\n    </div>\r\n</div>", styles: [".full-size{position:fixed}.component{position:relative}.preloader{top:0;left:0;margin:0 auto;width:100%;height:100%;display:flex;justify-content:center;align-items:center;z-index:997}.preloader .spinner-container{width:200px;height:200px;display:flex;justify-content:center;align-items:center}.preloader .spinner-container img{width:130px;height:130px;z-index:999;position:relative}.preloader .loader{position:absolute;width:200px;height:200px;border:4px solid transparent;overflow:hidden;border-radius:50%}.preloader .loader:before{content:\"\";position:absolute;inset:10px;z-index:998;background:#fff;border-radius:50%;border:2px solid transparent}.preloader .loader>span{position:absolute;width:100%;height:100%;border-radius:50%;background-image:linear-gradient(-225deg,#0245ff,#00e1ff,#5edfff);filter:blur(20px);animation:animate .5s linear infinite}@keyframes animate{0%{transform:rotate(0)}to{transform:rotate(360deg)}}\n"], dependencies: [{ kind: "ngmodule", type: CommonModule }, { kind: "directive", type: i1$2.NgClass, selector: "[ngClass]", inputs: ["class", "ngClass"] }] }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.12", ngImport: i0, type: FfsjSpinnerComponent, decorators: [{
            type: Component,
            args: [{ selector: 'lib-ffsj-spinner', standalone: true, imports: [CommonModule], template: "<div class=\"bg-dark preloader\" [ngClass]=\"fullscreen ? ['full-size'] : ['component']\">\r\n    <div class=\"spinner-container\">\r\n        <img [src]=\"imagePath\">\r\n    </div>\r\n    <div class=\"loader\">\r\n        <span></span>\r\n    </div>\r\n</div>", styles: [".full-size{position:fixed}.component{position:relative}.preloader{top:0;left:0;margin:0 auto;width:100%;height:100%;display:flex;justify-content:center;align-items:center;z-index:997}.preloader .spinner-container{width:200px;height:200px;display:flex;justify-content:center;align-items:center}.preloader .spinner-container img{width:130px;height:130px;z-index:999;position:relative}.preloader .loader{position:absolute;width:200px;height:200px;border:4px solid transparent;overflow:hidden;border-radius:50%}.preloader .loader:before{content:\"\";position:absolute;inset:10px;z-index:998;background:#fff;border-radius:50%;border:2px solid transparent}.preloader .loader>span{position:absolute;width:100%;height:100%;border-radius:50%;background-image:linear-gradient(-225deg,#0245ff,#00e1ff,#5edfff);filter:blur(20px);animation:animate .5s linear infinite}@keyframes animate{0%{transform:rotate(0)}to{transform:rotate(360deg)}}\n"] }]
        }], propDecorators: { fullscreen: [{
                type: Input
            }] } });

var AlertButtonType;
(function (AlertButtonType) {
    AlertButtonType["Aceptar"] = "Aceptar";
    AlertButtonType["Cancelar"] = "Cancelar";
    AlertButtonType["Entendido"] = "Entendido";
})(AlertButtonType || (AlertButtonType = {}));

class FfsjDialogAlertComponent {
    constructor(dialogSelfRef, data) {
        this.dialogSelfRef = dialogSelfRef;
        this.data = data;
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.12", ngImport: i0, type: FfsjDialogAlertComponent, deps: [{ token: i1$3.MatDialogRef }, { token: MAT_DIALOG_DATA }], target: i0.ɵɵFactoryTarget.Component }); }
    static { this.ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.0.0", version: "20.3.12", type: FfsjDialogAlertComponent, isStandalone: true, selector: "lib-ffsj-dialog-alert", ngImport: i0, template: "<h2 mat-dialog-title>{{ data.title }}</h2>\r\n<mat-dialog-content>\r\n  {{ data.content }}\r\n</mat-dialog-content>\r\n<mat-dialog-actions>\r\n  @for (button of data.buttonsAlert; track $index) {\r\n    <button mat-button (click)=\"dialogSelfRef.close(button)\">{{ button }}</button>\r\n  }\r\n</mat-dialog-actions>\r\n", styles: [""], dependencies: [{ kind: "ngmodule", type: MatDialogModule }, { kind: "directive", type: i1$3.MatDialogTitle, selector: "[mat-dialog-title], [matDialogTitle]", inputs: ["id"], exportAs: ["matDialogTitle"] }, { kind: "directive", type: i1$3.MatDialogActions, selector: "[mat-dialog-actions], mat-dialog-actions, [matDialogActions]", inputs: ["align"] }, { kind: "directive", type: i1$3.MatDialogContent, selector: "[mat-dialog-content], mat-dialog-content, [matDialogContent]" }] }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.12", ngImport: i0, type: FfsjDialogAlertComponent, decorators: [{
            type: Component,
            args: [{ selector: 'lib-ffsj-dialog-alert', standalone: true, imports: [MatDialogModule], template: "<h2 mat-dialog-title>{{ data.title }}</h2>\r\n<mat-dialog-content>\r\n  {{ data.content }}\r\n</mat-dialog-content>\r\n<mat-dialog-actions>\r\n  @for (button of data.buttonsAlert; track $index) {\r\n    <button mat-button (click)=\"dialogSelfRef.close(button)\">{{ button }}</button>\r\n  }\r\n</mat-dialog-actions>\r\n" }]
        }], ctorParameters: () => [{ type: i1$3.MatDialogRef }, { type: undefined, decorators: [{
                    type: Inject,
                    args: [MAT_DIALOG_DATA]
                }] }] });

class FfsjDialogAlertService {
    constructor(dialog) {
        this.dialog = dialog;
    }
    openDialogAlert(data) {
        const dialogRef = this.dialog.open(FfsjDialogAlertComponent, {
            data: data,
            width: '600px',
        });
        return dialogRef;
    }
    static { this.ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.3.12", ngImport: i0, type: FfsjDialogAlertService, deps: [{ token: i1$3.MatDialog }], target: i0.ɵɵFactoryTarget.Injectable }); }
    static { this.ɵprov = i0.ɵɵngDeclareInjectable({ minVersion: "12.0.0", version: "20.3.12", ngImport: i0, type: FfsjDialogAlertService, providedIn: 'root' }); }
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.3.12", ngImport: i0, type: FfsjDialogAlertService, decorators: [{
            type: Injectable,
            args: [{
                    providedIn: 'root'
                }]
        }], ctorParameters: () => [{ type: i1$3.MatDialog }] });

/*
 * Public API Surface of ffsj-web-components
 */

/**
 * Generated bundle index. Do not edit.
 */

export { AlertButtonType, AlertType, AuthGuard, AuthService, EncoderService, FfsjAlertComponent, FfsjAlertService, FfsjDialogAlertComponent, FfsjDialogAlertService, FfsjLoginComponent, FfsjSpinnerComponent, FfsjWebComponentsComponent, FfsjWebComponentsService };
//# sourceMappingURL=ffsj-web-components.mjs.map
