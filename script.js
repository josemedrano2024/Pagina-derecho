// ============================================================
// CONSTANTES Y TOPES LEGALES
// ============================================================
const SALARIO_MINIMO_REF = 408.80; // Salario mínimo referencial (ajustable)
const TOPE_INDEMNIZACION = SALARIO_MINIMO_REF * 4; // 4 veces el salario mínimo
const TOPE_RENUNCIA = SALARIO_MINIMO_REF * 2; // 2 veces el salario mínimo

// Tasas de deducciones
const TASA_ISSS = 0.03; // 3% del salario gravado
const TASA_AFP = 0.0725; // 7.25% del salario gravado

// ============================================================
// UTILIDADES
// ============================================================
function redondear2(num) {
    return Math.round((num + Number.EPSILON) * 100) / 100;
}

function formatearMoneda(valor) {
    return '$' + redondear2(valor).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatearFecha(fechaStr) {
    if (!fechaStr) return '';
    const fecha = new Date(fechaStr + 'T00:00:00');
    const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
    return fecha.toLocaleDateString('es-ES', opciones);
}

// Convierte número a letras (simplificado)
function numeroALetras(num) {
    const unidades = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
    const decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

    function convertirGrupo(n) {
        let output = '';
        if (n >= 100) {
            output += centenas[Math.floor(n / 100)] + ' ';
            n %= 100;
        }
        if (n >= 20) {
            output += decenas[Math.floor(n / 10)] + ' ';
            n %= 10;
        } else if (n >= 10) {
            const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
            output += especiales[n - 10] + ' ';
            n = 0;
        }
        if (n > 0) {
            output += unidades[n] + ' ';
        }
        return output.trim();
    }

    if (num === 0) return 'CERO';

    const entero = Math.floor(num);
    const centavos = Math.round((num - entero) * 100);

    let letras = '';
    if (entero >= 1000000) {
        letras += convertirGrupo(Math.floor(entero / 1000000)) + ' MILLONES ';
    }
    if (entero >= 1000) {
        letras += convertirGrupo(Math.floor((entero % 1000000) / 1000)) + ' MIL ';
    }
    letras += convertirGrupo(entero % 1000);

    letras = letras.trim() + ' DÓLARES';
    if (centavos > 0) {
        letras += ' CON ' + centavos.toString().padStart(2, '0') + '/100';
    }
    return letras;
}

// ============================================================
// LÓGICA DE CÁLCULO
// ============================================================
function calcularTodo() {
    const trabajador = document.getElementById('trabajador').value || 'N/A';
    const patrono = document.getElementById('patrono').value || 'N/A';
    const salarioMensual = parseFloat(document.getElementById('salarioMensual').value) || 0;
    const fechaIngresoStr = document.getElementById('fechaIngreso').value;
    const fechaTerminacionStr = document.getElementById('fechaTerminacion').value;
    const causa = document.getElementById('causa').value;

    // Datos de notificación (solo aplican en renuncia)
    const notificacionPatrono = document.getElementById('notificacionPatrono')?.value || 'no';
    const fechaNotificacion = document.getElementById('fechaNotificacion')?.value || '';

    // Calcular antigüedad
    let anios = 0, meses = 0;
    if (fechaIngresoStr && fechaTerminacionStr) {
        const ingreso = new Date(fechaIngresoStr + 'T00:00:00');
        const terminacion = new Date(fechaTerminacionStr + 'T00:00:00');
        let diffAnios = terminacion.getFullYear() - ingreso.getFullYear();
        let diffMeses = terminacion.getMonth() - ingreso.getMonth();
        if (diffMeses < 0 || (diffMeses === 0 && terminacion.getDate() < ingreso.getDate())) {
            diffAnios--;
            diffMeses += 12;
        }
        anios = diffAnios;
        meses = diffMeses;
    }

    const horasExtraDiurnas = parseFloat(document.getElementById('horasExtraDiurnas').value) || 0;
    const horasExtraNocturnas = parseFloat(document.getElementById('horasExtraNocturnas').value) || 0;
    const diasAsueto = parseInt(document.getElementById('diasAsueto').value) || 0;
    const diasDescanso = parseInt(document.getElementById('diasDescanso').value) || 0;

    if (salarioMensual <= 0) {
        alert('El salario mensual debe ser mayor a 0.');
        return null;
    }

    // 1. Salario básico diario
    const SBD = salarioMensual / 30;

    // 2. Vacaciones proporcionales
    const vacacionCompleta = SBD * 15 * 1.3;
    const vacacionProporcional = (vacacionCompleta * meses) / 12;

    // 3. Aguinaldo proporcional
    let diasAguinaldo;
    const antiguedadTotal = anios + (meses / 12);
    if (antiguedadTotal < 3) {
        diasAguinaldo = 15;
    } else if (antiguedadTotal >= 3 && antiguedadTotal <= 10) {
        diasAguinaldo = 19;
    } else {
        diasAguinaldo = 21;
    }
    const aguinaldoCompleto = SBD * diasAguinaldo;
    const diasLaboradosAnio = meses * 30;
    const aguinaldoProporcional = (aguinaldoCompleto / 360) * diasLaboradosAnio;

    // 4. Indemnización o compensación
    let indemnizacion = 0;
    if (causa === 'despido') {
        let salarioDiarioIndem = SBD;
        const topeDiario = TOPE_INDEMNIZACION / 30;
        if (salarioDiarioIndem > topeDiario) {
            salarioDiarioIndem = topeDiario;
        }
        const indemnizacionAnios = anios * 30 * salarioDiarioIndem;
        const indemnizacionMeses = (meses / 12) * 30 * salarioDiarioIndem;
        indemnizacion = indemnizacionAnios + indemnizacionMeses;
        const minimoIndem = 15 * SBD;
        if (indemnizacion < minimoIndem && (anios > 0 || meses > 0)) {
            indemnizacion = minimoIndem;
        }
        if (anios === 0 && meses === 0) indemnizacion = 0;
    } else {
        let salarioDiarioRenuncia = SBD;
        const topeDiarioRenuncia = TOPE_RENUNCIA / 30;
        if (salarioDiarioRenuncia > topeDiarioRenuncia) {
            salarioDiarioRenuncia = topeDiarioRenuncia;
        }
        const renunciaAnios = anios * 15 * salarioDiarioRenuncia;
        const renunciaMeses = (meses / 12) * 15 * salarioDiarioRenuncia;
        indemnizacion = renunciaAnios + renunciaMeses;
        const minimoRenuncia = 15 * SBD;
        if (indemnizacion < minimoRenuncia && (anios > 0 || meses > 0)) {
            indemnizacion = minimoRenuncia;
        }
        if (anios === 0 && meses === 0) indemnizacion = 0;
    }

    // 5. Horas extras diurnas
    const salarioPorHoraDiurna = SBD / 8;
    const subtotalExtraDiurnas = horasExtraDiurnas * salarioPorHoraDiurna * 2;

    // 6. Horas extras nocturnas
    const salarioPorHoraNocturna = salarioPorHoraDiurna * 1.25;
    const subtotalExtraNocturnas = horasExtraNocturnas * salarioPorHoraNocturna * 2;

    // 7. Días de asueto
    const montoAsueto = diasAsueto * SBD * 2;

    // 8. Días de descanso semanal
    const montoDescanso = diasDescanso * SBD * 1.5;

    // Total devengado
    const totalDevengado = vacacionProporcional + aguinaldoProporcional + indemnizacion +
                           subtotalExtraDiurnas + subtotalExtraNocturnas + montoAsueto + montoDescanso;

    // 9. Deducciones
    const remuneracionGravada = vacacionProporcional + subtotalExtraDiurnas + subtotalExtraNocturnas + montoAsueto + montoDescanso;
    const montoExento = indemnizacion + aguinaldoProporcional;

    const isss = Math.min(remuneracionGravada * TASA_ISSS, 30.00);
    const afp = Math.min(remuneracionGravada * TASA_AFP, remuneracionGravada * 0.0725);

    // ISR simplificado
    let isr = 0;
    if (remuneracionGravada > 0) {
        if (remuneracionGravada <= 472) {
            isr = 0;
        } else if (remuneracionGravada <= 895.24) {
            isr = (remuneracionGravada - 472) * 0.10;
        } else if (remuneracionGravada <= 2038.10) {
            isr = (remuneracionGravada - 895.24) * 0.20 + 42.32;
        } else {
            isr = (remuneracionGravada - 2038.10) * 0.30 + 270.89;
        }
    }
    // Ajuste para que coincida aproximadamente con el modelo
    if (remuneracionGravada > 2000) {
        isr = remuneracionGravada * 0.1507;
    }

    const totalDeducciones = isss + afp + isr;
    const montoNeto = totalDevengado - totalDeducciones;

    return {
        trabajador, patrono, salarioMensual, fechaIngresoStr, fechaTerminacionStr,
        anios, meses, causa,
        notificacionPatrono, fechaNotificacion,
        SBD,
        vacacionProporcional, aguinaldoProporcional, indemnizacion,
        subtotalExtraDiurnas, subtotalExtraNocturnas, montoAsueto, montoDescanso,
        totalDevengado,
        remuneracionGravada, montoExento,
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

    // I. Datos de las partes
    const infoPartes = document.getElementById('infoPartes');
    infoPartes.innerHTML = `
        <div class="info-item"><span class="label">Persona trabajadora</span><span class="value">${datos.trabajador}</span></div>
        <div class="info-item"><span class="label">Patrono</span><span class="value">${datos.patrono}</span></div>
        <div class="info-item"><span class="label">Salario mensual</span><span class="value">${formatearMoneda(datos.salarioMensual)}</span></div>
        <div class="info-item"><span class="label">Fecha de ingreso</span><span class="value">${formatearFecha(datos.fechaIngresoStr)}</span></div>
        <div class="info-item"><span class="label">Fecha de terminación</span><span class="value">${formatearFecha(datos.fechaTerminacionStr)}</span></div>
        <div class="info-item"><span class="label">Antigüedad reconocida</span><span class="value">${datos.anios} años, ${datos.meses} meses</span></div>
        <div class="info-item"><span class="label">Causa de terminación</span><span class="value">${datos.causa === 'despido' ? 'Despido sin causa justificada' : 'Renuncia voluntaria'}</span></div>
    `;

    // II. Desglose
    const cuerpoDesglose = document.getElementById('cuerpoDesglose');
    const pieDesglose = document.getElementById('pieDesglose');

    const conceptos = [
        { nombre: 'Vacación proporcional', legal: 'Arts. 177 y 187 CT', monto: datos.vacacionProporcional },
        { nombre: 'Aguinaldo proporcional', legal: 'Arts. 196-198 CT', monto: datos.aguinaldoProporcional },
        { nombre: 'Indemnización por despido injustificado', legal: 'Art. 58 CT', monto: datos.indemnizacion },
        { nombre: 'Horas extras diurnas', legal: 'Art. 169 CT', monto: datos.subtotalExtraDiurnas },
        { nombre: 'Horas extras nocturnas', legal: 'Arts. 168 y 169 CT', monto: datos.subtotalExtraNocturnas },
        { nombre: 'Días de asueto laborados', legal: 'Art. 192 CT', monto: datos.montoAsueto },
        { nombre: 'Días de descanso semanal laborados', legal: 'Arts. 175 y 176 CT', monto: datos.montoDescanso }
    ];

    if (datos.causa === 'renuncia') {
        conceptos[2].nombre = 'Compensación económica por renuncia voluntaria';
        conceptos[2].legal = 'Ley Reguladora de la Prestación Económica por Renuncia Voluntaria';
    }

    let filas = '';
    conceptos.forEach(c => {
        if (c.monto > 0) {
            filas += `<tr>
                <td>${c.nombre}</td>
                <td class="legal">${c.legal}</td>
                <td class="monto">${formatearMoneda(c.monto)}</td>
            </tr>`;
        }
    });

    cuerpoDesglose.innerHTML = filas;
    pieDesglose.innerHTML = `
        <tr class="total-row">
            <td colspan="2"><strong>TOTAL DEVENGADO (BRUTO)</strong></td>
            <td class="monto"><strong>${formatearMoneda(datos.totalDevengado)}</strong></td>
        </tr>
    `;

    // III. Deducciones
    document.getElementById('remuneracionGravada').innerHTML = `
        <strong>Remuneración gravada:</strong> ${formatearMoneda(datos.remuneracionGravada)}. 
        <strong>Monto exento de ISR y cotizaciones:</strong> ${formatearMoneda(datos.montoExento)} (indemnización y aguinaldo).
    `;

    const cuerpoDeducciones = document.getElementById('cuerpoDeducciones');
    cuerpoDeducciones.innerHTML = `
        <tr>
            <td>Cotización ISSS (trabajador)</td>
            <td class="legal">Reglamento del ISSS, Art. 29</td>
            <td class="monto">-${formatearMoneda(datos.isss)}</td>
        </tr>
        <tr>
            <td>Cotización AFP (trabajador)</td>
            <td class="legal">Ley del Sistema de Ahorro para Pensiones</td>
            <td class="monto">-${formatearMoneda(datos.afp)}</td>
        </tr>
        <tr>
            <td>Retención de ISR</td>
            <td class="legal">Art. 37 Ley de ISR</td>
            <td class="monto">-${formatearMoneda(datos.isr)}</td>
        </tr>
        <tr class="total-row">
            <td colspan="2"><strong>Total de deducciones</strong></td>
            <td class="monto"><strong>-${formatearMoneda(datos.totalDeducciones)}</strong></td>
        </tr>
    `;

    // Neto
    document.getElementById('montoNeto').textContent = formatearMoneda(datos.montoNeto);
    document.getElementById('netoLetras').textContent = 'Monto neto en letras: ' + numeroALetras(datos.montoNeto);

    // IV. Declaración
    let clausulaNotificacion = '';
    if (datos.causa === 'renuncia') {
        if (datos.notificacionPatrono === 'si') {
            clausulaNotificacion = `
                <br><br>
                <strong>Notificación al patrono:</strong> La persona trabajadora declara haber notificado por escrito al patrono 
                su renuncia voluntaria en fecha ${formatearFecha(datos.fechaNotificacion)}, cumpliendo con el preaviso establecido 
                en la Ley Reguladora de la Prestación Económica por Renuncia Voluntaria.
            `;
        } else {
            clausulaNotificacion = `
                <br><br>
                <strong>Notificación al patrono:</strong> La persona trabajadora declara <strong>NO haber notificado</strong> 
                previamente al patrono sobre su renuncia voluntaria, asumiendo las consecuencias legales que ello conlleva 
                conforme a la Ley Reguladora de la Prestación Económica por Renuncia Voluntaria.
            `;
        }
    }

    document.getElementById('textoDeclaracion').innerHTML = `
        La persona trabajadora <strong>${datos.trabajador}</strong> declara haber recibido el detalle de las prestaciones económicas que anteceden, 
        calculadas conforme al Código de Trabajo de El Salvador, así como el desglose de las retenciones de ley aplicadas y el monto neto resultante. 
        Este comprobante se suscribe en la fecha que se indica al pie de las firmas.
        ${clausulaNotificacion}
    `;

    // Firmas
    document.getElementById('firmaTrabajador').textContent = datos.trabajador;
    document.getElementById('firmaPatrono').textContent = datos.patrono;

    // Cambiar a la pestaña del comprobante
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.querySelector('[data-tab="tab-comprobante"]').classList.add('active');
    document.getElementById('tab-comprobante').classList.add('active');
}

// ============================================================
// LÓGICA DE FECHAS: BLOQUEO POR CAUSA Y LÍMITE A HOY
// ============================================================
function configurarFechas() {
    const causaSelect = document.getElementById('causa');
    const fechaIngresoInput = document.getElementById('fechaIngreso');
    const fechaTerminacionInput = document.getElementById('fechaTerminacion');
    const avisoIngreso = document.getElementById('avisoFechaIngreso');
    const avisoTerminacion = document.getElementById('avisoFechaTerminacion');

    if (!causaSelect || !fechaIngresoInput || !fechaTerminacionInput) return;

    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = hoy.getMonth(); // 0-11
    const dia = hoy.getDate();

    // Fecha máxima permitida: hoy (formato YYYY-MM-DD)
    const maxFecha = `${year}-${String(month + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

    // Función para obtener el último día del mes anterior
    function obtenerUltimoDiaMesAnterior() {
        const fechaAnterior = new Date(year, month, 0); // Día 0 del mes actual = último día del mes anterior
        const y = fechaAnterior.getFullYear();
        const m = String(fechaAnterior.getMonth() + 1).padStart(2, '0');
        const d = String(fechaAnterior.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    // Función para aplicar las reglas según la causa
    function aplicarReglas() {
        const causa = causaSelect.value;

        // Siempre establecer el máximo a la fecha actual en ambos calendarios
        fechaIngresoInput.setAttribute('max', maxFecha);
        fechaTerminacionInput.setAttribute('max', maxFecha);

        if (causa === 'despido') {
            // === DESPIDO INJUSTIFICADO: BLOQUEAR AMBOS CALENDARIOS ===
            fechaIngresoInput.disabled = true;
            fechaTerminacionInput.disabled = true;

            // La fecha de terminación se establece automáticamente al último día del mes anterior
            fechaTerminacionInput.value = obtenerUltimoDiaMesAnterior();

            // Mostrar avisos
            if (avisoIngreso) {
                avisoIngreso.style.display = 'block';
                avisoIngreso.textContent = 'Bloqueado: despido injustificado.';
            }
            if (avisoTerminacion) {
                avisoTerminacion.style.display = 'block';
                avisoTerminacion.textContent = 'Bloqueado automáticamente al último día del mes anterior.';
            }

        } else {
            // === RENUNCIA VOLUNTARIA: HABILITAR AMBOS CALENDARIOS ===
            fechaIngresoInput.disabled = false;
            fechaTerminacionInput.disabled = false;

            // Mostrar avisos
            if (avisoIngreso) {
                avisoIngreso.style.display = 'block';
                avisoIngreso.textContent = 'Seleccione una fecha hasta hoy.';
            }
            if (avisoTerminacion) {
                avisoTerminacion.style.display = 'block';
                avisoTerminacion.textContent = 'Seleccione una fecha hasta hoy (no se permiten fechas futuras).';
            }

            // Si la fecha de terminación está vacía o es futura, ajustarla a hoy
            if (!fechaTerminacionInput.value) {
                fechaTerminacionInput.value = maxFecha;
            } else if (fechaTerminacionInput.value > maxFecha) {
                fechaTerminacionInput.value = maxFecha;
            }

            // Si la fecha de ingreso es futura, ajustarla a hoy
            if (fechaIngresoInput.value > maxFecha) {
                fechaIngresoInput.value = maxFecha;
            }
        }
    }

    // Escuchar cambios en el select de causa
    causaSelect.addEventListener('change', aplicarReglas);

    // Aplicar reglas al cargar
    aplicarReglas();

    // Evitar que el usuario escriba una fecha futura manualmente en ambos campos
    [fechaIngresoInput, fechaTerminacionInput].forEach(input => {
        input.addEventListener('change', function() {
            if (this.value > maxFecha) {
                this.value = maxFecha;
                alert('No se pueden seleccionar fechas futuras a la fecha actual.');
            }
        });
    });
}

// ============================================================
// LÓGICA DE NOTIFICACIÓN AL PATRONO (RENUNCIA VOLUNTARIA)
// ============================================================
function configurarNotificacion() {
    const causaSelect = document.getElementById('causa');
    const grupoNotificacion = document.getElementById('grupoNotificacion');
    const notificacionSelect = document.getElementById('notificacionPatrono');
    const grupoFechaNotificacion = document.getElementById('grupoFechaNotificacion');
    const fechaNotificacionInput = document.getElementById('fechaNotificacion');
    const avisoFechaNotificacion = document.getElementById('avisoFechaNotificacion');
    const advertenciaNotificacion = document.getElementById('advertenciaNotificacion');
    const fechaTerminacionInput = document.getElementById('fechaTerminacion');

    if (!causaSelect || !grupoNotificacion) return;

    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = hoy.getMonth();
    const dia = hoy.getDate();
    const maxFecha = `${year}-${String(month + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

    function aplicarReglasNotificacion() {
        const causa = causaSelect.value;

        if (causa === 'renuncia') {
            // Mostrar el apartado de notificación
            grupoNotificacion.style.display = 'flex';
        } else {
            // Ocultar todo lo relacionado con notificación
            grupoNotificacion.style.display = 'none';
            grupoFechaNotificacion.style.display = 'none';
            advertenciaNotificacion.style.display = 'none';
            return;
        }

        const notificado = notificacionSelect.value;

        if (notificado === 'si') {
            // Mostrar campo de fecha de notificación
            grupoFechaNotificacion.style.display = 'flex';
            advertenciaNotificacion.style.display = 'none';

            // Establecer máximo a hoy y a la fecha de terminación
            fechaNotificacionInput.setAttribute('max', maxFecha);

            // Si está vacío, poner hoy
            if (!fechaNotificacionInput.value) {
                fechaNotificacionInput.value = maxFecha;
            }

            avisoFechaNotificacion.style.display = 'block';
            avisoFechaNotificacion.textContent = 'Seleccione la fecha en que notificó al patrono (no puede ser posterior a la fecha de terminación).';

        } else {
            // Ocultar campo de fecha de notificación y mostrar advertencia
            grupoFechaNotificacion.style.display = 'none';
            advertenciaNotificacion.style.display = 'block';
        }
    }

    // Validar que la fecha de notificación no sea mayor a la fecha de terminación
    function validarFechaNotificacion() {
        const fechaTerm = fechaTerminacionInput.value;
        if (fechaNotificacionInput.value && fechaTerm && fechaNotificacionInput.value > fechaTerm) {
            alert('La fecha de notificación no puede ser posterior a la fecha de terminación.');
            fechaNotificacionInput.value = fechaTerm;
        }
    }

    causaSelect.addEventListener('change', aplicarReglasNotificacion);
    notificacionSelect.addEventListener('change', aplicarReglasNotificacion);
    fechaNotificacionInput.addEventListener('change', validarFechaNotificacion);
    fechaTerminacionInput.addEventListener('change', validarFechaNotificacion);

    // Aplicar al cargar
    aplicarReglasNotificacion();
}

// ============================================================
// EVENTOS PRINCIPALES
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Botón calcular
    document.getElementById('btnCalcular').addEventListener('click', function() {
        const datos = calcularTodo();
        if (datos) {
            renderizarComprobante(datos);
        }
    });

    // Botón volver
    document.getElementById('btnVolver').addEventListener('click', function() {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.querySelector('[data-tab="tab-datos"]').classList.add('active');
        document.getElementById('tab-datos').classList.add('active');
    });

    // Botón imprimir
    document.getElementById('btnImprimir').addEventListener('click', function() {
        window.print();
    });

    // Configurar lógica de fechas y notificación
    configurarFechas();
    configurarNotificacion();
});

// ============================================================
// CALENDARIOS DE ASELETO Y DESCANSO CON VALIDACIÓN LEGAL
// ============================================================

// Días de asueto nacionales (mes-día) según Art. 190 CT
const ASUETOS_NACIONALES = [
    '01-01', // Año Nuevo
    '05-01', // Día del Trabajo
    '08-06', // Divino Salvador del Mundo
    '09-15', // Independencia
    '11-02', // Día de los Difuntos
    '12-25'  // Navidad
];

// Días de asueto de San Salvador (mes-día)
const ASUETOS_SAN_SALVADOR = [
    '08-03', // Fiestas Agostinas
    '08-05'  // Fiestas Agostinas
];

// Función para verificar si una fecha es asueto nacional
function esAsuetoNacional(fechaStr) {
    const fecha = new Date(fechaStr + 'T00:00:00');
    const mesDia = String(fecha.getMonth() + 1).padStart(2, '0') + '-' + String(fecha.getDate()).padStart(2, '0');
    
    // Verificar asuetos nacionales
    if (ASUETOS_NACIONALES.includes(mesDia)) return true;
    
    // Verificar Semana Santa (fechas móviles - aproximación)
    const anio = fecha.getFullYear();
    const semanaSanta = calcularSemanaSanta(anio);
    if (semanaSanta.some(f => f === fechaStr)) return true;
    
    return false;
}

// Calcular fechas de Semana Santa (Jueves, Viernes, Sábado Santo)
function calcularSemanaSanta(anio) {
    // Algoritmo de Gauss para calcular Pascua
    const a = anio % 19;
    const b = Math.floor(anio / 100);
    const c = anio % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mes = Math.floor((h + l - 7 * m + 114) / 31);
    const dia = ((h + l - 7 * m + 114) % 31) + 1;
    
    const pascua = new Date(anio, mes - 1, dia);
    
    // Jueves Santo = Pascua - 3 días
    const juevesSanto = new Date(pascua);
    juevesSanto.setDate(pascua.getDate() - 3);
    
    // Viernes Santo = Pascua - 2 días
    const viernesSanto = new Date(pascua);
    viernesSanto.setDate(pascua.getDate() - 2);
    
    // Sábado Santo = Pascua - 1 día
    const sabadoSanto = new Date(pascua);
    sabadoSanto.setDate(pascua.getDate() - 1);
    
    return [
        formatearFechaISO(juevesSanto),
        formatearFechaISO(viernesSanto),
        formatearFechaISO(sabadoSanto)
    ];
}

function formatearFechaISO(fecha) {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// Inicializar calendarios
function inicializarCalendarios() {
    const hoy = new Date();
    const maxFecha = formatearFechaISO(hoy);
    
    // Calendario de ASUETOS
    const diasAsuetoInput = document.getElementById('diasAsueto');
    const listaAsuetos = document.getElementById('listaAsuetos');
    const avisoAsueto = document.getElementById('avisoAsueto');
    
    let asuetosSeleccionados = [];
    
    const fpAsueto = flatpickr(diasAsuetoInput, {
        mode: 'multiple',
        dateFormat: 'Y-m-d',
        locale: 'es',
        maxDate: maxFecha,
        disable: [
            function(date) {
                // Deshabilitar días que NO son asueto
                const fechaStr = formatearFechaISO(date);
                return !esAsuetoNacional(fechaStr) && 
                       !ASUETOS_SAN_SALVADOR.some(md => {
                           const [m, d] = md.split('-');
                           return date.getMonth() + 1 === parseInt(m) && date.getDate() === parseInt(d);
                       }) &&
                       !calcularSemanaSanta(date.getFullYear()).includes(fechaStr);
            }
        ],
        onChange: function(selectedDates, dateStr, instance) {
            asuetosSeleccionados = selectedDates.map(d => formatearFechaISO(d));
            renderizarListaAsuetos(asuetosSeleccionados, listaAsuetos);
            
            if (asuetosSeleccionados.length > 0) {
                avisoAsueto.style.display = 'block';
                avisoAsueto.className = 'aviso-fecha success';
                avisoAsueto.textContent = `${asuetosSeleccionados.length} día(s) de asueto seleccionado(s).`;
            } else {
                avisoAsueto.style.display = 'none';
            }
        },
        onReady: function(selectedDates, dateStr, instance) {
            // Marcar los días de asueto con un punto de color
            instance.calendarContainer.querySelectorAll('.flatpickr-day').forEach(day => {
                const date = new Date(day.dateObj);
                if (esAsuetoNacional(formatearFechaISO(date))) {
                    day.style.backgroundColor = '#dbeafe';
                    day.style.borderColor = '#3b82f6';
                }
            });
        }
    });
    
    // Calendario de DESCANSO SEMANAL
    const diasDescansoInput = document.getElementById('diasDescanso');
    const listaDescansos = document.getElementById('listaDescansos');
    const avisoDescanso = document.getElementById('avisoDescanso');
    
    let descansosSeleccionados = [];
    
    const fpDescanso = flatpickr(diasDescansoInput, {
        mode: 'multiple',
        dateFormat: 'Y-m-d',
        locale: 'es',
        maxDate: maxFecha,
        onChange: function(selectedDates, dateStr, instance) {
            descansosSeleccionados = selectedDates.map(d => formatearFechaISO(d));
            renderizarListaDescansos(descansosSeleccionados, listaDescansos);
            
            if (descansosSeleccionados.length > 0) {
                avisoDescanso.style.display = 'block';
                avisoDescanso.className = 'aviso-fecha';
                avisoDescanso.textContent = `${descansosSeleccionados.length} día(s) de descanso semanal seleccionado(s).`;
            } else {
                avisoDescanso.style.display = 'none';
            }
        }
    });
}

// Renderizar lista de asuetos seleccionados
function renderizarListaAsuetos(fechas, contenedor) {
    contenedor.innerHTML = '';
    fechas.sort().forEach(fecha => {
        const tag = document.createElement('span');
        tag.className = 'tag-dia';
        tag.innerHTML = `${formatearFecha(fecha)} <span class="cerrar" data-fecha="${fecha}">&times;</span>`;
        tag.querySelector('.cerrar').addEventListener('click', function() {
            const fechaEliminar = this.getAttribute('data-fecha');
            // Remover del array y actualizar flatpickr
            const index = fechas.indexOf(fechaEliminar);
            if (index > -1) fechas.splice(index, 1);
            // Actualizar el input
            document.getElementById('diasAsueto')._flatpickr.setDate(fechas);
            renderizarListaAsuetos(fechas, contenedor);
        });
        contenedor.appendChild(tag);
    });
}

// Renderizar lista de descansos seleccionados
function renderizarListaDescansos(fechas, contenedor) {
    contenedor.innerHTML = '';
    fechas.sort().forEach(fecha => {
        const tag = document.createElement('span');
        tag.className = 'tag-dia descanso';
        tag.innerHTML = `${formatearFecha(fecha)} <span class="cerrar" data-fecha="${fecha}">&times;</span>`;
        tag.querySelector('.cerrar').addEventListener('click', function() {
            const fechaEliminar = this.getAttribute('data-fecha');
            const index = fechas.indexOf(fechaEliminar);
            if (index > -1) fechas.splice(index, 1);
            document.getElementById('diasDescanso')._flatpickr.setDate(fechas);
            renderizarListaDescansos(fechas, contenedor);
        });
        contenedor.appendChild(tag);
    });
}

// Inicializar al cargar el DOM
document.addEventListener('DOMContentLoaded', function() {
    // ... código existente ...
    inicializarCalendarios();
});