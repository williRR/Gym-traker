# Gym Tracker

Aplicación React y Vite para registrar rutinas y consultar el historial de entrenamientos en Supabase.

## Desarrollo web

Se requiere Node.js 22 o superior. Instala las dependencias con `npm install`, configura las variables de Supabase a partir de `.env.example` en un archivo `.env` y ejecuta `npm run dev`. Para generar la versión web, ejecuta `npm run build`.

Las variables `VITE_` se incluyen en la aplicación compilada: usa únicamente la clave pública de Supabase, nunca la clave `service_role` ni otros secretos. Protege los datos mediante las políticas apropiadas de Supabase.

La tabla `set_logs` requiere una columna nullable `unidad` de tipo `text`, con valores `lbs` o `discos`. La aplicación guarda la unidad elegida en cada serie, aunque el campo numérico histórico se llame `peso_kg`. Los registros antiguos con unidad `NULL` se muestran como «unidad no confirmada»; no se convierten ni se asume su unidad.

Durante una rutina puedes usar «Ejercicio anterior» para revisar o modificar series ya guardadas. Los datos escritos en otros ejercicios se conservan en el borrador local; los cambios se guardan al avanzar nuevamente. Como el guardado usa varias operaciones de base de datos, si falla puede quedar parcialmente aplicado: revisa las series y reintenta antes de continuar.

## Progreso

Desde el selector de rutinas, «Ver mi progreso» permite consultar los últimos 30 o 90 días, contados desde el momento de abrir la vista o cambiar el período. Para cada ejercicio y unidad se muestra la serie de mayor peso de cada sesión; si hay empate se elige la que tiene más repeticiones. La comparación usa la primera y última sesión del período, y requiere al menos dos sesiones. Los discos y las libras se presentan por separado sin convertirlos; las series de unidad no confirmada se cuentan, pero se excluyen de la gráfica y los cálculos. Las fechas corresponden a la creación de cada sesión y se muestran en la zona horaria del dispositivo.

## Android con Capacitor

El proyecto nativo está en `android/`. Requiere Android Studio 2025.2.1 o superior, JDK 21 y el SDK de Android con la plataforma API 36 y las herramientas de compilación instaladas. Capacitor admite dispositivos con Android 7 (API 24) o superior.

1. Configura `.env` con las variables de Supabase.
2. Ejecuta `npm install`.
3. Ejecuta `npm run android:sync` para compilar la web y sincronizar el proyecto Android. Repite este paso después de cambios en la configuración nativa o de plugins.
4. Ejecuta `npm run android:open` para abrir el proyecto en Android Studio.
5. Espera la sincronización de Gradle y selecciona **Build > Build Bundle(s) / APK(s) > Build APK(s)**. El APK de depuración se genera en `android/app/build/outputs/apk/debug/app-debug.apk`.

En Windows también puedes compilar el APK de depuración desde PowerShell, después de sincronizar:

```powershell
cd android
.\gradlew.bat assembleDebug
```

Gradle necesita JDK 21 seleccionado en Android Studio o en `JAVA_HOME`, y acceso al SDK mediante `ANDROID_HOME` o `android/local.properties`. Si el JDK integrado en Android Studio es de otra versión, selecciona JDK 21 en la configuración de Gradle. El APK de depuración sirve para pruebas y no está firmado para publicación. Para distribuir una versión de producción, configura y conserva de forma segura una clave de firma y genera una versión firmada desde Android Studio.

El identificador Android inicial es `com.gymtracker.app`. Si se planea publicar en Google Play, elige un identificador único bajo un dominio propio antes de publicar: después no se puede cambiar para la misma aplicación publicada.

La aplicación Android y la web almacenan por separado el perfil y los borradores locales. El historial guardado en Supabase se consulta con el mismo usuario y configuración.

### Actualizaciones desde Vercel

La app Android carga `https://gym-traker-plum.vercel.app` directamente. Al abrir o recargar la app con conexión a internet, carga la versión publicada allí; los cambios web no requieren generar otro APK. Los cambios nativos, de plugins o de la configuración de Capacitor sí requieren generar e instalar un APK nuevo. Vercel solo actualizará la página tras un despliegue exitoso; verifica por separado que esté conectado a la rama del repositorio deseada.

Esta configuración necesita conexión y disponibilidad de Vercel: la app no usa automáticamente la copia web incluida como respaldo sin conexión. Capacitor documenta `server.url` como una opción para desarrollo y no la recomienda para producción. La página cargada debe ser de confianza, ya que el código remoto se ejecuta en el WebView de la aplicación.
