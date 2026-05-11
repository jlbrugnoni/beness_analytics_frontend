import Head from "next/head";
import MainPage from "@/pages/mainPage";
import styles from "@/styles/tablePage.module.css";
import Paper from "@mui/material/Paper";


const Section = ({ title, children }) => (
    <Paper style={{ padding: "20px", display: "grid", gap: "10px" }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <div style={{ lineHeight: 1.6 }}>{children}</div>
    </Paper>
);


export default function Manual() {
    return (
        <MainPage>
            <Head>
                <title>Beness Analytics | Manual</title>
            </Head>
            <div className={styles.container}>
                <div className={styles.titleContainer}>
                    <h1 className={styles.title}>Manual de KPIs y Datos</h1>
                </div>

                <div style={{ width: "90%", maxWidth: "1100px", display: "grid", gap: "16px" }}>
                    <Section title="1. Objetivo del sistema">
                        <p>
                            Beness Analytics convierte reportes exportados desde MindBody en una base de datos propia para
                            analizar asistencia, ingresos, servicios vendidos, clientes, instructores, estudios y, en una
                            fase posterior, ocupacion real de salas.
                        </p>
                        <p>
                            La regla principal es que los KPIs solo deben calcularse sobre datos importados y revisables.
                            Por eso el modulo de carga muestra impacto de importacion, filas repetidas, colisiones de
                            asistencia y filas invalidas antes de construir conclusiones de negocio.
                        </p>
                    </Section>

                    <Section title="2. Fuentes de datos">
                        <p><strong>Attendance with Revenue:</strong> visitas por cliente, fecha, hora, instructor, estudio, servicio usado, metodo de pago, no-show, late cancel e ingreso por visita.</p>
                        <p><strong>Sales:</strong> lineas de venta, producto vendido, cliente, fecha, ubicacion, cantidad, descuento, impuesto, total y forma de pago.</p>
                        <p><strong>SalesByService:</strong> servicios o membresias vendidos, fecha de venta, activacion, expiracion, monto, cantidad y cliente. Es la fuente principal para reactivacion y retencion.</p>
                    </Section>

                    <Section title="3. Reglas de importacion">
                        <p>
                            Todas las filas originales se guardan como datos crudos. Ademas, el sistema crea tablas
                            normalizadas para consultas: asistencias actuales, lineas de venta y compras de servicios.
                        </p>
                        <p>
                            Si se sube nuevamente un reporte con datos ya existentes, el sistema clasifica el impacto como:
                            registros nuevos, registros modificados, registros ya agregados sin cambios y colisiones.
                        </p>
                        <p>
                            En asistencia, una colision normalmente representa un posible error porque un cliente no deberia
                            tener dos visitas identicas en el mismo contexto. En ventas y servicios, filas repetidas pueden
                            ser validas porque un cliente puede comprar varias unidades del mismo producto.
                        </p>
                    </Section>

                    <Section title="4. Normalizacion de nombres">
                        <p>
                            MindBody suele devolver clientes con formato <strong>Apellidos, Nombres</strong>. El sistema
                            guarda el valor original como <strong>mindbody_name</strong>, pero crea campos editables:
                            <strong> first_name</strong>, <strong>last_name</strong> y <strong>name</strong>.
                        </p>
                        <p>
                            Ejemplo: <strong>Perez Garcia, Maria Isabel</strong> se guarda como nombre
                            <strong> Maria Isabel Perez Garcia</strong>, first_name <strong>Maria Isabel</strong> y
                            last_name <strong>Perez Garcia</strong>.
                        </p>
                        <p>
                            Las importaciones futuras no deben sobreescribir correcciones manuales de nombres; el matching
                            principal de clientes se hace con el ID de MindBody.
                        </p>
                    </Section>

                    <Section title="5. KPIs de ingresos">
                        <p><strong>Ingresos por ventas:</strong> suma de Total Pagado con Metodo de Pago en Sales.</p>
                        <p><strong>Ingresos por servicios:</strong> suma de Cantidad total en SalesByService.</p>
                        <p><strong>Ingresos por visita:</strong> suma de Ingresos por visita en Attendance.</p>
                        <p><strong>Ticket promedio:</strong> ingresos por ventas / cantidad de ventas unicas segun numero de venta.</p>
                        <p><strong>Descuentos:</strong> suma del monto de descuento en Sales.</p>
                        <p><strong>Impuestos:</strong> suma del impuesto en Sales.</p>
                        <p><strong>Ingresos por dia de semana:</strong> agrupa las ventas por fecha de venta y suma el total pagado.</p>
                        <p>Estos valores pueden diferir porque cada reporte mide el negocio desde un angulo diferente: venta, servicio adquirido o visita realizada.</p>
                    </Section>

                    <Section title="6. KPIs de asistencia">
                        <p><strong>Visitas totales:</strong> cantidad de registros de asistencia importados.</p>
                        <p><strong>Asistencias reales:</strong> visitas donde no_show es falso y late_cancel es falso.</p>
                        <p><strong>Tasa de no-show:</strong> no-shows / visitas totales.</p>
                        <p><strong>Tasa de late cancel:</strong> late cancels / visitas totales.</p>
                        <p><strong>Visitas sin ingreso:</strong> visitas cuyo ingreso por visita es cero.</p>
                        <p><strong>Ingreso promedio por visita asistida:</strong> ingresos por visita / asistencias reales.</p>
                        <p>
                            El ranking de instructores muestra visitas totales, asistencias reales, tasa de no-show, tasa de
                            late cancel e ingreso asociado a las visitas del instructor. No representa rentabilidad neta
                            porque todavia no incluye coste de nomina.
                        </p>
                    </Section>

                    <Section title="7. KPIs de ocupacion">
                        <p>
                            La ocupacion real usa datos internos de capacidad. La formula es:
                            <strong> ocupacion = asistencias reales / capacidad programada</strong>.
                        </p>
                        <p>
                            La capacidad programada viene de <strong>Scheduled Classes</strong>. Cada clase tiene fecha,
                            hora, sala, tipo de sesion, capacidad y estado. Si una clase esta cancelada o marcada como
                            unavailable, no suma capacidad disponible.
                        </p>
                        <p>
                            Las salas se crean en <strong>Rooms</strong> con cupos para grupo y privado. Las vacaciones,
                            festivos, cierres parciales o bloqueos de sala se crean en <strong>Closures</strong>. Un cierre
                            activo elimina de la capacidad las clases afectadas por fecha, estudio, sala y horario.
                        </p>
                        <p>
                            Actualmente las asistencias se emparejan con la programacion por site, estudio, fecha y hora.
                            Si dos salas del mismo estudio funcionan exactamente a la misma hora, el porcentaje es mas
                            confiable a nivel estudio/franja horaria que a nivel sala, porque el reporte de asistencia no
                            trae la sala exacta de cada visita.
                        </p>
                    </Section>

                    <Section title="8. KPIs de retencion y reactivacion">
                        <p>
                            La retencion no se calcula sobre todos los productos. Solo se incluyen las opciones de precio
                            marcadas como <strong>Track Retention</strong> en la pantalla de Pricing Options. Normalmente
                            ahi deben marcarse membresias o productos recurrentes; no clases gratis, clases sueltas,
                            paquetes no recurrentes ni privadas si no se quieren medir como renovacion.
                        </p>
                        <p>
                            La retencion se calcula por mes natural usando snapshots mensuales. Un cliente cuenta como
                            miembro de un mes si tuvo al menos <strong>15 dias activos</strong> de una membresia trackeada
                            dentro de ese mes.
                        </p>
                        <p><strong>Miembros anteriores:</strong> clientes que fueron miembros en el mes anterior al periodo seleccionado.</p>
                        <p><strong>Miembros actuales:</strong> clientes que son miembros en el mes seleccionado.</p>
                        <p><strong>Retenidos:</strong> clientes que fueron miembros el mes anterior y tambien son miembros el mes actual.</p>
                        <p><strong>No renovados:</strong> clientes que fueron miembros el mes anterior pero no son miembros el mes actual. Se cuentan en el mes en que faltan, no en el mes en que expiro la membresia anterior.</p>
                        <p><strong>Nuevos:</strong> clientes que son miembros este mes, no fueron miembros el mes anterior y no tienen historial previo de membresia trackeada.</p>
                        <p><strong>Reactivados:</strong> clientes que son miembros este mes, no fueron miembros el mes anterior, pero si tuvieron membresia trackeada en algun momento anterior.</p>
                        <p><strong>Tasa de retencion:</strong> retenidos / miembros anteriores.</p>
                        <p><strong>Tasa de cancelacion:</strong> no renovados / miembros anteriores.</p>
                        <p>
                            El estudio de retencion se infiere por asistencia: primero se usa el estudio donde el cliente
                            asistio mas durante el mes. Si no hay asistencia en ese mes, se usa la asistencia reciente
                            anterior. Si tampoco existe, queda como Unknown.
                        </p>
                    </Section>

                    <Section title="9. Limitaciones actuales">
                        <p>
                            La ocupacion aun no es calculable hasta cargar capacidad y horarios. La rentabilidad por instructor
                            no incluye costos ni nomina. Los reportes de MindBody pueden cambiar estados pasados, por lo que
                            la reimportacion y versionado son parte del control de calidad.
                        </p>
                    </Section>
                </div>
            </div>
        </MainPage>
    );
}
