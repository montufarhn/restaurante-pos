; Script para Inno Setup - Restaurante POS
; REQUISITO: Debes tener 'RestaurantePOS.exe' y 'node.exe' en la carpeta antes de compilar.

[Setup]
AppName=Xatruch POS
AppVersion=1.0
DefaultDirName={autopf}\XatruchPOS
DefaultGroupName=Xatruch POS
OutputDir=Output
OutputBaseFilename=XatruchPOS_Installer
SetupIconFile=public\favicon.ico
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Dirs]
; IMPORTANTE: Dar permisos de escritura para que Node.js pueda crear las DB y subir archivos
Name: "{app}"; Permissions: users-modify

[Files]
; 1. El Launcher (Tu .exe de C#)
Source: "RestaurantePOS.exe"; DestDir: "{app}"; Flags: ignoreversion
; 2. El motor de Node.js (Para que funcione sin instalar nada extra)
Source: "node.exe"; DestDir: "{app}"; Flags: ignoreversion
; 3. Archivos del servidor
Source: "server.js"; DestDir: "{app}"
Source: "package.json"; DestDir: "{app}"
Source: "iniciar_sistema.bat"; DestDir: "{app}"
Source: "crear_usuarios_db.js"; DestDir: "{app}"
Source: "actualizar_db.js"; DestDir: "{app}"
; 4. Configuración (onlyifdoesntexist evita borrar la config del cliente al actualizar)
Source: "config.json"; DestDir: "{app}"; Flags: onlyifdoesntexist skipifsourcedoesntexist
; 5. Carpetas completas (Frontend y Librerías)
Source: "public\*"; DestDir: "{app}\public"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "node_modules\*"; DestDir: "{app}\node_modules"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\XatruchPOS"; Filename: "{app}\RestaurantePOS.exe"; IconFilename: "{app}\public\favicon.ico"; WorkingDir: "{app}"
Name: "{commondesktop}\XatruchPOS"; Filename: "{app}\RestaurantePOS.exe"; IconFilename: "{app}\public\favicon.ico"; Tasks: desktopicon; WorkingDir: "{app}"

[Run]
; Agregar regla de Firewall para permitir que Node.js reciba conexiones (evita bloqueo de Windows)
Filename: "netsh"; Parameters: "advfirewall firewall add rule name=""XatruchPOS Server"" dir=in action=allow program=""{app}\node.exe"" enable=yes"; Flags: runhidden; StatusMsg: "Configurando permisos de red..."
Filename: "{app}\RestaurantePOS.exe"; Description: "{cm:LaunchProgram,XatruchPOS}"; Flags: nowait postinstall skipifsilent runasoriginaluser

[UninstallRun]
; Limpiar la regla del firewall al desinstalar
Filename: "netsh"; Parameters: "advfirewall firewall delete rule name=""XatruchPOS Server"""; Flags: runhidden; RunOnceId: "DelFirewallRule"