// ============================================================
// CONSTANTES Y TOPES LEGALES
// ============================================================
const SALARIO_MINIMO_REF = 408.80;
const TOPE_INDEMNIZACION = SALARIO_MINIMO_REF * 4;
const TOPE_RENUNCIA = SALARIO_MINIMO_REF * 2;
const TASA_ISSS = 0.03;
const TASA_AFP = 0.0725;

// Vacaciones: 15 días + 30%; alojamiento y alimentación suman 25% cada uno (15 x 1.25)
const DIAS_VACACION = 15;
const RECARGO_VACACION = 0.30;
const RECARGO_ESPECIE = 0.25;

// Día de descanso laborado: salario diario + 50% de recargo
const RECARGO_DESCANSO = 0.50;

// Aguinaldo: el período inicia el 12 de diciembre; "Completo" se bloquea antes del 1 de octubre
const AGUINALDO_INICIO_PERIODO = { mes: 11, dia: 12 };  // mes base 0 (11 = diciembre)
const AGUINALDO_BLOQUEO = { mes: 9, dia: 1 };           // mes base 0 (9 = octubre)

// ============================================================
// UTILIDADES
// ============================================================
function redondear2(num) { return Math.round((num + Number.EPSILON) * 100) / 100; }
function formatearMoneda(valor) { return '$' + redondear2(valor).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function parseFecha(fechaStr) { return new Date(fechaStr + 'T00:00:00'); }
function diasEntre(a, b) { return Math.round((b - a) / 86400000); }
function formatearFecha(fechaStr) {
    if (!fechaStr) return '';
    return parseFecha(fechaStr).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
}
function formatearFechaISO(fecha) {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
function valorCampo(id) { return document.getElementById(id).value; }

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
    const fecha = parseFecha(fechaStr);
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
    aguinaldoPagado: 'no',
    gozoVacaciones: 'si',
    fechaUltimasVacaciones: '',
    alojamiento: 'no',
    alimentacion: 'no',
    laboroDescanso: 'no',
    diasDescanso: [],
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
    if (n === 3) actualizarPasoAguinaldo();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Utilidad: enlaza un grupo de radios con una clave del estado
function enlazarRadios(nombre, clave, alCambiar) {
    document.querySelectorAll(`input[name="${nombre}"]`).forEach(radio => {
        radio.addEventListener('change', function() {
            estado[clave] = this.value;
            if (alCambiar) alCambiar(this.value);
        });
    });
}

function mostrar(id, visible) {
    document.getElementById(id).style.display = visible ? 'block' : 'none';
}

// ============================================================
// PASO 1 → 2
// ============================================================
document.getElementById('btnNext1').addEventListener('click', function() {
    const trabajador = valorCampo('trabajador').trim();
    const patrono = valorCampo('patrono').trim();
    const salario = parseFloat(valorCampo('salarioMensual'));
    const ingreso = valorCampo('fechaIngreso');
    const terminacion = valorCampo('fechaTerminacion');

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
enlazarRadios('causa', 'causa', function(valor) {
    mostrar('grupoTipoDespido', valor === 'despido');
    mostrar('grupoNotificacion', valor !== 'despido');
});
enlazarRadios('tipoDespido', 'tipoDespido');
enlazarRadios('notificacion', 'notificacion');

document.getElementById('btnNext2').addEventListener('click', function() {
    if (estado.causa === 'despido' && estado.tipoDespido === 'justificado') {
        alert('Según el diagrama, solo se calcula liquidación para despido INJUSTIFICADO.');
        return;
    }
    irAPaso(3);
});

// ============================================================
// PASO 3: AGUINALDO (con bloqueo de "Completo")
// ============================================================
function aguinaldoCompletoBloqueado(fechaTermStr) {
    if (!fechaTermStr) return false;
    const t = parseFecha(fechaTermStr);
    const fechaBloqueo = new Date(t.getFullYear(), AGUINALDO_BLOQUEO.mes, AGUINALDO_BLOQUEO.dia);
    return t < fechaBloqueo;
}

function actualizarPasoAguinaldo() {
    const fechaTerm = valorCampo('fechaTerminacion');
    const radioCompleto = document.getElementById('radioAguinaldoCompleto');
    const labelCompleto = document.getElementById('labelAguinaldoCompleto');
    const aviso = document.getElementById('avisoAguinaldo');

    if (aguinaldoCompletoBloqueado(fechaTerm)) {
        radioCompleto.disabled = true;
        labelCompleto.classList.add('deshabilitado');
        if (estado.tipoAguinaldo === 'completo') {
            estado.tipoAguinaldo = 'proporcional';
            document.querySelector('input[name="tipoAguinaldo"][value="proporcional"]').checked = true;
        }
        aviso.textContent = 'La terminación es anterior al 1 de octubre: el aguinaldo completo está bloqueado. Solo procede el aguinaldo proporcional.';
    } else {
        radioCompleto.disabled = false;
        labelCompleto.classList.remove('deshabilitado');
        aviso.textContent = fechaTerm
            ? 'Desde el 1 de octubre se permite el aguinaldo completo, siempre que el aguinaldo de este año no se haya pagado.'
            : '';
    }
    mostrar('grupoAguinaldoPagado', estado.tipoAguinaldo === 'completo');
}

enlazarRadios('tipoAguinaldo', 'tipoAguinaldo', actualizarPasoAguinaldo);
enlazarRadios('aguinaldoPagado', 'aguinaldoPagado');
document.getElementById('fechaTerminacion').addEventListener('change', actualizarPasoAguinaldo);

document.getElementById('btnNext3').addEventListener('click', function() {
    irAPaso(4);
});

// ============================================================
// LISTA DE FECHAS (etiquetas con X) — reutilizable
// ============================================================
const calendarios = {};

function renderizarLista(contenedorId, calendarioClave, estadoClave) {
    const contenedor = document.getElementById(contenedorId);
    contenedor.innerHTML = '';
    estado[estadoClave].sort().forEach(fecha => {
        const tag = document.createElement('span');
        tag.className = 'tag-dia';
        tag.innerHTML = `${formatearFecha(fecha)} <span class="cerrar" data-fecha="${fecha}">&times;</span>`;
        tag.querySelector('.cerrar').addEventListener('click', function() {
            const f = this.getAttribute('data-fecha');
            const idx = estado[estadoClave].indexOf(f);
            if (idx > -1) estado[estadoClave].splice(idx, 1);
            calendarios[calendarioClave].setDate(estado[estadoClave], false);
            renderizarLista(contenedorId, calendarioClave, estadoClave);
            actualizarAvisoLista(calendarioClave, estadoClave);
        });
        contenedor.appendChild(tag);
    });
}

function actualizarAvisoLista(calendarioClave, estadoClave) {
    const n = estado[estadoClave].length;
    const idAviso = calendarioClave === 'descanso' ? 'avisoDescanso' : 'avisoAsueto';
    const etiqueta = calendarioClave === 'descanso' ? 'día(s) de descanso' : 'día(s) de asueto';
    document.getElementById(idAviso).textContent = n > 0 ? `${n} ${etiqueta} seleccionado(s).` : '';
}

// Los calendarios solo permiten fechas entre el ingreso y la terminación
function aplicarLimites(instancia) {
    instancia.set('minDate', valorCampo('fechaIngreso') || null);
    instancia.set('maxDate', valorCampo('fechaTerminacion') || null);
}

// ============================================================
// PASO 4: VACACIONES (Sí/No, calendario, alojamiento y comida)
// ============================================================
enlazarRadios('gozoVacaciones', 'gozoVacaciones', function(valor) {
    mostrar('grupoFechaVacaciones', valor === 'si');
    actualizarAvisoVacaciones();
});
enlazarRadios('alojamiento', 'alojamiento', actualizarAvisoVacaciones);
enlazarRadios('alimentacion', 'alimentacion', actualizarAvisoVacaciones);

function actualizarAvisoVacaciones() {
    const partes = [];
    if (estado.gozoVacaciones === 'no') partes.push('Sin vacaciones previas: se calcula desde el último aniversario de ingreso.');
    if (estado.alojamiento === 'si') partes.push('Alojamiento: +25% sobre 15 días (15 × 1.25).');
    if (estado.alimentacion === 'si') partes.push('Alimentación: +25% sobre 15 días (15 × 1.25).');
    document.getElementById('avisoVacaciones').textContent = partes.join(' ');
}

document.getElementById('btnNext4').addEventListener('click', function() {
    if (estado.gozoVacaciones === 'si' && !estado.fechaUltimasVacaciones) {
        alert('Por favor seleccione la fecha de sus últimas vacaciones.');
        return;
    }
    irAPaso(5);
});

// ============================================================
// PASO 5: DÍAS DE DESCANSO (calendario manual, no pagados)
// ============================================================
enlazarRadios('laboroDescanso', 'laboroDescanso', function(valor) {
    mostrar('grupoCalendarioDescanso', valor === 'si');
    if (valor === 'no') {
        estado.diasDescanso = [];
        if (calendarios.descanso) calendarios.descanso.clear(false);
        renderizarLista('listaDescansos', 'descanso', 'diasDescanso');
        actualizarAvisoLista('descanso', 'diasDescanso');
    }
});

document.getElementById('btnNext5').addEventListener('click', function() {
    if (estado.laboroDescanso === 'si' && estado.diasDescanso.length === 0) {
        alert('Seleccione al menos un día de descanso laborado, o marque "No".');
        return;
    }
    irAPaso(6);
});

// ============================================================
// PASO 6: DÍAS DE ASUETO
// ============================================================
enlazarRadios('laboroAsueto', 'laboroAsueto', function(valor) {
    mostrar('grupoCalendarioAsueto', valor === 'si');
    if (valor === 'no') {
        estado.diasAsueto = [];
        if (calendarios.asueto) calendarios.asueto.clear(false);
        renderizarLista('listaAsuetos', 'asueto', 'diasAsueto');
        actualizarAvisoLista('asueto', 'diasAsueto');
    }
});

document.getElementById('btnNext6').addEventListener('click', function() {
    irAPaso(7);
});

// ============================================================
// PASO 7: HORAS EXTRAS
// ============================================================
enlazarRadios('tieneExtras', 'tieneExtras', function(valor) {
    mostrar('grupoExtras', valor === 'si');
});

// ============================================================
// CÁLCULO FINAL
// ============================================================
document.getElementById('btnCalcularFinal').addEventListener('click', function() {
    estado.fechaExtras = valorCampo('fechaExtras');
    estado.horaInicioExtras = valorCampo('horaInicioExtras');
    estado.horaFinExtras = valorCampo('horaFinExtras');

    if (estado.tieneExtras === 'si') {
        if (!estado.fechaExtras || !estado.horaInicioExtras || !estado.horaFinExtras) {
            alert('Por favor complete la información de las horas extras.');
            return;
        }
    }

    const datos = calcularTodo();
    if (datos) {
        renderizarComprobante(datos);
        irAPaso(8);
    }
});

// ============================================================
// LÓGICA DE CÁLCULO COMPLETA
// ============================================================
function calcularTodo() {
    const trabajador = valorCampo('trabajador') || 'N/A';
    const patrono = valorCampo('patrono') || 'N/A';
    const salarioMensual = parseFloat(valorCampo('salarioMensual')) || 0;
    const fechaIngresoStr = valorCampo('fechaIngreso');
    const fechaTerminacionStr = valorCampo('fechaTerminacion');

    const ingreso = parseFecha(fechaIngresoStr);
    const terminacion = parseFecha(fechaTerminacionStr);

    let anios = 0, meses = 0;
    let diffAnios = terminacion.getFullYear() - ingreso.getFullYear();
    let diffMeses = terminacion.getMonth() - ingreso.getMonth();
    if (diffMeses < 0 || (diffMeses === 0 && terminacion.getDate() < ingreso.getDate())) {
        diffAnios--; diffMeses += 12;
    }
    anios = diffAnios; meses = diffMeses;

    const SBD = salarioMensual / 30;

    // --- VACACIONES (15 días + 30%, más 25% por alojamiento y/o alimentación) ---
    let inicioVac;
    if (estado.gozoVacaciones === 'si' && estado.fechaUltimasVacaciones) {
        inicioVac = parseFecha(estado.fechaUltimasVacaciones);
    } else {
        // Sin vacaciones previas: desde el último aniversario de ingreso
        inicioVac = new Date(terminacion.getFullYear(), ingreso.getMonth(), ingreso.getDate());
        if (inicioVac > terminacion) inicioVac.setFullYear(inicioVac.getFullYear() - 1);
        if (inicioVac < ingreso) inicioVac = ingreso;
    }
    const fraccionVac = Math.min(Math.max(diasEntre(inicioVac, terminacion), 0) / 365, 1);
    const baseVac = SBD * DIAS_VACACION;

    const vacacionProporcional = baseVac * (1 + RECARGO_VACACION) * fraccionVac;
    const vacacionAlojamiento = estado.alojamiento === 'si' ? baseVac * RECARGO_ESPECIE * fraccionVac : 0;
    const vacacionAlimentacion = estado.alimentacion === 'si' ? baseVac * RECARGO_ESPECIE * fraccionVac : 0;

    // --- AGUINALDO ---
    const antiguedadTotal = anios + (meses / 12);
    let diasAguinaldo;
    if (antiguedadTotal < 3) diasAguinaldo = 15;
    else if (antiguedadTotal < 10) diasAguinaldo = 19;
    else diasAguinaldo = 21;

    // Seguridad: si "Completo" está bloqueado por fecha, se usa proporcional
    let tipoAguinaldo = estado.tipoAguinaldo;
    if (tipoAguinaldo === 'completo' && aguinaldoCompletoBloqueado(fechaTerminacionStr)) tipoAguinaldo = 'proporcional';

    let aguinaldoProporcional = 0;
    if (tipoAguinaldo === 'completo') {
        aguinaldoProporcional = estado.aguinaldoPagado === 'si' ? 0 : SBD * diasAguinaldo;
    } else {
        // Proporcional desde el 12 de diciembre (o desde el ingreso, si fue posterior)
        const limiteAnio = new Date(terminacion.getFullYear(), AGUINALDO_INICIO_PERIODO.mes, AGUINALDO_INICIO_PERIODO.dia);
        let inicioAg = terminacion >= limiteAnio
            ? limiteAnio
            : new Date(terminacion.getFullYear() - 1, AGUINALDO_INICIO_PERIODO.mes, AGUINALDO_INICIO_PERIODO.dia);
        if (ingreso > inicioAg) inicioAg = ingreso;
        const diasPeriodo = Math.min(diasEntre(inicioAg, terminacion) + 1, 365);
        aguinaldoProporcional = (SBD * diasAguinaldo * diasPeriodo) / 365;
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

        const horaInicioDecimal = hIni + mIni / 60;
        const esNocturna = horaInicioDecimal >= 19 || horaInicioDecimal < 6;

        const salarioHoraDiurna = SBD / 8;
        if (esNocturna) {
            subtotalExtraNocturnas = horas * salarioHoraDiurna * 1.25 * 2;
        } else {
            subtotalExtraDiurnas = horas * salarioHoraDiurna * 2;
        }
    }

    // --- DÍAS DE ASUETO ---
    const montoAsueto = estado.diasAsueto.length * SBD * 2;

    // --- DÍAS DE DESCANSO LABORADOS (no pagados): salario diario + 50% ---
    const montoDescanso = estado.diasDescanso.length * SBD * (1 + RECARGO_DESCANSO);

    // --- TOTALES ---
    const totalDevengado = vacacionProporcional + vacacionAlojamiento + vacacionAlimentacion +
                           aguinaldoProporcional + indemnizacion +
                           subtotalExtraDiurnas + subtotalExtraNocturnas + montoAsueto + montoDescanso;

    const remuneracionGravada = vacacionProporcional + vacacionAlojamiento + vacacionAlimentacion +
                                subtotalExtraDiurnas + subtotalExtraNocturnas + montoAsueto + montoDescanso;
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
        diasDescansoCant: estado.diasDescanso.length,
        vacacionProporcional, vacacionAlojamiento, vacacionAlimentacion,
        aguinaldoProporcional, indemnizacion,
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
        { n: 'Vacación proporcional (15 días + 30%)', l: 'Arts. 177 y 187 CT', m: datos.vacacionProporcional },
        { n: 'Adicional 25% por alojamiento (vacación)', l: 'Art. 187 CT', m: datos.vacacionAlojamiento },
        { n: 'Adicional 25% por alimentación (vacación)', l: 'Art. 187 CT', m: datos.vacacionAlimentacion },
        { n: 'Aguinaldo', l: 'Arts. 196-198 CT', m: datos.aguinaldoProporcional },
        { n: datos.causa === 'despido' ? 'Indemnización por despido injustificado' : 'Compensación económica por renuncia', l: datos.causa === 'despido' ? 'Art. 58 CT' : 'Ley de Renuncia Voluntaria', m: datos.indemnizacion },
        { n: `Días de descanso laborados no pagados (${datos.diasDescansoCant})`, l: 'Art. 175 CT', m: datos.montoDescanso },
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
// INICIALIZACIÓN (una sola vez)
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('btnImprimir').addEventListener('click', () => window.print());
    document.getElementById('btnReiniciar').addEventListener('click', () => location.reload());

    // Vacaciones: última fecha de vacaciones
    calendarios.vacaciones = flatpickr('#fechaUltimasVacaciones', {
        dateFormat: 'Y-m-d', locale: 'es',
        onOpen: (d, s, inst) => aplicarLimites(inst),
        onChange: (d, dateStr) => { estado.fechaUltimasVacaciones = dateStr; }
    });

    // Días de descanso: calendario manual, cualquier fecha del período laborado
    calendarios.descanso = flatpickr('#diasDescanso', {
        mode: 'multiple', dateFormat: 'Y-m-d', locale: 'es',
        onOpen: (d, s, inst) => aplicarLimites(inst),
        onChange: (selectedDates) => {
            estado.diasDescanso = selectedDates.map(d => formatearFechaISO(d));
            renderizarLista('listaDescansos', 'descanso', 'diasDescanso');
            actualizarAvisoLista('descanso', 'diasDescanso');
        }
    });

    // Días de asueto: solo fechas de asueto
    calendarios.asueto = flatpickr('#diasAsueto', {
        mode: 'multiple', dateFormat: 'Y-m-d', locale: 'es',
        disable: [date => !esAsuetoNacional(formatearFechaISO(date))],
        onOpen: (d, s, inst) => aplicarLimites(inst),
        onChange: (selectedDates) => {
            estado.diasAsueto = selectedDates.map(d => formatearFechaISO(d));
            renderizarLista('listaAsuetos', 'asueto', 'diasAsueto');
            actualizarAvisoLista('asueto', 'diasAsueto');
        }
    });

    actualizarAvisoVacaciones();
    actualizarPasoAguinaldo();
});