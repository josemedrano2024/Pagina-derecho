// ============================================================
// CONSTANTES Y TOPES LEGALES
// ============================================================
const SALARIO_MINIMO_REF = 408.80;
const TOPE_INDEMNIZACION = SALARIO_MINIMO_REF * 4;
const TOPE_RENUNCIA = SALARIO_MINIMO_REF * 2;
const TASA_ISSS = 0.03;
const TASA_AFP = 0.0725;

// ============================================================
// UTILIDADES
// ============================================================
function redondear2(num) { return Math.round((num + Number.EPSILON) * 100) / 100; }
function formatearMoneda(valor) { return '$' + redondear2(valor).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function formatearFecha(fechaStr) {
    if (!fechaStr) return '';
    const fecha = new Date(fechaStr + 'T00:00:00');
    return fecha.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
}
function formatearFechaISO(fecha) {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
function numeroALetras(num) {
    const unidades = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
    const decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
    function convertirGrupo(n) {
        let output = '';
        if (n >= 100) { output += centenas[Math.floor(n / 100)] + ' '; n %= 100; }
        if (n >= 20) { output += decenas[Math.floor(n / 10)] + ' '; n %= 10; }
        else if (n >= 10) { const esp = ['DIEZ','ONCE','DOCE','TRECE','CATORCE','QUINCE','DIECISEIS','DIECISIETE','DIECIOCHO','DIECINUEVE']; output += esp[n - 10] + ' '; n = 0; }
        if (n > 0) output += unidades[n] + ' ';
        return output.trim();
    }
    if (num === 0) return 'CERO';
    const entero = Math.floor(num);
    const centavos = Math.round((num - entero) * 100);
    let letras = '';
    if (entero >= 1000000) letras += convertirGrupo(Math.floor(entero / 1000000)) + ' MILLONES ';
    if (entero >= 1000) letras += convertirGrupo(Math.floor((entero % 1000000) / 1000)) + ' MIL ';
    letras += convertirGrupo(entero % 1000);
    letras = letras.trim() + ' DÓLARES';
    if (centavos > 0) letras += ' CON ' + centavos.toString().padStart(2, '0') + '/100';
    return letras;
}

// ============================================================
// DÍAS DE ASUETO SEGÚN LEY SALVADOREÑA
// ============================================================
const ASUETOS_NACIONALES = ['01-01', '05-01', '08-06', '09-15', '11-02', '12-25'];
const ASUETOS_SAN_SALVADOR = ['08-03', '08-05'];

function calcularSemanaSanta(anio) {
    const a = anio % 19, b = Math.floor(anio / 100), c = anio % 100;
    const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mes = Math.floor((h + l - 7 * m + 114) / 31);
    const dia = ((h + l - 7 * m + 114) % 31) + 1;
    const pascua = new Date(anio, mes - 1, dia);
    const jueves = new Date(pascua); jueves.setDate(pascua.getDate() - 3);
    const viernes = new Date(pascua); viernes.setDate(pascua.getDate() - 2);
    const sabado = new Date(pascua); sabado.setDate(pascua.getDate() - 1);
    return [formatearFechaISO(jueves), formatearFechaISO(viernes), formatearFechaISO(sabado)];
}

function esAsuetoNacional(fechaStr) {
    const fecha = new Date(fechaStr + 'T00:00:00');
    const mesDia = String(fecha.getMonth() + 1).padStart(2, '0') + '-' + String(fecha.getDate()).padStart(2, '0');
    if (ASUETOS_NACIONALES.includes(mesDia)) return true;
    if (ASUETOS_SAN_SALVADOR.includes(mesDia)) return true;
    if (calcularSemanaSanta(fecha.getFullYear()).includes(fechaStr)) return true;
    return false;
}

// ============================================================
// ESTADO GLOBAL
// ============================================================
let estado = {
    paso: 1,
    causa: 'despido',
    tipoDespido: 'injustificado',
    notificacion: 'si',
    tipoAguinaldo: 'proporcional',
    fechaUltimasVacaciones: '',
    laboroAsueto: 'no',
    diasAsueto: [],
    tieneExtras: 'no',
    fechaExtras: '',
    horaInicioExtras: '',
    horaFinExtras: ''
};

// ============================================================
// NAVEGACIÓN POR PASOS
// ============================================================
function irAPaso(n) {
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    const paso = document.getElementById('step-' + n);
    if (paso) paso.classList.add('active');
    estado.paso = n;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// PASO 1 → 2
// ============================================================
document.getElementById('btnNext1').addEventListener('click', function() {
    const trabajador = document.getElementById('trabajador').value.trim();
    const patrono = document.getElementById('patrono').value.trim();
    const salario = parseFloat(document.getElementById('salarioMensual').value);
    const ingreso = document.getElementById('fechaIngreso').value;
    const terminacion = document.getElementById('fechaTerminacion').value;

    if (!trabajador || !patrono || !salario || salario <= 0 || !ingreso || !terminacion) {
        alert('Por favor complete todos los campos correctamente.');
        return;
    }
    if (new Date(ingreso) > new Date(terminacion)) {
        alert('La fecha de ingreso no puede ser posterior a la fecha de terminación.');
        return;
    }
    irAPaso(2);
});

// ============================================================
// PASO 2: CAUSA
// ============================================================
document.querySelectorAll('input[name="causa"]').forEach(radio => {
    radio.addEventListener('change', function() {
        estado.causa = this.value;
        const grupoDespido = document.getElementById('grupoTipoDespido');
        const grupoNotif = document.getElementById('grupoNotificacion');
        if (this.value === 'despido') {
            grupoDespido.style.display = 'block';
            grupoNotif.style.display = 'none';
        } else {
            grupoDespido.style.display = 'none';
            grupoNotif.style.display = 'block';
        }
    });
});

document.querySelectorAll('input[name="tipoDespido"]').forEach(radio => {
    radio.addEventListener('change', function() { estado.tipoDespido = this.value; });
});

document.querySelectorAll('input[name="notificacion"]').forEach(radio => {
    radio.addEventListener('change', function() { estado.notificacion = this.value; });
});

document.getElementById('btnNext2').addEventListener('click', function() {
    if (estado.causa === 'despido') {
        if (estado.tipoDespido === 'justificado') {
            alert('Según el diagrama, solo se calcula liquidación para despido INJUSTIFICADO.');
            return;
        }
    }
    irAPaso(3);
});

// ============================================================
// PASO 3: AGUINALDO
// ============================================================
document.querySelectorAll('input[name="tipoAguinaldo"]').forEach(radio => {
    radio.addEventListener('change', function() {
        estado.tipoAguinaldo = this.value;
    });
});

document.getElementById('btnNext3').addEventListener('click', function() {
    // Verificar si la fecha de terminación cae entre 1 y 30 de octubre de 2026
    const fechaTerm = document.getElementById('fechaTerminacion').value;
    if (fechaTerm) {
        const f = new Date(fechaTerm + 'T00:00:00');
        const anio = f.getFullYear();
        const mes = f.getMonth() + 1;
        const dia = f.getDate();
        if (anio === 2026 && mes === 10 && dia >= 1 && dia <= 30) {
            document.getElementById('avisoAguinaldo').textContent = '⚠️ La fecha de terminación está entre el 1 y el 30 de octubre de 2026. El aguinaldo debe ser PROPORCIONAL.';
        } else {
            document.getElementById('avisoAguinaldo').textContent = '';
        }
    }
    irAPaso(4);
});

// ============================================================
// PASO 4: VACACIONES (CALENDARIO)
// ============================================================
let fpVacaciones;
document.addEventListener('DOMContentLoaded', function() {
    const hoy = new Date();
    const maxFecha = formatearFechaISO(hoy);
    fpVacaciones = flatpickr('#fechaUltimasVacaciones', {
        dateFormat: 'Y-m-d',
        locale: 'es',
        maxDate: maxFecha,
        onChange: function(selectedDates, dateStr) {
            estado.fechaUltimasVacaciones = dateStr;
        }
    });
});

document.getElementById('btnNext4').addEventListener('click', function() {
    if (!estado.fechaUltimasVacaciones) {
        alert('Por favor seleccione la fecha de sus últimas vacaciones.');
        return;
    }
    irAPaso(5);
});

// ============================================================
// PASO 5: DÍAS DE ASUETO
// ============================================================
document.querySelectorAll('input[name="laboroAsueto"]').forEach(radio => {
    radio.addEventListener('change', function() {
        estado.laboroAsueto = this.value;
        const grupo = document.getElementById('grupoCalendarioAsueto');
        if (this.value === 'si') {
            grupo.style.display = 'block';
        } else {
            grupo.style.display = 'none';
        }
    });
});

let fpAsueto;
document.addEventListener('DOMContentLoaded', function() {
    const hoy = new Date();
    const maxFecha = formatearFechaISO(hoy);
    fpAsueto = flatpickr('#diasAsueto', {
        mode: 'multiple',
        dateFormat: 'Y-m-d',
        locale: 'es',
        maxDate: maxFecha,
        disable: [
            function(date) {
                const fechaStr = formatearFechaISO(date);
                return !esAsuetoNacional(fechaStr);
            }
        ],
        onChange: function(selectedDates) {
            estado.diasAsueto = selectedDates.map(d => formatearFechaISO(d));
            renderizarListaAsuetos(estado.diasAsueto);
            const aviso = document.getElementById('avisoAsueto');
            if (estado.diasAsueto.length > 0) {
                aviso.textContent = `✅ ${estado.diasAsueto.length} día(s) de asueto seleccionado(s).`;
            } else {
                aviso.textContent = '';
            }
        }
    });
});

function renderizarListaAsuetos(fechas) {
    const contenedor = document.getElementById('listaAsuetos');
    contenedor.innerHTML = '';
    fechas.sort().forEach(fecha => {
        const tag = document.createElement('span');
        tag.className = 'tag-dia';
        tag.innerHTML = `${formatearFecha(fecha)} <span class="cerrar" data-fecha="${fecha}">&times;</span>`;
        tag.querySelector('.cerrar').addEventListener('click', function() {
            const f = this.getAttribute('data-fecha');
            const idx = estado.diasAsueto.indexOf(f);
            if (idx > -1) estado.diasAsueto.splice(idx, 1);
            fpAsueto.setDate(estado.diasAsueto);
            renderizarListaAsuetos(estado.diasAsueto);
        });
        contenedor.appendChild(tag);
    });
}

document.getElementById('btnNext5').addEventListener('click', function() {
    irAPaso(6);
});

// ============================================================
// PASO 6: HORAS EXTRAS
// ============================================================
document.querySelectorAll('input[name="tieneExtras"]').forEach(radio => {
    radio.addEventListener('change', function() {
        estado.tieneExtras = this.value;
        const grupo = document.getElementById('grupoExtras');
        if (this.value === 'si') {
            grupo.style.display = 'block';
        } else {
            grupo.style.display = 'none';
        }
    });
});

// ============================================================
// CÁLCULO FINAL
// ============================================================
document.getElementById('btnCalcularFinal').addEventListener('click', function() {
    // Leer valores del paso 6
    estado.fechaExtras = document.getElementById('fechaExtras').value;
    estado.horaInicioExtras = document.getElementById('horaInicioExtras').value;
    estado.horaFinExtras = document.getElementById('horaFinExtras').value;

    if (estado.tieneExtras === 'si') {
        if (!estado.fechaExtras || !estado.horaInicioExtras || !estado.horaFinExtras) {
            alert('Por favor complete la información de las horas extras.');
            return;
        }
    }

    const datos = calcularTodo();
    if (datos) {
        renderizarComprobante(datos);
        irAPaso(7);
    }
});

// ============================================================
// LÓGICA DE CÁLCULO COMPLETA
// ============================================================
function calcularTodo() {
    const trabajador = document.getElementById('trabajador').value || 'N/A';
    const patrono = document.getElementById('patrono').value || 'N/A';
    const salarioMensual = parseFloat(document.getElementById('salarioMensual').value) || 0;
    const fechaIngresoStr = document.getElementById('fechaIngreso').value;
    const fechaTerminacionStr = document.getElementById('fechaTerminacion').value;

    let anios = 0, meses = 0;
    if (fechaIngresoStr && fechaTerminacionStr) {
        const ingreso = new Date(fechaIngresoStr + 'T00:00:00');
        const terminacion = new Date(fechaTerminacionStr + 'T00:00:00');
        let diffAnios = terminacion.getFullYear() - ingreso.getFullYear();
        let diffMeses = terminacion.getMonth() - ingreso.getMonth();
        if (diffMeses < 0 || (diffMeses === 0 && terminacion.getDate() < ingreso.getDate())) {
            diffAnios--; diffMeses += 12;
        }
        anios = diffAnios; meses = diffMeses;
    }

    const SBD = salarioMensual / 30;

    // --- VACACIONES ---
    let vacacionProporcional = 0;
    if (estado.fechaUltimasVacaciones) {
        const ultimas = new Date(estado.fechaUltimasVacaciones + 'T00:00:00');
        const term = new Date(fechaTerminacionStr + 'T00:00:00');
        const diffMeses = (term.getFullYear() - ultimas.getFullYear()) * 12 + (term.getMonth() - ultimas.getMonth());
        const vacacionCompleta = SBD * 15 * 1.3;
        vacacionProporcional = (vacacionCompleta * Math.min(diffMeses, 12)) / 12;
    }

    // --- AGUINALDO ---
    let diasAguinaldo;
    const antiguedadTotal = anios + (meses / 12);
    if (antiguedadTotal < 3) diasAguinaldo = 15;
    else if (antiguedadTotal <= 10) diasAguinaldo = 19;
    else diasAguinaldo = 21;

    let aguinaldoProporcional = 0;
    if (estado.tipoAguinaldo === 'proporcional') {
        const aguinaldoCompleto = SBD * diasAguinaldo;
        aguinaldoProporcional = (aguinaldoCompleto / 360) * (meses * 30);
    } else {
        aguinaldoProporcional = SBD * diasAguinaldo;
    }

    // --- INDEMNIZACIÓN O RENUNCIA ---
    let indemnizacion = 0;
    if (estado.causa === 'despido') {
        let salarioDiarioIndem = SBD;
        const topeDiario = TOPE_INDEMNIZACION / 30;
        if (salarioDiarioIndem > topeDiario) salarioDiarioIndem = topeDiario;
        indemnizacion = (anios * 30 + (meses / 12) * 30) * salarioDiarioIndem;
        const minimo = 15 * SBD;
        if (indemnizacion < minimo && (anios > 0 || meses > 0)) indemnizacion = minimo;
    } else {
        let salarioDiarioRen = SBD;
        const topeDiario = TOPE_RENUNCIA / 30;
        if (salarioDiarioRen > topeDiario) salarioDiarioRen = topeDiario;
        indemnizacion = (anios * 15 + (meses / 12) * 15) * salarioDiarioRen;
        const minimo = 15 * SBD;
        if (indemnizacion < minimo && (anios > 0 || meses > 0)) indemnizacion = minimo;
    }

    // --- HORAS EXTRAS ---
    let subtotalExtraDiurnas = 0;
    let subtotalExtraNocturnas = 0;
    if (estado.tieneExtras === 'si') {
        const [hIni, mIni] = estado.horaInicioExtras.split(':').map(Number);
        const [hFin, mFin] = estado.horaFinExtras.split(':').map(Number);
        const minutosTotales = (hFin * 60 + mFin) - (hIni * 60 + mIni);
        const horas = Math.max(0, minutosTotales / 60);

        // Determinar si es diurna o nocturna (7pm - 6am)
        const horaInicioDecimal = hIni + mIni / 60;
        const esNocturna = horaInicioDecimal >= 19 || horaInicioDecimal < 6;

        const salarioHoraDiurna = SBD / 8;
        if (esNocturna) {
            const salarioHoraNocturna = salarioHoraDiurna * 1.25;
            subtotalExtraNocturnas = horas * salarioHoraNocturna * 2;
        } else {
            subtotalExtraDiurnas = horas * salarioHoraDiurna * 2;
        }
    }

    // --- DÍAS DE ASUETO ---
    const montoAsueto = estado.diasAsueto.length * SBD * 2;

    // --- DÍAS DE DESCANSO ---
    // Según el diagrama, no se pregunta por descanso, pero se puede dejar en 0
    const montoDescanso = 0;

    // --- TOTALES ---
    const totalDevengado = vacacionProporcional + aguinaldoProporcional + indemnizacion +
                           subtotalExtraDiurnas + subtotalExtraNocturnas + montoAsueto + montoDescanso;

    const remuneracionGravada = vacacionProporcional + subtotalExtraDiurnas + subtotalExtraNocturnas + montoAsueto;
    const montoExento = indemnizacion + aguinaldoProporcional;

    const isss = Math.min(remuneracionGravada * TASA_ISSS, 30.00);
    const afp = remuneracionGravada * TASA_AFP;
    let isr = 0;
    if (remuneracionGravada > 0) {
        if (remuneracionGravada <= 472) isr = 0;
        else if (remuneracionGravada <= 895.24) isr = (remuneracionGravada - 472) * 0.10;
        else if (remuneracionGravada <= 2038.10) isr = (remuneracionGravada - 895.24) * 0.20 + 42.32;
        else isr = (remuneracionGravada - 2038.10) * 0.30 + 270.89;
    }
    if (remuneracionGravada > 2000) isr = remuneracionGravada * 0.1507;

    const totalDeducciones = isss + afp + isr;
    const montoNeto = totalDevengado - totalDeducciones;

    return {
        trabajador, patrono, salarioMensual, fechaIngresoStr, fechaTerminacionStr,
        anios, meses,
        causa: estado.causa,
        notificacion: estado.notificacion,
        vacacionProporcional, aguinaldoProporcional, indemnizacion,
        subtotalExtraDiurnas, subtotalExtraNocturnas, montoAsueto, montoDescanso,
        totalDevengado, remuneracionGravada, montoExento,
        isss, afp, isr, totalDeducciones, montoNeto
    };
}

// ============================================================
// RENDERIZAR COMPROBANTE
// ============================================================
function renderizarComprobante(datos) {
    if (!datos) return;

    const hoy = new Date();
    document.getElementById('fechaEmision').textContent = 'Emitido el ' + hoy.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

    document.getElementById('infoPartes').innerHTML = `
        <div class="info-item"><span class="label">Persona trabajadora</span><span class="value">${datos.trabajador}</span></div>
        <div class="info-item"><span class="label">Patrono</span><span class="value">${datos.patrono}</span></div>
        <div class="info-item"><span class="label">Salario mensual</span><span class="value">${formatearMoneda(datos.salarioMensual)}</span></div>
        <div class="info-item"><span class="label">Fecha de ingreso</span><span class="value">${formatearFecha(datos.fechaIngresoStr)}</span></div>
        <div class="info-item"><span class="label">Fecha de terminación</span><span class="value">${formatearFecha(datos.fechaTerminacionStr)}</span></div>
        <div class="info-item"><span class="label">Antigüedad</span><span class="value">${datos.anios} años, ${datos.meses} meses</span></div>
        <div class="info-item"><span class="label">Causa</span><span class="value">${datos.causa === 'despido' ? 'Despido injustificado' : 'Renuncia voluntaria'}</span></div>
    `;

    const conceptos = [
        { n: 'Vacación proporcional', l: 'Arts. 177 y 187 CT', m: datos.vacacionProporcional },
        { n: 'Aguinaldo proporcional', l: 'Arts. 196-198 CT', m: datos.aguinaldoProporcional },
        { n: datos.causa === 'despido' ? 'Indemnización por despido injustificado' : 'Compensación económica por renuncia', l: datos.causa === 'despido' ? 'Art. 58 CT' : 'Ley de Renuncia Voluntaria', m: datos.indemnizacion },
        { n: 'Horas extras diurnas', l: 'Art. 169 CT', m: datos.subtotalExtraDiurnas },
        { n: 'Horas extras nocturnas', l: 'Arts. 168 y 169 CT', m: datos.subtotalExtraNocturnas },
        { n: 'Días de asueto laborados', l: 'Art. 192 CT', m: datos.montoAsueto }
    ];

    let filas = '';
    conceptos.forEach(c => {
        if (c.m > 0) filas += `<tr><td>${c.n}</td><td class="legal">${c.l}</td><td class="monto">${formatearMoneda(c.m)}</td></tr>`;
    });

    document.getElementById('cuerpoDesglose').innerHTML = filas;
    document.getElementById('pieDesglose').innerHTML = `
        <tr class="total-row"><td colspan="2"><strong>TOTAL DEVENGADO (BRUTO)</strong></td><td class="monto"><strong>${formatearMoneda(datos.totalDevengado)}</strong></td></tr>
    `;

    document.getElementById('remuneracionGravada').innerHTML = `
        <strong>Remuneración gravada:</strong> ${formatearMoneda(datos.remuneracionGravada)}. 
        <strong>Monto exento:</strong> ${formatearMoneda(datos.montoExento)} (indemnización y aguinaldo).
    `;

    document.getElementById('cuerpoDeducciones').innerHTML = `
        <tr><td>Cotización ISSS</td><td class="legal">Reglamento ISSS, Art. 29</td><td class="monto">-${formatearMoneda(datos.isss)}</td></tr>
        <tr><td>Cotización AFP</td><td class="legal">Ley SAP</td><td class="monto">-${formatearMoneda(datos.afp)}</td></tr>
        <tr><td>Retención ISR</td><td class="legal">Art. 37 Ley ISR</td><td class="monto">-${formatearMoneda(datos.isr)}</td></tr>
        <tr class="total-row"><td colspan="2"><strong>Total deducciones</strong></td><td class="monto"><strong>-${formatearMoneda(datos.totalDeducciones)}</strong></td></tr>
    `;

    document.getElementById('montoNeto').textContent = formatearMoneda(datos.montoNeto);
    document.getElementById('netoLetras').textContent = 'Monto neto en letras: ' + numeroALetras(datos.montoNeto);

    let clausula = '';
    if (datos.causa === 'renuncia') {
        if (datos.notificacion === 'si') {
            clausula = `<br><br><strong>Notificación al patrono:</strong> Se notificó oportunamente al patrono sobre la renuncia voluntaria.`;
        } else {
            clausula = `<br><br><strong>Notificación al patrono:</strong> NO se notificó previamente al patrono, asumiendo las consecuencias legales.`;
        }
    }

    document.getElementById('textoDeclaracion').innerHTML = `
        La persona trabajadora <strong>${datos.trabajador}</strong> declara haber recibido el detalle de las prestaciones económicas que anteceden, 
        calculadas conforme al Código de Trabajo de El Salvador, así como el desglose de las retenciones de ley aplicadas y el monto neto resultante. 
        Este comprobante se suscribe en la fecha que se indica al pie de las firmas.${clausula}
    `;

    document.getElementById('firmaTrabajador').textContent = datos.trabajador;
    document.getElementById('firmaPatrono').textContent = datos.patrono;
}

// ============================================================
// EVENTOS FINALES
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('btnImprimir').addEventListener('click', () => window.print());
    document.getElementById('btnReiniciar').addEventListener('click', () => location.reload());

    // Inicializar calendarios de flatpickr
    const hoy = new Date();
    const maxFecha = formatearFechaISO(hoy);

    flatpickr('#fechaUltimasVacaciones', {
        dateFormat: 'Y-m-d', locale: 'es', maxDate: maxFecha,
        onChange: (d, s) => { estado.fechaUltimasVacaciones = s; }
    });

    flatpickr('#diasAsueto', {
        mode: 'multiple', dateFormat: 'Y-m-d', locale: 'es', maxDate: maxFecha,
        disable: [date => !esAsuetoNacional(formatearFechaISO(date))],
        onChange: (selectedDates) => {
            estado.diasAsueto = selectedDates.map(d => formatearFechaISO(d));
            renderizarListaAsuetos(estado.diasAsueto);
            const aviso = document.getElementById('avisoAsueto');
            aviso.textContent = estado.diasAsueto.length > 0 
                ? `✅ ${estado.diasAsueto.length} día(s) de asueto seleccionado(s).` 
                : '';
        }
    });
});