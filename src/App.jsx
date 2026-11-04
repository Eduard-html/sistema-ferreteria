import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { 
  Home, 
  ShoppingCart, 
  Package, 
  ArrowLeftRight, 
  AlertTriangle, 
  TrendingUp, 
  PlusCircle, 
  MinusCircle, 
  RotateCcw, 
  Receipt, 
  Trash2, 
  Lock, 
  Mail, 
  LogOut, 
  Printer, 
  ArrowDownRight, 
  ArrowUpRight,
  Boxes,
  CreditCard,
  Banknote,
  Calculator,
  CheckCircle2,
  Calendar
} from 'lucide-react';

export default function App() {
  // Manejo de sesión persistente localmente
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('fr_session_active') === 'true';
  });
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [productos, setProductos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [activeTab, setActiveTab] = useState('inicio');
  const [notif, setNotif] = useState(null);
  const [cart, setCart] = useState([]);
  const [clienteNombre, setClienteNombre] = useState('Cliente de Mostrador');
  const [metodoPago, setMetodoPago] = useState('Efectivo');

  // Estado de caja persistente (NO se reinicia al salir o recargar)
  const [cajaAbierta, setCajaAbierta] = useState(() => {
    return localStorage.getItem('fr_caja_abierta') === 'true';
  });
  const [fondoInicialInput, setFondoInicialInput] = useState('3000');
  const [fondoCajaActual, setFondoCajaActual] = useState(() => {
    return parseFloat(localStorage.getItem('fr_caja_fondo')) || 3000;
  });
  const [fechaApertura, setFechaApertura] = useState(() => {
    return localStorage.getItem('fr_caja_fecha_apertura') || '';
  });
  const [ventasEfectivo, setVentasEfectivo] = useState(() => {
    return parseFloat(localStorage.getItem('fr_caja_v_efectivo')) || 0;
  });
  const [ventasTarjeta, setVentasTarjeta] = useState(() => {
    return parseFloat(localStorage.getItem('fr_caja_v_tarjeta')) || 0;
  });
  const [facturasHoy, setFacturasHoy] = useState(() => {
    return parseInt(localStorage.getItem('fr_caja_facturas')) || 0;
  });
  const [historialCierres, setHistorialCierres] = useState([]);

  // Sincronizar estado de caja en localStorage
  useEffect(() => {
    localStorage.setItem('fr_caja_abierta', cajaAbierta);
    localStorage.setItem('fr_caja_fondo', fondoCajaActual);
    localStorage.setItem('fr_caja_fecha_apertura', fechaApertura);
    localStorage.setItem('fr_caja_v_efectivo', ventasEfectivo);
    localStorage.setItem('fr_caja_v_tarjeta', ventasTarjeta);
    localStorage.setItem('fr_caja_facturas', facturasHoy);
  }, [cajaAbierta, fondoCajaActual, fechaApertura, ventasEfectivo, ventasTarjeta, facturasHoy]);

  useEffect(() => {
    cargarDatosDesdeNube();
  }, []);

  const ventasDiaTotal = ventasEfectivo + ventasTarjeta;

  const cargarDatosDesdeNube = async () => {
    try {
      const { data: prods, error: errProds } = await supabase
        .from('productos')
        .select('*')
        .order('codigo', { ascending: true });
      if (errProds) throw errProds;
      if (prods) {
        const adaptados = prods.map(p => ({
          codigo: p.codigo,
          nombre: p.nombre,
          existencia: p.existencia,
          ptoReorden: p.pto_reorden,
          lote: p.lote,
          precio: parseFloat(p.precio),
          salidasHoy: p.salidas_hoy || 0
        }));
        setProductos(adaptados);
      }

      const { data: movs, error: errMovs } = await supabase
        .from('movimientos')
        .select('*')
        .order('id', { ascending: false });
      if (errMovs) throw errMovs;
      if (movs) setMovimientos(movs);

      const { data: cierres, error: errCierres } = await supabase
        .from('cierres_caja')
        .select('*')
        .order('fecha_cierre', { ascending: false });
      if (errCierres) throw errCierres;
      if (cierres) {
        const cierresAdaptados = cierres.map(c => ({
          id: c.id,
          fechaApertura: c.fecha_apertura,
          fechaCierre: c.fecha_cierre,
          cajero: c.cajero,
          fondoInicial: parseFloat(c.fondo_inicial),
          ventasEfectivo: parseFloat(c.ventas_efectivo),
          ventasTarjeta: parseFloat(c.ventas_tarjeta),
          totalVentas: parseFloat(c.total_ventas),
          facturasTotal: c.facturas_total,
          totalEfectivoEnCaja: parseFloat(c.total_efectivo_caja)
        }));
        setHistorialCierres(cierresAdaptados);
      }
    } catch (error) {
      console.error('Error de sincronización:', error);
    }
  };

  const productosEnAlerta = productos.filter(p => p.existencia <= p.ptoReorden);

  const triggerAlerta = (mensaje) => {
    setNotif(mensaje);
    setTimeout(() => setNotif(null), 4500);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (
      loginEmail.trim().toLowerCase() === 'ferreteriaramos@gmail.com' &&
      loginPassword === 'Admin123'
    ) {
      setIsAuthenticated(true);
      localStorage.setItem('fr_session_active', 'true');
      setLoginError('');
      triggerAlerta('Bienvenido al Sistema');
    } else {
      setLoginError('Credenciales incorrectas. Verifique correo y contraseña.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('fr_session_active');
    setLoginPassword('');
    setActiveTab('inicio');
    setCart([]);
  };

  const registrarMovimientoNube = async (codigo, producto, tipo, motivo, cantidad) => {
    const nuevoMov = {
      fecha: new Date().toLocaleString('es-DO', { dateStyle: 'short', timeStyle: 'short' }),
      codigo,
      producto,
      tipo,
      motivo,
      cantidad,
      usuario: 'Admin Ramos'
    };

    const { data, error } = await supabase.from('movimientos').insert([nuevoMov]).select();
    if (!error && data) {
      setMovimientos(prev => [data[0], ...prev]);
    }
  };

  const descontarStock = async (codigo, cantidad = 1) => {
    const item = productos.find(p => p.codigo === codigo);
    if (!item) return;

    const nuevaExistencia = Math.max(0, item.existencia - cantidad);
    const nuevasSalidas = item.salidasHoy + cantidad;

    await supabase.from('productos').update({
      existencia: nuevaExistencia,
      salidas_hoy: nuevasSalidas
    }).eq('codigo', codigo);

    await registrarMovimientoNube(item.codigo, item.nombre, 'Salida', 'Ajuste Manual de Inventario', cantidad);

    setProductos(prev => prev.map(p => p.codigo === codigo ? { ...p, existencia: nuevaExistencia, salidasHoy: nuevasSalidas } : p));
    if (nuevaExistencia <= item.ptoReorden) {
      triggerAlerta(`Alerta: ${item.nombre} ha alcanzado su Punto de Reorden`);
    }
  };

  const reabastecerStock = async (codigo, cantidad = 20) => {
    const item = productos.find(p => p.codigo === codigo);
    if (!item) return;

    const nuevaExistencia = item.existencia + cantidad;

    await supabase.from('productos').update({
      existencia: nuevaExistencia
    }).eq('codigo', codigo);

    await registrarMovimientoNube(item.codigo, item.nombre, 'Entrada', 'Reabastecimiento de Proveedor', cantidad);

    setProductos(prev => prev.map(p => p.codigo === codigo ? { ...p, existencia: nuevaExistencia } : p));
    triggerAlerta('Entrada de mercancía registrada exitosamente');
  };

  const resetearDemo = async () => {
    await supabase.from('productos').update({ salidas_hoy: 0 }).neq('codigo', '');
    await supabase.from('movimientos').delete().neq('id', 0);
    await supabase.from('cierres_caja').delete().neq('id', '');
    
    setCart([]);
    setVentasEfectivo(0);
    setVentasTarjeta(0);
    setFacturasHoy(0);
    setCajaAbierta(false);
    localStorage.removeItem('fr_caja_abierta');
    localStorage.removeItem('fr_caja_fondo');
    localStorage.removeItem('fr_caja_fecha_apertura');
    localStorage.removeItem('fr_caja_v_efectivo');
    localStorage.removeItem('fr_caja_v_tarjeta');
    localStorage.removeItem('fr_caja_facturas');

    cargarDatosDesdeNube();
    triggerAlerta('Datos de prueba reiniciados correctamente');
  };

  const abrirCaja = (e) => {
    e.preventDefault();
    const monto = parseFloat(fondoInicialInput) || 0;
    const fecha = new Date().toLocaleString('es-DO', { dateStyle: 'short', timeStyle: 'short' });
    setFondoCajaActual(monto);
    setFechaApertura(fecha);
    setVentasEfectivo(0);
    setVentasTarjeta(0);
    setFacturasHoy(0);
    setCajaAbierta(true);
    triggerAlerta(`Turno de caja iniciado con fondo de RD$ ${monto.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`);
  };

  const imprimirCierrePDF = (cierre) => {
    const ventana = window.open('', '_blank', 'width=850,height=750');
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Comprobante de Cierre de Caja - Ferretería Ramos</title>
        <style>
          @page { size: A4; margin: 12mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; padding: 25px; font-size: 12px; }
          .header-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          .info-box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; background-color: #f8fafc; }
          table.data-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #0f172a; color: white; padding: 10px 8px; text-align: left; font-size: 11px; text-transform: uppercase; }
          td { padding: 9px 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
          .totals-table { width: 340px; margin-left: auto; margin-top: 25px; border-collapse: collapse; }
          .totals-table td { padding: 6px 8px; }
          .footer-note { margin-top: 45px; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 15px; color: #64748b; font-size: 11px; }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td style="vertical-align: middle; width: 85px; border: none; padding: 0;">
              <img src="/logo.jpg" alt="Logo" style="width: 75px; height: 75px; object-fit: contain; border-radius: 8px; border: 1px solid #e2e8f0; padding: 2px;" />
            </td>
            <td style="vertical-align: top; width: 55%; padding-left: 14px; border: none;">
              <h1 style="margin: 0; font-size: 22px; color: #0f172a; font-weight: 900;">
                FERRETERÍA <span style="color: #ea580c;">RAMOS</span>
              </h1>
              <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b; font-weight: bold;">MATERIALES DE CONSTRUCCIÓN & HERRAMIENTAS</p>
              <p style="margin: 4px 0 2px 0; font-size: 11px;"><strong>RNC:</strong> 132-45892-1</p>
              <p style="margin: 2px 0; font-size: 11px;"><strong>Dirección:</strong> La Romana, sector El Tamarindo, No. 43, Rep. Dom.</p>
              <p style="margin: 2px 0; font-size: 11px;"><strong>Teléfono:</strong> +1 (849) 632-2741</p>
            </td>
            <td style="vertical-align: top; width: 35%; border: none;">
              <div class="info-box">
                <div style="font-size: 12px; font-weight: 900; color: #ea580c; text-transform: uppercase;">Comprobante de Cierre de Caja</div>
                <div style="margin-top: 6px; font-size: 11px;"><strong>No. Cierre:</strong> ${cierre.id}</div>
                <div style="font-size: 11px;"><strong>Fecha Cierre:</strong> ${cierre.fechaCierre}</div>
                <div style="font-size: 11px;"><strong>Fecha Apertura:</strong> ${cierre.fechaApertura}</div>
                <div style="font-size: 11px;"><strong>Cajero / Responsable:</strong> ${cierre.cajero}</div>
              </div>
            </td>
          </tr>
        </table>

        <table class="data-table">
          <thead>
            <tr>
              <th>Concepto</th>
              <th style="text-align: center;">Comprobantes</th>
              <th style="text-align: right;">Total Recaudado</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Ventas en Efectivo</td>
              <td style="text-align: center;">-</td>
              <td style="text-align: right; font-weight: bold;">RD$ ${cierre.ventasEfectivo.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td>Ventas con Tarjeta / POS Electrónico</td>
              <td style="text-align: center;">-</td>
              <td style="text-align: right; font-weight: bold;">RD$ ${cierre.ventasTarjeta.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td>Total Facturas Emitidas</td>
              <td style="text-align: center; font-weight: bold;">${cierre.facturasTotal}</td>
              <td style="text-align: right; font-weight: bold;">RD$ ${cierre.totalVentas.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>

        <table class="totals-table">
          <tr>
            <td style="color: #64748b;">Fondo Inicial de Apertura:</td>
            <td style="text-align: right; font-weight: bold;">RD$ ${cierre.fondoInicial.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">(+) Recaudación en Efectivo:</td>
            <td style="text-align: right; font-weight: bold; color: #059669;">RD$ ${cierre.ventasEfectivo.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr style="border-top: 2px solid #0f172a; font-size: 13px;">
            <td style="font-weight: 900; color: #0f172a; padding-top: 8px;">TOTAL EFECTIVO EN GAVETA:</td>
            <td style="text-align: right; font-weight: 900; color: #ea580c; padding-top: 8px;">RD$ ${cierre.totalEfectivoEnCaja.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">Total en Vouchers Tarjeta:</td>
            <td style="text-align: right; font-weight: bold; color: #2563eb;">RD$ ${cierre.ventasTarjeta.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
          </tr>
        </table>

        <div style="margin-top: 60px; display: table; width: 100%;">
          <div style="display: table-cell; width: 50%; text-align: center;">
            <div style="border-top: 1px solid #0f172a; width: 220px; margin: 0 auto; padding-top: 5px; font-weight: bold; font-size: 11px;">
              Firma Cajero(a)
            </div>
          </div>
          <div style="display: table-cell; width: 50%; text-align: center;">
            <div style="border-top: 1px solid #0f172a; width: 220px; margin: 0 auto; padding-top: 5px; font-weight: bold; font-size: 11px;">
              Firma Supervisor / Encargado
            </div>
          </div>
        </div>

        <div class="footer-note">
          <p style="margin: 0;">Ferretería Ramos - Documento Oficial de Liquidación de Caja.</p>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;
    ventana.document.open();
    ventana.document.write(htmlContent);
    ventana.document.close();
  };

  const ejecutarCierreCaja = async () => {
    if (!cajaAbierta) return;

    const fechaCierreActual = new Date().toLocaleString('es-DO', { dateStyle: 'short', timeStyle: 'short' });
    const nuevoCierre = {
      id: `CIERRE-00${historialCierres.length + 1}`,
      fecha_apertura: fechaApertura || fechaCierreActual,
      fecha_cierre: fechaCierreActual,
      cajero: 'Admin Ramos',
      fondo_inicial: fondoCajaActual,
      ventas_efectivo: ventasEfectivo,
      ventas_tarjeta: ventasTarjeta,
      total_ventas: ventasDiaTotal,
      facturas_total: facturasHoy,
      total_efectivo_caja: fondoCajaActual + ventasEfectivo
    };

    await supabase.from('cierres_caja').insert([nuevoCierre]);

    const cierreAdaptado = {
      ...nuevoCierre,
      fechaApertura: nuevoCierre.fecha_apertura,
      fechaCierre: nuevoCierre.fecha_cierre,
      fondoInicial: nuevoCierre.fondo_inicial,
      ventasEfectivo: nuevoCierre.ventas_efectivo,
      ventasTarjeta: nuevoCierre.ventas_tarjeta,
      totalVentas: nuevoCierre.total_ventas,
      facturasTotal: nuevoCierre.facturas_total,
      totalEfectivoEnCaja: nuevoCierre.total_efectivo_caja
    };

    setHistorialCierres(prev => [cierreAdaptado, ...prev]);
    imprimirCierrePDF(cierreAdaptado);

    // Cierre manual completado: ahora sí se restablece la caja
    setCajaAbierta(false);
    setVentasEfectivo(0);
    setVentasTarjeta(0);
    setFacturasHoy(0);
    setFondoInicialInput('3000');
    localStorage.removeItem('fr_caja_abierta');
    localStorage.removeItem('fr_caja_fondo');
    localStorage.removeItem('fr_caja_fecha_apertura');
    localStorage.removeItem('fr_caja_v_efectivo');
    localStorage.removeItem('fr_caja_v_tarjeta');
    localStorage.removeItem('fr_caja_facturas');

    triggerAlerta('Turno de caja cerrado con éxito.');
  };

  const agregarAlCarrito = (producto) => {
    if (!cajaAbierta) {
      triggerAlerta('Debe abrir el turno de caja antes de realizar ventas.');
      return;
    }
    if (producto.existencia <= 0) {
      triggerAlerta(`Existencias agotadas para ${producto.nombre}`);
      return;
    }
    setCart(prev => {
      const existe = prev.find(item => item.codigo === producto.codigo);
      if (existe) {
        if (existe.cantidad >= producto.existencia) {
          triggerAlerta(`Stock máximo alcanzado para ${producto.nombre}`);
          return prev;
        }
        return prev.map(item => 
          item.codigo === producto.codigo ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }
      return [...prev, { ...producto, cantidad: 1 }];
    });
  };

  const cambiarCantidadCart = (codigo, delta) => {
    setCart(prev => prev.map(item => {
      if (item.codigo === codigo) {
        const nuevo = item.cantidad + delta;
        return nuevo > 0 ? { ...item, cantidad: nuevo } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const eliminarDelCarrito = (codigo) => {
    setCart(prev => prev.filter(item => item.codigo !== codigo));
  };

  const subtotalCart = cart.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
  const itbis = subtotalCart * 0.18;
  const totalCart = subtotalCart + itbis;

  const imprimirFacturaPDF = (facturaData) => {
    const ventanaImpresion = window.open('', '_blank', 'width=850,height=750');
    
    const itemsFilas = facturaData.items.map(item => `
      <tr>
        <td style="padding: 8px 4px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-size: 11px;">${item.codigo}</td>
        <td style="padding: 8px 4px; border-bottom: 1px solid #e2e8f0; font-size: 11px;"><strong>${item.nombre}</strong></td>
        <td style="padding: 8px 4px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 11px;">${item.cantidad}</td>
        <td style="padding: 8px 4px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 11px;">RD$ ${item.precio.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
        <td style="padding: 8px 4px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 11px; font-weight: bold;">RD$ ${(item.precio * item.cantidad).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Factura ${facturaData.numeroFactura} - Ferretería Ramos</title>
        <style>
          @page { size: A4; margin: 12mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; margin: 0; padding: 20px; font-size: 12px; }
          .header-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          .invoice-box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; background-color: #f8fafc; }
          table.data-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background-color: #0f172a; color: white; padding: 9px 5px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
          .totals-table { width: 280px; margin-left: auto; margin-top: 20px; border-collapse: collapse; }
          .totals-table td { padding: 5px 8px; }
          .footer-note { margin-top: 40px; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 15px; color: #64748b; font-size: 11px; }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td style="vertical-align: middle; width: 85px; border: none;">
              <img src="/logo.jpg" alt="Logo" style="width: 75px; height: 75px; object-fit: contain; border-radius: 8px; border: 1px solid #e2e8f0; padding: 2px;" />
            </td>
            <td style="vertical-align: top; width: 55%; padding-left: 12px; border: none;">
              <h1 style="margin: 0; font-size: 22px; color: #0f172a; font-weight: 900; letter-spacing: -0.5px;">
                FERRETERÍA <span style="color: #ea580c;">RAMOS</span>
              </h1>
              <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b; font-weight: bold;">MATERIALES DE CONSTRUCCIÓN & HERRAMIENTAS</p>
              <p style="margin: 4px 0 2px 0; font-size: 11px;"><strong>RNC:</strong> 132-45892-1</p>
              <p style="margin: 2px 0; font-size: 11px;"><strong>Dirección:</strong> La Romana, sector El Tamarindo, No. 43, Rep. Dom.</p>
              <p style="margin: 2px 0; font-size: 11px;"><strong>Teléfono:</strong> +1 (849) 632-2741</p>
            </td>
            <td style="vertical-align: top; width: 35%; border: none;">
              <div class="invoice-box">
                <div style="font-size: 12px; font-weight: bold; color: #ea580c; text-transform: uppercase;">Factura Consumidor Final</div>
                <div style="margin-top: 6px; font-size: 11px;"><strong>No. Factura:</strong> ${facturaData.numeroFactura}</div>
                <div style="font-size: 11px;"><strong>NCF:</strong> B0200004591</div>
                <div style="font-size: 11px;"><strong>Fecha:</strong> ${facturaData.fecha}</div>
                <div style="font-size: 11px;"><strong>Cajero:</strong> Admin Ramos</div>
                <div style="font-size: 11px;"><strong>Cliente:</strong> ${facturaData.cliente}</div>
                <div style="font-size: 11px; margin-top: 4px; padding-top: 4px; border-top: 1px dashed #cbd5e1;"><strong>Forma de Pago:</strong> ${facturaData.metodoPago}</div>
              </div>
            </td>
          </tr>
        </table>

        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 12%;">Código</th>
              <th style="width: 48%;">Descripción del Producto</th>
              <th style="width: 10%; text-align: center;">Cant.</th>
              <th style="width: 15%; text-align: right;">Precio Unit.</th>
              <th style="width: 15%; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsFilas}
          </tbody>
        </table>

        <table class="totals-table">
          <tr>
            <td style="color: #64748b;">Subtotal:</td>
            <td style="text-align: right; font-weight: bold;">RD$ ${facturaData.subtotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">ITBIS (18%):</td>
            <td style="text-align: right; font-weight: bold;">RD$ ${facturaData.itbis.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr style="border-top: 2px solid #0f172a; font-size: 14px;">
            <td style="font-weight: 900; color: #0f172a; padding-top: 8px;">TOTAL PAGADO:</td>
            <td style="text-align: right; font-weight: 900; color: #ea580c; padding-top: 8px;">RD$ ${facturaData.total.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
          </tr>
        </table>

        <div class="footer-note">
          <p style="margin: 0; font-weight: bold;">¡Gracias por preferir Ferretería Ramos!</p>
          <p style="margin: 3px 0 0 0;">No se aceptan devoluciones en fundas de cemento abiertas ni materiales cortados a medida.</p>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `;

    ventanaImpresion.document.open();
    ventanaImpresion.document.write(htmlContent);
    ventanaImpresion.document.close();
  };

  const procesarVenta = async () => {
    if (!cajaAbierta) {
      triggerAlerta('Debe abrir la caja antes de registrar ventas.');
      return;
    }
    if (cart.length === 0) return;

    const numFactura = `FAC-000${facturasHoy + 1}`;
    const fechaHora = new Date().toLocaleString('es-DO', { dateStyle: 'short', timeStyle: 'short' });

    for (const itemCart of cart) {
      const prodOriginal = productos.find(p => p.codigo === itemCart.codigo);
      if (prodOriginal) {
        const nuevaExistencia = Math.max(0, prodOriginal.existencia - itemCart.cantidad);
        const nuevasSalidas = prodOriginal.salidasHoy + itemCart.cantidad;

        await supabase.from('productos').update({
          existencia: nuevaExistencia,
          salidas_hoy: nuevasSalidas
        }).eq('codigo', itemCart.codigo);

        await registrarMovimientoNube(
          itemCart.codigo, 
          itemCart.nombre, 
          'Salida', 
          `Venta mostrador (${numFactura})`, 
          itemCart.cantidad
        );
      }
    }

    const facturaGenerada = {
      numeroFactura: numFactura,
      fecha: fechaHora,
      cliente: clienteNombre || 'Cliente de Mostrador',
      metodoPago: metodoPago,
      items: [...cart],
      subtotal: subtotalCart,
      itbis: itbis,
      total: totalCart
    };

    if (metodoPago === 'Efectivo') {
      setVentasEfectivo(prev => prev + totalCart);
    } else {
      setVentasTarjeta(prev => prev + totalCart);
    }
    setFacturasHoy(prev => prev + 1);

    imprimirFacturaPDF(facturaGenerada);

    setCart([]);
    setClienteNombre('Cliente de Mostrador');
    cargarDatosDesdeNube();
    triggerAlerta(`Factura ${numFactura} registrada satisfactoriamente.`);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-800">
          <div className="bg-slate-900 p-8 text-center border-b border-slate-800">
            <div className="w-16 h-16 rounded-2xl bg-white p-1 shadow-lg mx-auto mb-4 border border-orange-500/30 flex items-center justify-center">
              <img 
                src="/logo.jpg" 
                alt="Logo Ferretería Ramos" 
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">
              FERRETERÍA <span className="text-orange-500">RAMOS</span>
            </h1>
            <p className="text-xs text-orange-400 mt-1 uppercase tracking-wider font-bold">
              Bienvenido al Sistema de Gestión
            </p>
          </div>

          <form onSubmit={handleLogin} className="p-8 space-y-5">
            {loginError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2.5 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="ferreteriaramos@gmail.com"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-orange-600/30 transition flex items-center justify-center gap-2"
            >
              Acceder al Panel
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-800 font-sans">
      {notif && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 border-l-4 border-orange-500 transition-all">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-orange-400" />
          <span className="text-xs font-bold tracking-wide">{notif}</span>
        </div>
      )}

      <aside className="w-72 bg-slate-900 text-slate-200 flex flex-col justify-between p-5 flex-shrink-0 shadow-xl">
        <div>
          <div className="flex items-center gap-3.5 px-2 py-3 mb-6 border-b border-slate-800 pb-5">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-white flex items-center justify-center shadow-md border border-orange-500/30 flex-shrink-0">
              <img 
                src="/logo.jpg" 
                alt="Logo Ferretería Ramos" 
                className="w-full h-full object-contain p-0.5"
              />
            </div>
            <div>
              <h1 className="font-black text-white text-base tracking-tight leading-none">
                FERRETERÍA <span className="text-orange-500">RAMOS</span>
              </h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1.5 font-bold">Control & Inventario</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-bold text-slate-500 px-3 uppercase tracking-wider mb-2.5">Panel de Control</p>
              <button 
                onClick={() => setActiveTab('inicio')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-xs rounded-lg font-semibold transition ${activeTab === 'inicio' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800'}`}
              >
                <Home className="w-4 h-4" /> Inicio
              </button>
            </div>

            <div>
              <p className="text-[10px] font-bold text-slate-500 px-3 uppercase tracking-wider mb-2.5">Operaciones</p>
              <nav className="space-y-2">
                <button 
                  onClick={() => setActiveTab('pos')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs rounded-lg font-medium transition ${activeTab === 'pos' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800'}`}
                >
                  <div className="flex items-center gap-3">
                    <ShoppingCart className="w-4 h-4" /> Facturación / POS
                  </div>
                  {cart.length > 0 && (
                    <span className="bg-amber-400 text-slate-900 text-[10px] px-2 py-0.5 rounded-full font-black">
                      {cart.reduce((a, b) => a + b.cantidad, 0)}
                    </span>
                  )}
                </button>

                <button 
                  onClick={() => setActiveTab('caja')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs rounded-lg font-medium transition ${activeTab === 'caja' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800'}`}
                >
                  <div className="flex items-center gap-3 whitespace-nowrap">
                    <Calculator className="w-4 h-4" /> Cierre de Caja
                  </div>
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    cajaAbierta 
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60' 
                      : 'bg-slate-800 text-slate-400 border border-slate-700/60'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cajaAbierta ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
                    {cajaAbierta ? 'Abierta' : 'Cerrada'}
                  </span>
                </button>

                <button 
                  onClick={() => setActiveTab('movimientos')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-xs rounded-lg font-medium transition ${activeTab === 'movimientos' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800'}`}
                >
                  <ArrowLeftRight className="w-4 h-4" /> Historial de Movimientos
                </button>
              </nav>
            </div>

            <div>
              <p className="text-[10px] font-bold text-slate-500 px-3 uppercase tracking-wider mb-2.5">Monitoreo de Stock</p>
              <nav className="space-y-2">
                <button 
                  onClick={() => setActiveTab('inicio')}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs rounded-lg font-medium transition text-slate-300 hover:bg-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4 text-amber-400" /> Punto de Reorden
                  </div>
                  {productosEnAlerta.length > 0 && (
                    <span className="bg-amber-500 text-slate-950 text-[10px] px-2 py-0.5 rounded-full font-black">
                      {productosEnAlerta.length}
                    </span>
                  )}
                </button>
              </nav>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 space-y-2">
          <button 
            onClick={resetearDemo}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-lg transition font-medium border border-slate-700/60"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Restablecer Demostración
          </button>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-rose-400 hover:text-white hover:bg-rose-600/20 rounded-lg transition font-medium border border-rose-900/40"
          >
            <LogOut className="w-3.5 h-3.5" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between flex-shrink-0 shadow-sm">
          <div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
              Ferretería Ramos • La Romana
            </span>
            <h2 className="text-base font-extrabold text-slate-800 tracking-tight mt-0.5">
              {activeTab === 'inicio' && 'Panel de Control de Inventario & Reorden'}
              {activeTab === 'pos' && 'Punto de Venta / Facturación de Mostrador'}
              {activeTab === 'caja' && 'Gestión y Conciliación de Turnos de Caja'}
              {activeTab === 'movimientos' && 'Kárdex / Historial de Movimientos'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">+1 (849) 632-2741</span>
            <div className="flex items-center gap-2.5 pl-4 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-orange-400 font-bold text-xs flex items-center justify-center">
                FR
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 leading-none">Admin Ramos</p>
                <p className="text-[10px] text-emerald-600 font-semibold leading-none mt-1">● Sistema en Línea</p>
              </div>
            </div>
          </div>
        </header>

        {activeTab === 'inicio' && (
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-orange-200 transition">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Ventas Acumuladas</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">RD$ {ventasDiaTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</h3>
                <p className="text-[11px] text-emerald-600 mt-2 font-medium flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> Total facturado en el turno
                </p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-orange-200 transition">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Facturas Emitidas</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{facturasHoy}</h3>
                <p className="text-[11px] text-slate-500 mt-2 font-medium">Transacciones procesadas</p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-orange-200 transition">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Valor en Almacén</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">
                  RD$ {productos.reduce((acc, p) => acc + (p.existencia * p.precio), 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                </h3>
                <p className="text-[11px] text-slate-400 mt-2">{productos.length} materiales en catálogo</p>
              </div>

              <div className={`p-5 rounded-xl border shadow-sm transition ${productosEnAlerta.length > 0 ? 'bg-orange-50 border-orange-300' : 'bg-white border-slate-200'}`}>
                <p className="text-xs text-orange-700 font-bold uppercase tracking-wider">Productos por Pedir</p>
                <h3 className="text-2xl font-black text-orange-600 mt-1">{productosEnAlerta.length}</h3>
                <p className="text-[11px] text-orange-800/80 mt-2 font-semibold">Bajo el Punto de Reorden</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2 mb-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Boxes className="w-4 h-4 text-orange-600" /> Monitoreo de Existencias & Demanda
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full self-start">
                    Sincronización en Tiempo Real
                  </span>
                </div>

                <div className="space-y-4">
                  {productos.map((item) => {
                    const requiereCompra = item.existencia <= item.ptoReorden;
                    const stockTotal = item.existencia + item.salidasHoy;
                    const tasaSalida = stockTotal > 0 ? Math.round((item.salidasHoy / stockTotal) * 100) : 0;

                    return (
                      <div key={item.codigo} className="p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50/60 transition">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold">
                                {item.codigo}
                              </span>
                              <span className="font-bold text-xs text-slate-900">{item.nombre}</span>
                            </div>
                            <span className="text-[11px] text-slate-500 mt-0.5 block">
                              Salidas registradas: <strong className="text-slate-800">{item.salidasHoy}</strong> unidades | Existencia disponible: <strong className={requiereCompra ? 'text-orange-600 font-extrabold' : 'text-slate-800'}>{item.existencia}</strong>
                            </span>
                          </div>

                          <div>
                            {requiereCompra ? (
                              <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 text-[10px] font-black px-2 py-1 rounded">
                                <AlertTriangle className="w-3 h-3 text-rose-600" /> Pedir {item.lote}
                              </span>
                            ) : item.existencia <= item.ptoReorden * 1.3 ? (
                              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-1 rounded">
                                Stock Moderado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-1 rounded">
                                Stock Óptimo
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              requiereCompra 
                                ? 'bg-gradient-to-r from-orange-600 to-rose-500' 
                                : 'bg-orange-500'
                            }`}
                            style={{ width: `${Math.min(100, tasaSalida)}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                          <span>Índice de rotación: {tasaSalida}%</span>
                          <span>Punto Reorden: {item.ptoReorden}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Top Ventas por Monto</h4>
                    <span className="text-[10px] text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded">Ferretería Ramos</span>
                  </div>
                  <div className="space-y-3.5">
                    {ventasDiaTotal === 0 ? (
                      <div className="text-center py-12 text-slate-400">
                        <Package className="w-8 h-8 mx-auto opacity-30 mb-2" />
                        <p className="text-xs">Sin ventas registradas en el turno actual</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Se computarán automáticamente al emitir facturas</p>
                      </div>
                    ) : (
                      [...productos]
                        .filter(item => item.salidasHoy > 0)
                        .sort((a, b) => (b.salidasHoy * b.precio) - (a.salidasHoy * a.precio))
                        .slice(0, 4)
                        .map((item, idx) => (
                          <div key={item.codigo} className="flex items-center justify-between text-xs pb-2 border-b border-slate-100 last:border-0">
                            <div className="flex items-center gap-2.5">
                              <span className="text-orange-500 font-black text-sm">{idx + 1}</span>
                              <div>
                                <p className="font-bold text-slate-800">{item.nombre}</p>
                                <p className="text-[10px] text-slate-400">{item.salidasHoy} unidades despachadas</p>
                              </div>
                            </div>
                            <span className="font-bold text-slate-700">
                              RD$ {(item.salidasHoy * item.precio).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mt-4 text-[11px] text-slate-600">
                  <span className="font-bold text-slate-800 block mb-0.5">Control Centralizado:</span>
                  Toda salida por mostrador o reabastecimiento actualiza automáticamente las existencias disponibles y el kárdex general.
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h4 className="text-sm font-black text-slate-900 tracking-tight">
                    Punto de Reorden & Control de Existencias
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Cálculo preventivo: Dispara notificación automática cuando <code className="text-orange-600 font-semibold">Existencia ≤ Punto de Reorden</code>
                  </p>
                </div>
                <div>
                  <button 
                    onClick={() => setActiveTab('pos')}
                    className="text-xs bg-orange-600 hover:bg-orange-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow-sm"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" /> Ir al POS
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Cód.</th>
                      <th className="py-3.5 px-4">Material / Producto</th>
                      <th className="py-3.5 px-4 text-center">Nivel de Stock</th>
                      <th className="py-3.5 px-4 text-center">Pto. Reorden</th>
                      <th className="py-3.5 px-4">Lote Sugerido</th>
                      <th className="py-3.5 px-4 text-center">Acciones Operativas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {productos.map((prod) => {
                      const esCritico = prod.existencia <= prod.ptoReorden;
                      const porcentaje = Math.min(100, Math.round((prod.existencia / (prod.ptoReorden * 1.5)) * 100));

                      return (
                        <tr key={prod.codigo} className={`hover:bg-slate-50 transition ${esCritico ? 'bg-orange-50/40' : ''}`}>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-500">{prod.codigo}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {prod.nombre}
                            <span className="block text-[10px] font-normal text-slate-400">RD$ {prod.precio.toLocaleString()} c/u</span>
                          </td>
                          
                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-center gap-3">
                              <span className={`font-black w-8 text-right text-xs ${esCritico ? 'text-orange-600 font-extrabold' : 'text-slate-800'}`}>
                                {prod.existencia}
                              </span>
                              <div className="w-24 bg-slate-200 h-2.5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-300 ${esCritico ? 'bg-gradient-to-r from-orange-600 to-amber-500' : 'bg-emerald-500'}`}
                                  style={{ width: `${porcentaje}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-center font-bold text-slate-600 text-xs">
                            {prod.ptoReorden}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-600">
                            {prod.lote}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => descontarStock(prod.codigo, 5)}
                                title="Descontar stock"
                                className="px-2.5 py-1.5 bg-white border border-slate-300 hover:border-orange-500 hover:text-orange-600 text-slate-700 rounded-lg font-bold flex items-center gap-1 transition shadow-sm"
                              >
                                <MinusCircle className="w-3.5 h-3.5 text-orange-500" /> Salida (-5)
                              </button>
                              <button 
                                onClick={() => reabastecerStock(prod.codigo, 25)}
                                title="Ingresar stock de reposición"
                                className="px-2.5 py-1.5 bg-slate-900 hover:bg-orange-600 text-white rounded-lg font-bold flex items-center gap-1 transition shadow-sm"
                              >
                                <PlusCircle className="w-3.5 h-3.5 text-amber-400" /> Entrada (+25)
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pos' && (
          <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Catálogo de Materiales</h3>
                  <p className="text-xs text-slate-500">Selecciona los productos para generar la orden de venta</p>
                </div>
                <button 
                  onClick={() => setActiveTab('inicio')}
                  className="text-xs font-semibold text-orange-600 hover:underline"
                >
                  ← Volver al Inventario
                </button>
              </div>

              {!cajaAbierta && (
                <div className="bg-amber-50 border border-amber-300 text-amber-800 p-4 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>La caja está actualmente CERRADA. Debe iniciar un turno para poder procesar cobros.</span>
                  </div>
                  <button 
                    onClick={() => setActiveTab('caja')}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-3 py-1.5 rounded-lg transition"
                  >
                    Abrir Turno
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {productos.map(p => {
                  const sinStock = p.existencia <= 0;
                  const enAlerta = p.existencia <= p.ptoReorden;

                  return (
                    <div 
                      key={p.codigo}
                      onClick={() => !sinStock && cajaAbierta && agregarAlCarrito(p)}
                      className={`bg-white p-4 rounded-xl border transition shadow-sm select-none flex flex-col justify-between ${
                        sinStock || !cajaAbierta
                          ? 'opacity-60 cursor-not-allowed border-slate-200 bg-slate-50' 
                          : 'cursor-pointer hover:border-orange-500 hover:shadow-md border-slate-200'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-mono text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded">
                            {p.codigo}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            sinStock ? 'bg-rose-100 text-rose-700' : enAlerta ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {sinStock ? 'Agotado' : `${p.existencia} disponibles`}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm mt-2">{p.nombre}</h4>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-sm font-black text-orange-600">
                          RD$ {p.precio.toLocaleString()}
                        </span>
                        <button 
                          disabled={sinStock || !cajaAbierta}
                          className="text-xs font-bold bg-slate-900 text-white px-2.5 py-1.5 rounded-lg hover:bg-orange-600 transition flex items-center gap-1 disabled:bg-slate-400"
                        >
                          <PlusCircle className="w-3.5 h-3.5" /> Agregar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-fit sticky top-6">
              <div>
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <Receipt className="w-5 h-5 text-orange-600" />
                  <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wide">
                    Factura de Despacho
                  </h3>
                </div>

                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Nombre del Cliente</label>
                    <input 
                      type="text"
                      value={clienteNombre}
                      onChange={(e) => setClienteNombre(e.target.value)}
                      placeholder="Cliente de Mostrador"
                      disabled={!cajaAbierta}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Método de Pago</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={!cajaAbierta}
                        onClick={() => setMetodoPago('Efectivo')}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-bold transition ${
                          metodoPago === 'Efectivo'
                            ? 'bg-orange-50 border-orange-500 text-orange-700 ring-1 ring-orange-500'
                            : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                        } disabled:opacity-50`}
                      >
                        <Banknote className="w-4 h-4 text-emerald-600" /> Efectivo
                      </button>
                      <button
                        type="button"
                        disabled={!cajaAbierta}
                        onClick={() => setMetodoPago('Tarjeta')}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-bold transition ${
                          metodoPago === 'Tarjeta'
                            ? 'bg-orange-50 border-orange-500 text-orange-700 ring-1 ring-orange-500'
                            : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                        } disabled:opacity-50`}
                      >
                        <CreditCard className="w-4 h-4 text-blue-600" /> Tarjeta / POS
                      </button>
                    </div>
                  </div>
                </div>

                {cart.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <ShoppingCart className="w-10 h-10 mx-auto stroke-[1.5] mb-2 opacity-40" />
                    <p className="text-xs font-medium">Factura vacía</p>
                    <p className="text-[11px] mt-1 text-slate-400">Agregue materiales desde el catálogo</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-56 overflow-y-auto pr-1 divide-y divide-slate-100">
                    {cart.map(item => (
                      <div key={item.codigo} className="pt-2 flex items-center justify-between text-xs">
                        <div className="flex-1 pr-2">
                          <p className="font-bold text-slate-800 leading-tight">{item.nombre}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">RD$ {item.precio} c/u</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center border border-slate-200 rounded-lg">
                            <button 
                              onClick={(e) => { e.stopPropagation(); cambiarCantidadCart(item.codigo, -1); }}
                              className="px-2 py-0.5 text-slate-500 hover:text-orange-600 font-bold"
                            >
                              -
                            </button>
                            <span className="px-1 text-xs font-black">{item.cantidad}</span>
                            <button 
                              onClick={(e) => { e.stopPropagation(); cambiarCantidadCart(item.codigo, 1); }}
                              className="px-2 py-0.5 text-slate-500 hover:text-orange-600 font-bold"
                            >
                              +
                            </button>
                          </div>
                          <span className="font-bold text-slate-800 w-16 text-right">
                            RD$ {(item.precio * item.cantidad).toLocaleString()}
                          </span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); eliminarDelCarrito(item.codigo); }}
                            className="text-slate-400 hover:text-rose-600 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {cart.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-200 space-y-2">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-slate-800">RD$ {subtotalCart.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>ITBIS (18%):</span>
                    <span className="font-semibold text-slate-800">RD$ {itbis.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-slate-900 border-t border-slate-100 pt-2">
                    <span>Total a Pagar:</span>
                    <span className="text-orange-600">RD$ {totalCart.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                  </div>

                  <button 
                    disabled={!cajaAbierta}
                    onClick={procesarVenta}
                    className="w-full mt-4 bg-orange-600 hover:bg-orange-700 text-white font-extrabold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-600/30 transition disabled:bg-slate-400"
                  >
                    <Printer className="w-4 h-4" /> Cobrar y Generar Factura PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'caja' && (
          <div className="p-8 space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-orange-600" /> Control y Liquidación de Caja
                </h3>
              </div>
              <div>
                <span className={`text-xs font-black px-3 py-1.5 rounded-lg border ${
                  cajaAbierta 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                    : 'bg-rose-50 text-rose-700 border-rose-300'
                }`}>
                  Estado: {cajaAbierta ? 'TURNO ACTIVO' : 'TURNO CERRADO'}
                </span>
              </div>
            </div>

            {!cajaAbierta ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-xl">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-orange-600" /> Apertura de Turno Operativo
                </h4>
                <form onSubmit={abrirCaja} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                      Fondo Inicial de Caja (RD$)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">RD$</span>
                      <input 
                        type="number"
                        min="0"
                        step="any"
                        value={fondoInicialInput}
                        onChange={(e) => setFondoInicialInput(e.target.value)}
                        required
                        className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                      Fecha y Hora de Apertura
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text"
                        disabled
                        value={new Date().toLocaleString('es-DO', { dateStyle: 'medium', timeStyle: 'short' })}
                        className="w-full pl-10 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                      Cajero Responsable
                    </label>
                    <input 
                      type="text"
                      disabled
                      value="Admin Ramos (Ferretería Ramos)"
                      className="w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-600"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Abrir Turno y Habilitar Facturación
                  </button>
                </form>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fondo Inicial</p>
                    <h4 className="text-xl font-black text-slate-900 mt-1">
                      RD$ {fondoCajaActual.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </h4>
                    <span className="text-[10px] text-slate-400 block mt-1">Apertura: {fechaApertura}</span>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ventas en Efectivo</p>
                    <h4 className="text-xl font-black text-emerald-600 mt-1">
                      RD$ {ventasEfectivo.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </h4>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ventas con Tarjeta</p>
                    <h4 className="text-xl font-black text-blue-600 mt-1">
                      RD$ {ventasTarjeta.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </h4>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Facturado</p>
                    <h4 className="text-xl font-black text-slate-900 mt-1">
                      RD$ {ventasDiaTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </h4>
                    <span className="text-[10px] text-slate-500 block mt-1">{facturasHoy} comprobantes emitidos</span>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                    Liquidación del Turno en Curso
                  </h4>
                  <div className="max-w-md space-y-2.5 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-600">Monto Inicial de Apertura:</span>
                      <span className="font-bold text-slate-900">RD$ {fondoCajaActual.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-600">(+) Efectivo Recaudado:</span>
                      <span className="font-bold text-emerald-600">RD$ {ventasEfectivo.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-600">(+) Tarjetas / Vouchers:</span>
                      <span className="font-bold text-blue-600">RD$ {ventasTarjeta.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between py-2 border-t-2 border-slate-900 text-sm font-black">
                      <span className="text-slate-900">Efectivo Físico a Entregar (Fondo + Efectivo):</span>
                      <span className="text-orange-600">RD$ {(fondoCajaActual + ventasEfectivo).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center gap-3">
                    <button 
                      onClick={ejecutarCierreCaja}
                      className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs px-5 py-3 rounded-xl transition flex items-center gap-2 shadow-lg shadow-orange-600/30"
                    >
                      <Printer className="w-4 h-4" /> Cerrar Caja y Generar Comprobante PDF
                    </button>
                    <button 
                      onClick={() => setActiveTab('pos')}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-3 rounded-xl transition"
                    >
                      Continuar Facturando
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-8">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Histórico de Turnos y Liquidaciones
                </h4>
                <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                  {historialCierres.length} Cierres Registrados
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">No. Cierre</th>
                      <th className="py-3.5 px-4">Fecha & Hora Cierre</th>
                      <th className="py-3.5 px-4 text-right">Fondo Inicial</th>
                      <th className="py-3.5 px-4 text-right">Efectivo</th>
                      <th className="py-3.5 px-4 text-right">Tarjeta</th>
                      <th className="py-3.5 px-4 text-right">Total Facturado</th>
                      <th className="py-3.5 px-4 text-center">Facturas</th>
                      <th className="py-3.5 px-4 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {historialCierres.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-8 text-slate-400">
                          No hay cierres anteriores registrados.
                        </td>
                      </tr>
                    ) : (
                      historialCierres.map((cierre) => (
                        <tr key={cierre.id} className="hover:bg-slate-50 transition">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{cierre.id}</td>
                          <td className="py-3.5 px-4 text-slate-600">{cierre.fechaCierre}</td>
                          <td className="py-3.5 px-4 text-right font-medium">RD$ {cierre.fondoInicial.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                          <td className="py-3.5 px-4 text-right font-bold text-emerald-600">RD$ {cierre.ventasEfectivo.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                          <td className="py-3.5 px-4 text-right font-bold text-blue-600">RD$ {cierre.ventasTarjeta.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                          <td className="py-3.5 px-4 text-right font-black text-slate-900">RD$ {cierre.totalVentas.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                          <td className="py-3.5 px-4 text-center font-bold">{cierre.facturasTotal}</td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => imprimirCierrePDF(cierre)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-2.5 py-1 rounded-lg transition"
                            >
                              <Printer className="w-3 h-3" /> Descargar PDF
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'movimientos' && (
          <div className="p-8 space-y-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <ArrowLeftRight className="w-5 h-5 text-orange-600" /> Registro de Entradas y Salidas (Kárdex)
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg">
                  Total Registros: {movimientos.length}
                </span>
                <button 
                  onClick={() => setActiveTab('inicio')}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700 border border-orange-200 bg-orange-50 px-3 py-1.5 rounded-lg transition"
                >
                  Ir al Inventario
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Fecha & Hora</th>
                      <th className="py-3.5 px-4">Tipo</th>
                      <th className="py-3.5 px-4">Cód.</th>
                      <th className="py-3.5 px-4">Material / Producto</th>
                      <th className="py-3.5 px-4">Motivo / Operación</th>
                      <th className="py-3.5 px-4 text-center">Cantidad</th>
                      <th className="py-3.5 px-4">Responsable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {movimientos.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-8 text-slate-400">
                          No hay movimientos registrados.
                        </td>
                      </tr>
                    ) : (
                      movimientos.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50 transition">
                          <td className="py-3.5 px-4 font-medium text-slate-500 text-[11px] whitespace-nowrap">
                            {m.fecha}
                          </td>
                          <td className="py-3.5 px-4">
                            {m.tipo === 'Entrada' ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                <ArrowUpRight className="w-3 h-3" /> Entrada
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                <ArrowDownRight className="w-3 h-3" /> Salida
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-600">{m.codigo}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">{m.producto}</td>
                          <td className="py-3.5 px-4 text-slate-600 font-medium">{m.motivo}</td>
                          <td className="py-3.5 px-4 text-center font-black text-xs">
                            <span className={m.tipo === 'Entrada' ? 'text-emerald-600' : 'text-orange-600'}>
                              {m.tipo === 'Entrada' ? `+${m.cantidad}` : `-${m.cantidad}`}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-500">
                            {m.usuario}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
