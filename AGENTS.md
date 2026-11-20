# Repository Guidelines

## Alcance y documentación

NEXO es una aplicación de finanzas personales para iOS con React Native, Expo y TypeScript. Antes de implementar, inspecciona el código, los manifiestos, el lockfile y los scripts disponibles. Para cambios relevantes de API, configuración, almacenamiento o publicación, consulta la documentación oficial correspondiente a la versión instalada. Registra la referencia utilizada e indica cualquier limitación de compatibilidad que quede por verificar.

## Arquitectura por funcionalidades

Agrupa el código por funcionalidad, por ejemplo, movimientos o presupuestos. Aplica SOLID, especialmente SRP: separa responsabilidades que cambian por motivos distintos.

- La UI presenta datos y recoge acciones. Mantén cálculos de saldos, redondeos y reglas de presupuesto en funciones de dominio comprobables.
- Los servicios coordinan casos de uso. Encapsula red y persistencia detrás de contratos tipados para que el dominio sea independiente de Expo y del almacenamiento.
- Mantén TypeScript en modo estricto, valida datos externos y reutiliza componentes con propósito y propiedades bien definidos. Extrae código compartido cuando exista un uso común concreto.

Solicita aprobación explícita antes de reorganizar módulos, cambiar contratos entre funcionalidades o sustituir la estrategia de persistencia o navegación. Expón el motivo, las alternativas, el impacto y cómo validarías el cambio.

## Diseño iOS y Skills

Respeta las Apple Human Interface Guidelines. Comprueba Dynamic Type, etiquetas de VoiceOver y legibilidad de importes. Distingue ingresos y gastos también mediante texto o signos.

Lee el `SKILL.md` pertinente. Para Expo empieza por `expo-overview`. Usa `expo-native-ui` para pantallas y SF Symbols, `expo-design-system` para componentes compartidos, `app-icon` para el icono de la app y `eas-app-stores` para TestFlight y App Store. Si están disponibles en el entorno, usa `modular-architecture-guardian` para arquitectura y `ultimate-ui-ux-design-expert` para revisiones de UX.

## Privacidad financiera

Minimiza la recopilación y conservación de datos. Protege credenciales con el llavero de iOS y cifra los datos financieros persistidos. Excluye importes, movimientos, identificadores de cuenta y tokens de logs y analítica. Usa datos ficticios en pruebas y capturas.

## Validación y contribuciones

Después de cada implementación, ejecuta las comprobaciones configuradas y pertinentes de tipado, lint, pruebas y compilación. Para cálculos monetarios, cubre precisión, redondeos y devoluciones. Informa resultados y comprobaciones pendientes.

En `.agents/skills/`, conserva nombres en minúsculas con guiones, `SKILL.md` y su cabecera YAML. Verifica enlaces y helpers modificados. Al actualizar una Skill, revisa su revisión de origen en `skills-lock.json`, conserva la sangría de dos espacios y valida el JSON con `python3 -m json.tool skills-lock.json > /dev/null`.

Usa commits en imperativo. En la PR, describe el cambio, enlaza la incidencia si existe e indica las validaciones ejecutadas.
